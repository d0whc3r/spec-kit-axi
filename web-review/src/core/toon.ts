// TOON output (minimal tabular, AXI principle 1).
//
// Encodes the queue for the agent's `poll` stdout. Token-cheaper than JSON.
// Not full TOON spec: a small CSV-style encoder. `-` marks an absent field;
// values with a comma/quote get double-quote wrapped (inner quotes doubled),
// and newlines become a literal \n so each item stays on one line.

import type { QueueItem } from "./queue.ts";

export function toonField(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  const hadNewline = /\r?\n/.test(String(v));
  const s = String(v).replace(/\r?\n/g, "\\n");
  if (hadNewline || /[",]/.test(s) || s !== s.trim()) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toonQueue(items: QueueItem[], { session }: { session?: string } = {}): string {
  const list = items ?? [];
  const lines: string[] = [];
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
