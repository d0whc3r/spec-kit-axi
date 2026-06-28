// axi-core - pure helpers shared by the browser (axi.js) and node tests.
//
// This module has NO imports: rendering libraries (marked, DOMPurify, mermaid)
// are loaded from a CDN in the browser (axi.js), so they never reach node. That
// keeps every function here unit-testable under `node --test` with zero deps.

// --- Annotation capture (source-based) -------------------------------------
//
// Targeting strategy (SPEC open question #2): capture the verbatim selected
// text plus the nearest preceding heading from the markdown SOURCE, so the
// agent can locate and edit the canonical .md. No HTML-to-source map in v1.

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Text of the nearest ATX heading at or before `index` in `md`. "" if none.
export function nearestHeading(md, index) {
  const lines = (md ?? "").split("\n");
  let offset = 0;
  let heading = "";
  for (const line of lines) {
    if (offset > index) break;
    const m = /^#{1,6}\s+(.*?)\s*$/.exec(line);
    if (m) heading = m[1].trim();
    offset += line.length + 1; // + newline
  }
  return heading;
}

// Find the verbatim quote in md. Returns {index, occurrence, matched} where
// occurrence is how many identical matches precede this one (0-based), or null.
// Tries an exact match first, then a whitespace-flexible match.
export function findQuote(md, quote) {
  const text = md ?? "";
  const q = (quote ?? "").trim();
  if (!q) return null;

  const index = text.indexOf(q);
  if (index !== -1) {
    const occurrence = text.slice(0, index).split(q).length - 1;
    return { index, occurrence, matched: q };
  }

  const pattern = q.split(/\s+/).map(escapeRegExp).join("\\s+");
  const m = new RegExp(pattern).exec(text);
  return m ? { index: m.index, occurrence: 0, matched: m[0] } : null;
}

// Assemble an `anno` queue item from a selection over a source document.
export function captureAnnotation({ md, quote, file, note }) {
  const loc = findQuote(md, quote);
  return {
    kind: "anno",
    file,
    heading: loc ? nearestHeading(md, loc.index) : "",
    quote: (quote ?? "").trim(),
    occurrence: loc ? loc.occurrence : 0,
    note: (note ?? "").trim(),
  };
}

// A free-form `chat` queue item (not tied to a selection).
export function chatItem(note) {
  return {
    kind: "chat",
    file: null,
    heading: null,
    quote: null,
    occurrence: 0,
    note: (note ?? "").trim(),
  };
}

// --- Queue model (pure) ----------------------------------------------------

function nextId(items) {
  return items.reduce((max, it) => Math.max(max, it.id ?? 0), 0) + 1;
}

export function queueAdd(items, item) {
  return [...items, { id: nextId(items), ...item }];
}

export function queueEdit(items, id, patch) {
  return items.map((it) => (it.id === id ? { ...it, ...patch, id } : it));
}

export function queueRemove(items, id) {
  return items.filter((it) => it.id !== id);
}

export function queueSerialize(items) {
  return JSON.stringify(items ?? [], null, 2);
}

export function queueDeserialize(json) {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// --- TOON output (minimal tabular, AXI principle 1) ------------------------
//
// Encodes the queue for the agent's `poll` stdout. Token-cheaper than JSON.
// Not full TOON spec: a small CSV-style encoder. `-` marks an absent field;
// values with a comma/quote get double-quote wrapped (inner quotes doubled),
// and newlines become a literal \n so each item stays on one line.

export function toonField(v) {
  if (v === null || v === undefined || v === "") return "-";
  const hadNewline = /\r?\n/.test(String(v));
  const s = String(v).replace(/\r?\n/g, "\\n");
  if (hadNewline || /[",]/.test(s) || s !== s.trim()) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toonQueue(items, { session } = {}) {
  const list = items ?? [];
  const lines = [];
  if (session) lines.push(`session: ${session}`);
  if (!list.length) {
    lines.push("queue: 0 items");
    return lines.join("\n");
  }
  lines.push(`queue[${list.length}]{kind,file,heading,occurrence,quote,note}:`);
  for (const it of list) {
    const row = [it.kind, it.file, it.heading, it.occurrence ?? 0, it.quote, it.note];
    lines.push("  " + row.map(toonField).join(","));
  }
  return lines.join("\n");
}
