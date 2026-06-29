// Markdown rendering, loaded from a CDN (kept out of the bundle so the shipped
// surface stays tiny). Dynamic imports use a variable specifier on purpose, so
// the bundler leaves them as runtime fetches rather than inlining the libs.

import { isDark } from "./state.ts";

const CDN = {
  marked: "https://cdn.jsdelivr.net/npm/marked@18.0.5/lib/marked.esm.js",
  dompurify: "https://cdn.jsdelivr.net/npm/dompurify@3.4.11/dist/purify.es.mjs",
  mermaid: "https://cdn.jsdelivr.net/npm/mermaid@11.16.0/dist/mermaid.esm.min.mjs",
};

// render(md) -> sanitized HTML, or null if the CDN is unreachable (offline).
let renderImpl: ((md: string) => string) | null = null;
try {
  const [{ marked }, purify] = await Promise.all([import(CDN.marked), import(CDN.dompurify)]);
  const DOMPurify = purify.default;
  const OPTS = { async: false, gfm: true, breaks: false };
  renderImpl = (md: string) => DOMPurify.sanitize(marked.parse(md ?? "", OPTS));
} catch {
  renderImpl = null;
}
export const render = renderImpl;

export async function renderMermaid(root: HTMLElement): Promise<void> {
  const blocks = root.querySelectorAll("pre > code.language-mermaid");
  if (!blocks.length) return;
  try {
    const { default: mermaid } = await import(CDN.mermaid);
    mermaid.initialize({ startOnLoad: false, theme: isDark() ? "dark" : "default" });
    const nodes: HTMLElement[] = [];
    blocks.forEach((code) => {
      const div = document.createElement("div");
      div.className = "mermaid";
      div.textContent = code.textContent;
      code.closest("pre")!.replaceWith(div);
      nodes.push(div);
    });
    await mermaid.run({ nodes });
  } catch {
    /* leave code blocks as plain text */
  }
}
