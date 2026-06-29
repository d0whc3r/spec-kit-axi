// The note queue: persistence (debounced PUT to the server) and the panel that
// lists staged annotations and comments.

import { queueEdit, queueRemove } from "../core/index.ts";
import { store, shorten } from "./state.ts";
import { tpl, queueEl, qcountEl, sendBtn, composerInput, introEl, messagesEl } from "./dom.ts";

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
  const hasInput = composerInput.value.trim().length > 0;
  sendBtn.disabled = (store.items.length === 0 && !hasInput) || store.ended;
  sendBtn.title = store.items.length
    ? `Send ${store.items.length} note${store.items.length === 1 ? "" : "s"} to the agent`
    : "Send to the agent";
}

// Show the how-to until there is something in the conversation.
export function updateIntro(): void {
  introEl.hidden = store.items.length > 0 || messagesEl.children.length > 0;
}

export function renderQueue(): void {
  qcountEl.textContent = String(store.items.length);
  updateSendBtn();
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
