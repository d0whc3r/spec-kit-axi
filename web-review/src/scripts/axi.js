// axi review surface - browser entry.
//
// Every dynamic widget (nav item, note card, agent bubble, annotate popover) is
// stamped from a <template> in index.astro and populated here, so the runtime
// DOM is real shadcn markup, never class strings hand-rolled in JS. Render
// libraries are loaded from a CDN; pure helpers come from axi-core.

import { captureAnnotation, chatItem, queueAdd, queueEdit, queueRemove } from "@axi-core";

const CDN = {
  marked: "https://cdn.jsdelivr.net/npm/marked@18.0.5/lib/marked.esm.js",
  dompurify: "https://cdn.jsdelivr.net/npm/dompurify@3.4.11/dist/purify.es.mjs",
  mermaid: "https://cdn.jsdelivr.net/npm/mermaid@11.16.0/dist/mermaid.esm.min.mjs",
};

// render(md) -> sanitized HTML, or null if the CDN is unreachable (offline).
let render = null;
try {
  const [{ marked }, purify] = await Promise.all([import(CDN.marked), import(CDN.dompurify)]);
  const DOMPurify = purify.default;
  const OPTS = { async: false, gfm: true, breaks: false };
  render = (md) => DOMPurify.sanitize(marked.parse(md ?? "", OPTS));
} catch {
  render = null;
}

// Clone a widget prototype from its <template> (returns its root element).
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);

const navEl = document.getElementById("nav");
const docEl = document.getElementById("doc");
const mainEl = docEl.parentElement; // scroll container on desktop
const featureEl = document.getElementById("feature");
const threadEl = document.getElementById("thread");
const queueEl = document.getElementById("queue");
const qcountEl = document.getElementById("qcount");
const introEl = document.getElementById("intro");
const composerEl = document.getElementById("composer");
const composerInput = document.getElementById("composer-input");
const sendBtn = document.getElementById("send");
const statusEl = document.getElementById("status");
const statusDotEl = statusEl.querySelector("[data-dot]");
const statusTextEl = statusEl.querySelector("[data-text]");
const messagesEl = document.getElementById("messages");

const state = { agentListening: false, ended: false, processing: false };

const TITLES = {
  "spec.md": "Spec",
  "plan.md": "Plan",
  "tasks.md": "Tasks",
  "constitution.md": "Constitution",
  "research.md": "Research",
  "data-model.md": "Data model",
  "quickstart.md": "Quickstart",
};

// Tab label for a (possibly nested, dynamic) artifact path.
function label(relpath) {
  const base = relpath.split("/").pop();
  if (TITLES[base]) return TITLES[base];
  return relpath.replace(/\.md$/i, "");
}

let items = [];
let currentFile = null;
let currentMd = "";

const isDark = () => {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches);
};

// --- queue persistence -----------------------------------------------------

async function loadQueue() {
  try {
    const v = await (await fetch("/api/queue")).json();
    items = Array.isArray(v) ? v : [];
  } catch {
    items = [];
  }
  renderQueue();
}

let saveTimer;
function saveQueue() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch("/api/queue", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(items),
    }).catch(() => {});
  }, 200);
}

// --- queue panel -----------------------------------------------------------

function shorten(s, n = 90) {
  s = s || "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function updateSendBtn() {
  const hasInput = composerInput.value.trim().length > 0;
  sendBtn.disabled = (items.length === 0 && !hasInput) || state.ended;
  sendBtn.title = items.length
    ? `Send ${items.length} note${items.length === 1 ? "" : "s"} to the agent`
    : "Send to the agent";
}

// Show the how-to until there is something in the conversation.
function updateIntro() {
  introEl.hidden = items.length > 0 || messagesEl.children.length > 0;
}

function renderQueue() {
  qcountEl.textContent = String(items.length);
  updateSendBtn();
  updateIntro();
  queueEl.innerHTML = "";
  for (const it of items) {
    const li = tpl("tpl-note-card");
    const kind = li.querySelector("[data-kind]");
    const meta = li.querySelector("[data-meta]");
    const quote = li.querySelector("[data-quote]");
    const note = li.querySelector("[data-note]");

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
      items = queueEdit(items, it.id, { note: note.value.trim() });
      saveQueue();
    });
    li.querySelector("[data-remove]").addEventListener("click", () => {
      items = queueRemove(items, it.id);
      saveQueue();
      renderQueue();
    });

    queueEl.appendChild(li);
  }
}

