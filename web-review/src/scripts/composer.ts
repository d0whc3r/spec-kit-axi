// Chat composer. Enter stacks the typed comment onto the batch (Shift+Enter is
// a newline); the send button dispatches the whole batch. Anything still typed
// when send is pressed is stacked first, so the common "type one note and send"
// path is a single click, like a chatbot.

import { queueAdd, chatItem } from "../core/index.ts";
import { store } from "./state.ts";
import { composerInput, composerEl } from "./dom.ts";
import { renderQueue, saveQueue, updateSendBtn } from "./queue.ts";
import { send } from "./agent.ts";

function stageComment(): boolean {
  const v = composerInput.value.trim();
  if (!v) return false;
  store.items = queueAdd(store.items, chatItem(v));
  composerInput.value = ""; // CSS field-sizing shrinks it back to one row
  saveQueue();
  renderQueue();
  return true;
}

export function setupComposer(): void {
  composerInput.addEventListener("input", updateSendBtn);

  composerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      stageComment();
    }
  });

  composerEl.addEventListener("submit", (e) => {
    e.preventDefault();
    stageComment();
    send();
  });
}
