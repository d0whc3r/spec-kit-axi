// The note queue: persistence (debounced PUT to the server) and the panel that
// lists staged annotations and comments.

import { queueEdit, queueRemove } from "../core/index.ts";
import { store, shorten } from "./state.ts";
import {
  tpl,
  queueEl,
  qcountEl,
  sendBtn,
  composerInput,
  introEl,
  messagesEl,
  busyHintEl,
  busyHintTextEl,
} from "./dom.ts";

export async function loadQueue(): Promise<void> {
  try {
    const v = await (await fetch("/api/queue")).json();
    store.items = Array.isArray(v) ? v : [];
  } catch {
    store.items = [];
  }
  renderQueue();
}

let saveTimer: ReturnType<typeof setTimeout>;
export function saveQueue(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch("/api/queue", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(store.items),
    }).catch(() => {});
  }, 200);
}

export function updateSendBtn(): void {
  const n = store.items.length;
  const hasInput = composerInput.value.trim().length > 0;
  // Already queued for auto-send, or nothing to send, or the session ended.
  sendBtn.disabled = store.ended || store.pendingSend || (n === 0 && !hasInput);
  if (store.pendingSend) {
    sendBtn.title = "Queued — your notes will be sent when the agent is ready";
  } else if (store.processing) {
    sendBtn.title = "Agent is working. Send queues your notes until it is ready.";
  } else {
    sendBtn.title = n ? `Send ${n} note${n === 1 ? "" : "s"} to the agent` : "Send to the agent";
  }
}

// A clear, non-blocking line above the composer that explains what happens to
// the staged notes while the agent is busy. Shown only when it has something
// to say about the user's own notes (the status pill and typing bubble already
// signal the general "agent is working" state).
export function updateBusyHint(): void {
  const n = store.items.length;
  const show = store.processing && (n > 0 || store.pendingSend);
  busyHintEl.hidden = !show;
  if (!show) return;
  busyHintTextEl.textContent = store.pendingSend
    ? `Agent is busy. Your ${n} note${n === 1 ? "" : "s"} will be sent automatically when it is ready.`
    : "Agent is busy. Keep adding notes — press send to queue them for when it is ready.";
}

// Show the how-to until there is something in the conversation.
export function updateIntro(): void {
  introEl.hidden = store.items.length > 0 || messagesEl.children.length > 0;
}

export function renderQueue(): void {
  if (!store.items.length) store.pendingSend = false; // nothing left to auto-send
  qcountEl.textContent = String(store.items.length);
  updateSendBtn();
  updateBusyHint();
  updateIntro();
  queueEl.innerHTML = "";
  for (const it of store.items) {
    const li = tpl("tpl-note-card");
    const kind = li.querySelector("[data-kind]")!;
    const meta = li.querySelector("[data-meta]")!;
    const quote = li.querySelector("[data-quote]")!;
    const note = li.querySelector("[data-note]") as HTMLTextAreaElement;

    if (it.kind === "anno") {
      kind.textContent = "annotation";
      meta.textContent = `${it.file} › ${it.heading || "—"}`;
      if (it.quote) quote.textContent = shorten(it.quote);
      else quote.remove();
    } else {
      kind.textContent = "comment";
      meta.remove();
      quote.remove();
    }

    note.value = it.note || "";
    note.addEventListener("change", () => {
      store.items = queueEdit(store.items, it.id!, { note: note.value.trim() });
      saveQueue();
    });
    li.querySelector("[data-remove]")!.addEventListener("click", () => {
      store.items = queueRemove(store.items, it.id!);
      saveQueue();
      renderQueue();
    });

    queueEl.appendChild(li);
  }
}
