// Change tracking for an agent run: snapshot every artifact when the queue is
// sent (the "before"), then after the agent edits the files, flag which ones
// changed and render a colored line diff of the current artifact.

import { lineDiff } from "../core/index.ts";
import { store } from "./state.ts";
import { navEl } from "./dom.ts";

async function fetchMd(file: string): Promise<string> {
  try {
    return await (await fetch(`/md/${encodeURIComponent(file)}`)).text();
  } catch {
    return "";
  }
}

// Snapshot the current content of every artifact as the "before" for the next
// agent run, and clear any change flags from the previous one.
export async function captureBaseline(): Promise<void> {
  const entries = await Promise.all(store.files.map(async (f) => [f, await fetchMd(f)] as const));
  store.baseline = Object.fromEntries(entries);
  store.changed = new Set();
  markChangedTabs();
}

// Recompute which artifacts differ from the baseline (called when the agent's
// edits trigger a reload) and update the tab indicators.
export async function refreshChanges(): Promise<void> {
  const base = store.baseline;
  if (!base) return;
  const changed = new Set<string>();
  await Promise.all(
    store.files.map(async (f) => {
      if (base[f] === undefined) return;
      if ((await fetchMd(f)) !== base[f]) changed.add(f);
    }),
  );
  store.changed = changed;
  markChangedTabs();
}

// Toggle the per-tab "changed" dot from store.changed.
export function markChangedTabs(): void {
  for (const b of navEl.children) {
    const file = (b as HTMLElement).dataset.file;
    const dot = b.querySelector<HTMLElement>("[data-changed-dot]");
    if (file && dot) dot.hidden = !store.changed.has(file);
  }
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A unified, colored line diff: green for what the file says now, red for what
// it said before. Returned as HTML injected into the document column.
export function renderDiffHtml(before: string, after: string): string {
  const ops = lineDiff(before, after);
  if (ops.every((o) => o.type === "same")) {
    return `<p class="text-muted-foreground">No textual changes in this file.</p>`;
  }
  const rows = ops
    .map((o) => {
      const cls = o.type === "add" ? "diff-add" : o.type === "del" ? "diff-del" : "diff-same";
      const sign = o.type === "add" ? "+" : o.type === "del" ? "-" : " ";
      return `<div class="diff-line ${cls}"><span class="diff-sign">${sign}</span><span class="diff-text">${esc(o.text) || "&nbsp;"}</span></div>`;
    })
    .join("");
  return `<div class="diff-view">${rows}</div>`;
}