// --- select to annotate ----------------------------------------------------

let pending = null; // { quote, range }

const annoBtn = tpl("tpl-annotate-btn");
annoBtn.hidden = true;
document.body.appendChild(annoBtn);

function hideAnnoBtn() {
  annoBtn.hidden = true;
  pending = null;
}

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
  if (!e.target.closest("[data-annotate]") && !e.target.closest("[data-popover]")) hideAnnoBtn();
});

annoBtn.addEventListener("click", () => {
  if (pending) openNoteCard(pending);
  annoBtn.hidden = true;
});

function openNoteCard({ quote, range }) {
  const pop = tpl("tpl-note-popover");
  const rect = range.getBoundingClientRect();
  pop.style.top = `${rect.bottom + 6}px`;
  pop.style.left = `${Math.min(rect.left, window.innerWidth - 296)}px`;

  pop.querySelector("[data-quote]").textContent = shorten(quote, 140);
  const ta = pop.querySelector("[data-note]");
  const add = pop.querySelector("[data-add]");
  const cancel = pop.querySelector("[data-cancel]");
  document.body.appendChild(pop);
  ta.focus();

  const close = () => pop.remove();
  cancel.addEventListener("click", close);
  add.addEventListener("click", () => {
    items = queueAdd(
      items,
      captureAnnotation({ md: currentMd, quote, file: currentFile, note: ta.value }),
    );
    saveQueue();
    renderQueue();
    highlight(range);
    close();
  });
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      add.click();
    } else if (e.key === "Escape") {
      close();
    }
  });
}

function highlight(range) {
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

// --- chat composer ---------------------------------------------------------
//
// Enter stacks the typed comment onto the batch (Shift+Enter is a newline); the
// send button dispatches the whole batch. Anything still typed when send is
// pressed is stacked first, so the common "type one note and send" path is a
// single click, like a chatbot.

function autoGrow() {
  composerInput.style.height = "auto";
  composerInput.style.height = `${Math.min(composerInput.scrollHeight, 144)}px`;
}

function stageComment() {
  const v = composerInput.value.trim();
  if (!v) return false;
  items = queueAdd(items, chatItem(v));
  composerInput.value = "";
  autoGrow();
  saveQueue();
  renderQueue();
  return true;
}

composerInput.addEventListener("input", () => {
  autoGrow();
  updateSendBtn();
});

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

// --- mermaid (lazy, CDN) ---------------------------------------------------

async function renderMermaid(root) {
  const blocks = root.querySelectorAll("pre > code.language-mermaid");
  if (!blocks.length) return;
  try {
    const { default: mermaid } = await import(CDN.mermaid);
    mermaid.initialize({ startOnLoad: false, theme: isDark() ? "dark" : "default" });
    const nodes = [];
    blocks.forEach((code) => {
      const div = document.createElement("div");
      div.className = "mermaid";
      div.textContent = code.textContent;
      code.closest("pre").replaceWith(div);
      nodes.push(div);
    });
    await mermaid.run({ nodes });
  } catch {
    /* leave code blocks as plain text */
  }
}

// --- doc loading -----------------------------------------------------------

function docMessage(text) {
  docEl.innerHTML = "";
  const p = document.createElement("p");
  p.className = "text-muted-foreground";
  p.textContent = text;
  docEl.appendChild(p);
}

function showSkeleton() {
  docEl.innerHTML = "";
  docEl.appendChild(tpl("tpl-doc-skeleton"));
}

async function loadDoc(name, { preserveScroll = false } = {}) {
  const scrollTop = mainEl.scrollTop;
  currentFile = name;
  for (const b of navEl.children) {
    b.setAttribute("aria-current", b.dataset.file === name ? "page" : "false");
  }
  if (!preserveScroll) showSkeleton();
  try {
    currentMd = await (await fetch(`/md/${encodeURIComponent(name)}`)).text();
  } catch {
    return docMessage("Could not load this file.");
  }
  if (!render) {
    return docMessage("Renderer offline. Connect to the internet to view documents.");
  }
  docEl.innerHTML = render(currentMd);
  mainEl.scrollTop = preserveScroll ? scrollTop : 0;
  await renderMermaid(docEl);
}

// --- agent loop: send, live updates, status --------------------------------

const STATUS_BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors";
const STATUS = {
  off: { text: "agent not connected", cls: "border-border text-muted-foreground", pulse: false },
  ready: { text: "agent ready", cls: "border-success/40 text-success", pulse: false },
  working: { text: "working…", cls: "border-primary/40 text-primary", pulse: true },
  ended: { text: "session ended", cls: "border-border text-muted-foreground", pulse: false },
};

function renderStatus() {
  let s = STATUS.off;
  if (state.ended) s = STATUS.ended;
  else if (state.processing) s = STATUS.working;
  else if (state.agentListening) s = STATUS.ready;
  statusEl.className = `${STATUS_BASE} ${s.cls}`;
  statusTextEl.textContent = s.text;
  statusDotEl.classList.toggle("animate-pulse", s.pulse);
}

function scrollThread() {
  threadEl.scrollTop = threadEl.scrollHeight;
}

// A chat-style "agent is working" bubble shown while we wait for a reply.
let typingEl = null;
function showTyping() {
  if (typingEl) return;
  typingEl = tpl("tpl-typing");
  messagesEl.appendChild(typingEl);
  scrollThread();
}
function hideTyping() {
  typingEl?.remove();
  typingEl = null;
}

function setProcessing(v) {
  state.processing = v;
  if (v) showTyping();
  else hideTyping();
  updateIntro();
  renderStatus();
}

function addMessage(text, { system = false } = {}) {
  if (!text) return;
  let el;
  if (system) {
    el = document.createElement("div");
    el.className = "self-center py-1 text-center text-xs italic text-muted-foreground";
    el.textContent = text;
  } else {
    el = tpl("tpl-message");
    el.querySelector("[data-text]").textContent = text;
  }
  messagesEl.appendChild(el);
  scrollThread();
  updateIntro();
}

async function send() {
  if (!items.length || state.ended) return;
  try {
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(items),
    });
    if (!res.ok) return;
  } catch {
    return;
  }
  items = []; // handed off to the agent
  saveQueue();
  renderQueue();
  setProcessing(true);
}

