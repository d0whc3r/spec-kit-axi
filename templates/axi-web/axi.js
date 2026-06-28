// axi review surface - browser entry.
//
// Render libraries are loaded from a CDN (same pattern as mermaid), so the
// shipped template carries no vendored code. Pure helpers come from axi-core.

import {
  captureAnnotation,
  chatItem,
  queueAdd,
  queueEdit,
  queueRemove,
} from "/assets/axi-core.mjs";

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

const tabsEl = document.getElementById("tabs");
const docEl = document.getElementById("doc");
const featureEl = document.getElementById("feature");
const queueEl = document.getElementById("queue");
const qcountEl = document.getElementById("qcount");
const emptyEl = document.getElementById("empty");
const composerEl = document.getElementById("composer");
const composerInput = document.getElementById("composer-input");
const sendBtn = document.getElementById("send");
const statusEl = document.getElementById("status");
const statusTextEl = statusEl.querySelector(".axi-status-text");
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
function updateEmpty() {
  if (emptyEl) emptyEl.hidden = items.length > 0 || messagesEl.children.length > 0;
}

function renderQueue() {
  qcountEl.textContent = String(items.length);
  updateSendBtn();
  updateEmpty();
  queueEl.innerHTML = "";
  for (const it of items) {
    const li = document.createElement("li");
    li.className = `axi-qitem axi-qitem--${it.kind}`;

    const meta = document.createElement("div");
    meta.className = "axi-qmeta";
    meta.textContent = it.kind === "anno" ? `${it.file} › ${it.heading || "—"}` : "comment";
    li.appendChild(meta);

    if (it.kind === "anno" && it.quote) {
      const q = document.createElement("blockquote");
      q.className = "axi-qquote";
      q.textContent = shorten(it.quote);
      li.appendChild(q);
    }

    const note = document.createElement("textarea");
    note.className = "axi-qnote";
    note.rows = 2;
    note.value = it.note || "";
    note.placeholder = "note…";
    note.addEventListener("change", () => {
      items = queueEdit(items, it.id, { note: note.value.trim() });
      saveQueue();
    });
    li.appendChild(note);

    const rm = document.createElement("button");
    rm.className = "axi-qremove";
    rm.type = "button";
    rm.textContent = "✕";
    rm.title = "Remove";
    rm.addEventListener("click", () => {
      items = queueRemove(items, it.id);
      saveQueue();
      renderQueue();
    });
    li.appendChild(rm);

    queueEl.appendChild(li);
  }
}

// --- select to annotate ----------------------------------------------------

let pending = null; // { quote, range }

const annoBtn = document.createElement("button");
annoBtn.className = "axi-annotate-btn";
annoBtn.type = "button";
annoBtn.textContent = "+ Note";
annoBtn.hidden = true;
document.body.appendChild(annoBtn);

function hideAnnoBtn() {
  annoBtn.hidden = true;
  pending = null;
}

docEl.addEventListener("mouseup", () => {
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text || !docEl.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0).cloneRange();
    pending = { quote: text, range };
    const rect = range.getBoundingClientRect();
    annoBtn.style.top = `${window.scrollY + rect.bottom + 6}px`;
    annoBtn.style.left = `${window.scrollX + rect.left}px`;
    annoBtn.hidden = false;
  }, 0);
});

document.addEventListener("mousedown", (e) => {
  if (e.target !== annoBtn && !e.target.closest(".axi-note-card")) hideAnnoBtn();
});

annoBtn.addEventListener("click", () => {
  if (pending) openNoteCard(pending);
  annoBtn.hidden = true;
});

function openNoteCard({ quote, range }) {
  const card = document.createElement("div");
  card.className = "axi-note-card";
  const rect = range.getBoundingClientRect();
  card.style.top = `${window.scrollY + rect.bottom + 6}px`;
  card.style.left = `${window.scrollX + rect.left}px`;

  const bq = document.createElement("blockquote");
  bq.textContent = shorten(quote, 140);
  const ta = document.createElement("textarea");
  ta.rows = 3;
  ta.placeholder = "Your note…";
  const actions = document.createElement("div");
  actions.className = "axi-note-actions";
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = "Add";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  actions.append(add, cancel);
  card.append(bq, ta, actions);
  document.body.appendChild(card);
  ta.focus();

  const close = () => card.remove();
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
    mark.className = "axi-pending";
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
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "default" });
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

async function loadDoc(name, { preserveScroll = false } = {}) {
  const scrollY = window.scrollY;
  currentFile = name;
  for (const b of tabsEl.children) b.setAttribute("aria-selected", String(b.dataset.file === name));
  if (!preserveScroll) docEl.innerHTML = '<p class="axi-loading">Loading…</p>';
  try {
    currentMd = await (await fetch(`/md/${encodeURIComponent(name)}`)).text();
  } catch {
    docEl.innerHTML = '<p class="axi-loading">Could not load this file.</p>';
    return;
  }
  if (!render) {
    docEl.innerHTML =
      '<p class="axi-loading">Renderer offline. Connect to the internet to view documents.</p>';
    return;
  }
  docEl.innerHTML = render(currentMd);
  if (preserveScroll) window.scrollTo(0, scrollY);
  else window.scrollTo(0, 0);
  await renderMermaid(docEl);
}

// --- agent loop: send, live updates, status --------------------------------

function renderStatus() {
  let cls = "axi-status";
  let text = "agent not connected";
  if (state.ended) {
    cls = "axi-status is-ended";
    text = "session ended";
  } else if (state.processing) {
    cls = "axi-status is-processing";
    text = "working…";
  } else if (state.agentListening) {
    cls = "axi-status is-ready";
    text = "agent ready";
  }
  statusEl.className = cls;
  statusTextEl.textContent = text;
}

// A chat-style "agent is working" bubble shown while we wait for a reply.
let typingEl = null;
function showTyping() {
  if (typingEl) return;
  typingEl = document.createElement("div");
  typingEl.className = "axi-typing";
  typingEl.setAttribute("aria-label", "Agent is working");
  for (let i = 0; i < 3; i++) typingEl.appendChild(document.createElement("span"));
  messagesEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function hideTyping() {
  typingEl?.remove();
  typingEl = null;
}

function setProcessing(v) {
  state.processing = v;
  if (v) showTyping();
  else hideTyping();
  updateEmpty();
  renderStatus();
}

function addMessage(text, { system = false } = {}) {
  if (!text) return;
  const el = document.createElement("div");
  el.className = system ? "axi-message axi-message--system" : "axi-message";
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  updateEmpty();
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
  document.getElementById("theme")?.addEventListener("click", () => {
    const root = document.documentElement;
    const dark =
      root.getAttribute("data-theme") === "dark" ||
      (!root.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "light" : "dark");
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
    docEl.innerHTML = '<p class="axi-loading">Could not reach the axi server.</p>';
    return;
  }
  if (featureEl) featureEl.textContent = manifest.feature;
  if (!manifest.files.length) {
    docEl.innerHTML = '<p class="axi-loading">No artifacts found in this feature.</p>';
    return;
  }
  tabsEl.innerHTML = "";
  for (const name of manifest.files) {
    const b = document.createElement("button");
    b.className = "axi-tab";
    b.dataset.file = name;
    b.textContent = label(name);
    b.setAttribute("role", "tab");
    b.addEventListener("click", () => loadDoc(name));
    tabsEl.appendChild(b);
  }
  loadDoc(manifest.files[0]);
}

init();
