// The agent loop: flushing the queue to the server, the live status pill, the
// "working" typing bubble, and the Server-Sent Events stream that drives reload,
// status, reply, and ended.

import { store } from "./state.ts";
import { statusEl, statusDotEl, statusTextEl, threadEl, messagesEl, tpl } from "./dom.ts";
import { renderQueue, saveQueue, updateSendBtn, updateIntro } from "./queue.ts";
import { loadDoc } from "./doc.ts";

const STATUS_BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors";
const STATUS = {
  off: { text: "agent not connected", cls: "border-border text-muted-foreground", pulse: false },
  ready: { text: "agent ready", cls: "border-success/40 text-success", pulse: false },
  working: { text: "working…", cls: "border-primary/40 text-primary", pulse: true },
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

export async function send(): Promise<void> {
  if (!store.items.length || store.ended) return;
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
  saveQueue();
  renderQueue();
  setProcessing(true);
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
  });
  es.addEventListener("reload", () => {
    if (store.currentFile) loadDoc(store.currentFile, { preserveScroll: true });
    setProcessing(false);
  });
  es.addEventListener("reply", (e) => {
    addMessage(JSON.parse(e.data).text);
    setProcessing(false);
  });
  es.addEventListener("ended", () => {
    store.ended = true;
    store.processing = false;
    renderStatus();
    updateSendBtn();
    addMessage("The agent ended this review session.", { system: true });
  });
}
