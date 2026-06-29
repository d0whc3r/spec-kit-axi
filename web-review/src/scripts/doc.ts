// Loading and rendering a markdown artifact into the document column.

import { render, renderMermaid } from "./render.ts";
import { renderDiffHtml } from "./diff.ts";
import { store } from "./state.ts";
import { navEl, docEl, mainEl, tpl, changeBarEl, diffToggleEl } from "./dom.ts";

// Resolve a markdown link's href against the current file to a manifest path,
// or null when it is not an in-feature artifact (external, anchor, unknown).
function resolveLink(href: string): string | null {
  if (!href || href.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) {
    return null;
  }
  let rel = href.split(/[?#]/)[0];
  try {
    rel = decodeURIComponent(rel);
  } catch {
    /* leave as-is if not valid percent-encoding */
  }
  if (!rel) return null;
  const parts = rel.startsWith("/") ? [] : (store.currentFile ?? "").split("/").slice(0, -1);
  for (const seg of rel.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  const candidate = parts.join("/");
  if (store.files.includes(candidate)) return candidate;
  const lower = candidate.toLowerCase();
  return store.files.find((f) => f.toLowerCase() === lower) ?? null;
}

// Tag in-feature links so the click handler navigates in-app; open external
// links in a new tab so they never replace the review surface.
function decorateLinks(): void {
  for (const a of docEl.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const href = a.getAttribute("href")!;
    if (resolveLink(href)) {
      a.dataset.internal = "";
    } else if (/^https?:/i.test(href)) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
  }
}

// Delegated handler: clicking an in-feature link loads that artifact instead
// of doing a full-page navigation. Also wires browser back/forward to the
// per-artifact history entries that loadDoc pushes. Attached once at startup.
export function setupDocLinks(): void {
  docEl.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    const target = resolveLink(a.getAttribute("href") ?? "");
    if (target) {
      e.preventDefault();
      loadDoc(target);
    }
  });
  addEventListener("popstate", (e) => {
    const name =
      (e.state as { file?: string } | null)?.file ??
      new URLSearchParams(location.search).get("file");
    if (name && store.files.includes(name)) loadDoc(name, { history: "skip" });
  });
  diffToggleEl.addEventListener("click", () => {
    store.diffMode = !store.diffMode;
    updateChangeBar();
    renderDoc();
  });
}

// Show the "agent changed this file" bar only when the current artifact differs
// from the baseline, and keep the toggle label in sync with the active view.
function updateChangeBar(): void {
  const changed = !!store.currentFile && store.changed.has(store.currentFile);
  changeBarEl.hidden = !changed;
  if (!changed) store.diffMode = false;
  diffToggleEl.textContent = store.diffMode ? "View document" : "View changes";
}

// Paint the document column: the colored line diff when toggled on (and a
// baseline exists for this file), otherwise the rendered markdown.
async function renderDoc(): Promise<void> {
  const base = store.baseline;
  if (store.diffMode && base && store.currentFile && base[store.currentFile] !== undefined) {
    docEl.innerHTML = renderDiffHtml(base[store.currentFile], store.currentMd);
    return;
  }
  if (!render) return docMessage("Renderer offline. Connect to the internet to view documents.");
  docEl.innerHTML = render(store.currentMd);
  decorateLinks();
  await renderMermaid(docEl);
}

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

export async function loadDoc(
  name: string,
  {
    preserveScroll = false,
    history: hist = "push",
  }: { preserveScroll?: boolean; history?: "push" | "replace" | "skip" } = {},
): Promise<void> {
  const scrollTop = mainEl.scrollTop;
  const prev = store.currentFile;
  store.currentFile = name;
  for (const b of navEl.children) {
    b.setAttribute("aria-current", (b as HTMLElement).dataset.file === name ? "page" : "false");
  }
  const url = `?file=${encodeURIComponent(name)}`;
  if (hist === "replace") history.replaceState({ file: name }, "", url);
  else if (hist === "push" && name !== prev) history.pushState({ file: name }, "", url);
  if (!preserveScroll) showSkeleton();
  try {
    store.currentMd = await (await fetch(`/md/${encodeURIComponent(name)}`)).text();
  } catch {
    changeBarEl.hidden = true;
    return docMessage("Could not load this file.");
  }
  // Navigating to a file starts in the rendered view; a live reload keeps the
  // view the reviewer was in (diff or document).
  if (!preserveScroll) store.diffMode = false;
  updateChangeBar();
  await renderDoc();
  mainEl.scrollTop = preserveScroll ? scrollTop : 0;
}
