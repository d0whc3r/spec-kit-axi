// The agent loop: flushing the queue to the server, the live status pill, the
// "working" typing bubble, and the Server-Sent Events stream that drives reload,
// status, reply, and ended.

import { store } from "./state.ts";
import { statusEl, statusDotEl, statusTextEl, threadEl, messagesEl, tpl } from "./dom.ts";
import {
  renderQueue,
  saveQueue,
  updateSendBtn,
  updateAddBtn,
  updateIntro,
  updateBusyHint,
} from "./queue.ts";
import { loadDoc } from "./doc.ts";
import { captureBaseline, refreshChanges } from "./diff.ts";

const STATUS_BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors";
const STATUS = {
  off: { text: "agent not connected", cls: "border-border text-muted-foreground", pulse: false },
  ready: { text: "agent ready", cls: "border-success/40 text-success", pulse: false },
  working: { text: "agent working…", cls: "border-primary/40 text-primary", pulse: true },
  ended: { text: "session ended", cls: "border-border text-muted-foreground", pulse: false },
};

export function renderStatus(): void {
  let s = STATUS.off;
  if (store.ended) s = STATUS.ended;
  else if (store.processing) s = STATUS.working;
  else if (store.agentListening) s = STATUS.ready;
  statusEl.className = `${STATUS_BASE} ${s.cls}`;
  statusTextEl.textContent = s.text;
  statusDotEl.classList.toggle("animate-pulse", s.pulse);
}

function scrollThread(): void {
  threadEl.scrollTop = threadEl.scrollHeight;
}

// A chat-style "agent is working" bubble shown while we wait for a reply.
let typingEl: HTMLElement | null = null;
function showTyping(): void {
  if (typingEl) return;
  typingEl = tpl("tpl-typing");
  messagesEl.appendChild(typingEl);
  scrollThread();
}
function hideTyping(): void {
  typingEl?.remove();
  typingEl = null;
}

export function setProcessing(v: boolean): void {
  store.processing = v;
  if (v) showTyping();
  else hideTyping();
  updateIntro();
  renderStatus();
  updateSendBtn();
  updateBusyHint();
  // The agent just freed up: flush any batch the user queued while it was busy.
  if (!v && store.pendingSend && store.items.length && !store.ended) flush();
}

export function addMessage(text: string, { system = false } = {}): void {
  if (!text) return;
  let el: HTMLElement;
  if (system) {
    el = document.createElement("div");
    el.className = "self-center py-1 text-center text-xs italic text-muted-foreground";
    el.textContent = text;
  } else {
    el = tpl("tpl-message");
    el.querySelector("[data-text]")!.textContent = text;
  }
  messagesEl.appendChild(el);
  scrollThread();
  updateIntro();
}

// Hand the staged batch to the agent. Internal: the busy/ended gating lives in
// send().
async function flush(): Promise<void> {
  if (!store.items.length || store.ended) {
    store.pendingSend = false;
    return;
  }
  // Snapshot every artifact now so we can show, on reload, what the agent
  // changed in response to this batch.
  await captureBaseline();
  try {
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(store.items),
    });
    if (!res.ok) return;
  } catch {
    return;
  }
  store.items = []; // handed off to the agent
  store.pendingSend = false;
  saveQueue();
  renderQueue();
  setProcessing(true);
}

// User pressed send. If the agent is busy, queue the batch and surface that it
// will go out automatically once the agent frees, rather than blocking or
// firing a second request at a working agent.
export function send(): void {
  if (store.ended || !store.items.length) return;
  if (store.processing) {
    store.pendingSend = true;
    updateSendBtn();
    updateBusyHint();
    return;
  }
  flush();
}

export function connectEvents(): void {
  const es = new EventSource("/api/events");
  es.addEventListener("status", (e) => {
    const s = JSON.parse(e.data);
    store.agentListening = s.agentListening;
    store.ended = s.ended;
    if (store.ended) store.processing = false;
    renderStatus();
    updateSendBtn();
    updateAddBtn();
    updateBusyHint();
  });
  es.addEventListener("reload", async () => {
    await refreshChanges();
    if (store.currentFile) await loadDoc(store.currentFile, { preserveScroll: true });
    setProcessing(false);
  });
  es.addEventListener("reply", (e) => {
    addMessage(JSON.parse(e.data).text);
    setProcessing(false);
  });
  es.addEventListener("ended", () => {
    store.ended = true;
    store.processing = false;
    store.pendingSend = false;
    renderStatus();
    updateSendBtn();
    updateAddBtn();
    updateBusyHint();
    addMessage("The agent ended this review session.", { system: true });
  });
}