function connectEvents() {
  const es = new EventSource("/api/events");
  es.addEventListener("status", (e) => {
    const s = JSON.parse(e.data);
    state.agentListening = s.agentListening;
    state.ended = s.ended;
    if (state.ended) state.processing = false;
    renderStatus();
    updateSendBtn();
  });
  es.addEventListener("reload", () => {
    if (currentFile) loadDoc(currentFile, { preserveScroll: true });
    setProcessing(false);
  });
  es.addEventListener("reply", (e) => {
    addMessage(JSON.parse(e.data).text);
    setProcessing(false);
  });
  es.addEventListener("ended", () => {
    state.ended = true;
    state.processing = false;
    renderStatus();
    updateSendBtn();
    addMessage("The agent ended this review session.", { system: true });
  });
}

// --- theme + init ----------------------------------------------------------

function setupTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem("axi-theme");
  if (saved) root.setAttribute("data-theme", saved);
  document.getElementById("theme")?.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("axi-theme", next);
  });
}

function setupHelp() {
  const dlg = document.getElementById("help");
  if (!dlg) return;
  const open = () => dlg.showModal();
  document.getElementById("help-btn")?.addEventListener("click", open);
  document.getElementById("empty-help")?.addEventListener("click", open);
}

async function init() {
  setupTheme();
  setupHelp();
  renderStatus();
  connectEvents();
  await loadQueue();
  let manifest;
  try {
    manifest = await (await fetch("/api/manifest")).json();
  } catch {
    return docMessage("Could not reach the axi server.");
  }
  if (featureEl) featureEl.textContent = manifest.feature;
  if (!manifest.files.length) {
    return docMessage("No artifacts found in this feature.");
  }
  navEl.innerHTML = "";
  for (const name of manifest.files) {
    const b = tpl("tpl-nav-item");
    b.dataset.file = name;
    b.querySelector("[data-label]").textContent = label(name);
    b.addEventListener("click", () => loadDoc(name));
    navEl.appendChild(b);
  }
  loadDoc(manifest.files[0]);
}

init();
