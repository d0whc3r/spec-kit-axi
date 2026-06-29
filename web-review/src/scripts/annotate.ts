// Select-to-annotate: a floating button on text selection, a popover to attach
// a note, and a source-anchored capture (verbatim quote + nearest heading).

import { captureAnnotation, queueAdd } from "../core/index.ts";
import { store, shorten } from "./state.ts";
import { tpl, docEl } from "./dom.ts";
import { renderQueue, saveQueue } from "./queue.ts";

let pending: { quote: string; range: Range } | null = null;
let annoBtn: HTMLElement;

function hideAnnoBtn(): void {
  annoBtn.hidden = true;
  pending = null;
}

export function setupAnnotate(): void {
  annoBtn = tpl("tpl-annotate-btn");
  annoBtn.hidden = true;
  document.body.appendChild(annoBtn);

  // Floating widgets use fixed positioning (the document scrolls inside its own
  // column, not the window), so selection rects map straight to viewport coords.
  docEl.addEventListener("mouseup", () => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (!text || !docEl.contains(sel.anchorNode)) return;
      const range = sel.getRangeAt(0).cloneRange();
      pending = { quote: text, range };
      const rect = range.getBoundingClientRect();
      annoBtn.style.top = `${rect.bottom + 6}px`;
      annoBtn.style.left = `${rect.left}px`;
      annoBtn.hidden = false;
    }, 0);
  });

  document.addEventListener("mousedown", (e) => {
    const t = e.target as HTMLElement;
    if (!t.closest("[data-annotate]") && !t.closest("[data-popover]")) hideAnnoBtn();
  });

  annoBtn.addEventListener("click", () => {
    if (pending) openNoteCard(pending);
    annoBtn.hidden = true;
  });
}

function openNoteCard({ quote, range }: { quote: string; range: Range }): void {
  const pop = tpl("tpl-note-popover");
  const rect = range.getBoundingClientRect();
  pop.style.top = `${rect.bottom + 6}px`;
  pop.style.left = `${Math.min(rect.left, window.innerWidth - 296)}px`;

  pop.querySelector("[data-quote]")!.textContent = shorten(quote, 140);
  const ta = pop.querySelector("[data-note]") as HTMLTextAreaElement;
  const add = pop.querySelector("[data-add]")!;
  const cancel = pop.querySelector("[data-cancel]")!;
  document.body.appendChild(pop);
  ta.focus();

  const close = () => pop.remove();
  cancel.addEventListener("click", close);
  add.addEventListener("click", () => {
    store.items = queueAdd(
      store.items,
      captureAnnotation({ md: store.currentMd, quote, file: store.currentFile, note: ta.value }),
    );
    saveQueue();
    renderQueue();
    highlight(range);
    close();
  });
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      (add as HTMLElement).click();
    } else if (e.key === "Escape") {
      close();
    }
  });
}

function highlight(range: Range): void {
  try {
    const mark = document.createElement("mark");
    mark.style.backgroundColor = "var(--sel)";
    mark.style.borderRadius = "2px";
    mark.style.color = "inherit";
    range.surroundContents(mark);
  } catch {
    /* selection spans element boundaries: skip the visual highlight */
  }
  window.getSelection()?.removeAllRanges();
}
