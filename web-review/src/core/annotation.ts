// Annotation capture (source-based).
//
// Targeting strategy (SPEC open question #2): capture the verbatim selected
// text plus the nearest preceding heading from the markdown SOURCE, so the
// agent can locate and edit the canonical .md. No HTML-to-source map in v1.

import type { QueueItem } from "./queue.ts";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Text of the nearest ATX heading at or before `index` in `md`. "" if none.
export function nearestHeading(md: string, index: number): string {
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

export interface QuoteLocation {
  index: number;
  occurrence: number;
  matched: string;
}

// Find the verbatim quote in md. Returns {index, occurrence, matched} where
// occurrence is how many identical matches precede this one (0-based), or null.
// Tries an exact match first, then a whitespace-flexible match.
export function findQuote(md: string, quote: string): QuoteLocation | null {
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
export function captureAnnotation({
  md,
  quote,
  file,
  note,
}: {
  md: string;
  quote: string;
  file: string | null;
  note: string;
}): QueueItem {
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
export function chatItem(note: string): QueueItem {
  return {
    kind: "chat",
    file: null,
    heading: null,
    quote: null,
    occurrence: 0,
    note: (note ?? "").trim(),
  };
}
