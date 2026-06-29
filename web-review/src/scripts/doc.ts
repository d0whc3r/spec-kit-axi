// Loading and rendering a markdown artifact into the document column.

import { render, renderMermaid } from "./render.ts";
import { store } from "./state.ts";
import { navEl, docEl, mainEl, tpl } from "./dom.ts";

export function docMessage(text: string): void {
  docEl.innerHTML = "";
  const p = document.createElement("p");
  p.className = "text-muted-foreground";
  p.textContent = text;
  docEl.appendChild(p);
}

function showSkeleton(): void {
  docEl.innerHTML = "";
  docEl.appendChild(tpl("tpl-doc-skeleton"));
}

export async function loadDoc(name: string, { preserveScroll = false } = {}): Promise<void> {
  const scrollTop = mainEl.scrollTop;
  store.currentFile = name;
  for (const b of navEl.children) {
    b.setAttribute("aria-current", (b as HTMLElement).dataset.file === name ? "page" : "false");
  }
  if (!preserveScroll) showSkeleton();
  try {
    store.currentMd = await (await fetch(`/md/${encodeURIComponent(name)}`)).text();
  } catch {
    return docMessage("Could not load this file.");
  }
  if (!render) {
    return docMessage("Renderer offline. Connect to the internet to view documents.");
  }
  docEl.innerHTML = render(store.currentMd);
  mainEl.scrollTop = preserveScroll ? scrollTop : 0;
  await renderMermaid(docEl);
}
