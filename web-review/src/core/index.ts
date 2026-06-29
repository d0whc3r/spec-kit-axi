// axi-core - pure helpers shared by the browser (src/scripts/*) and the
// review server (src/server/*), plus the node test.
//
// This module has NO runtime imports: rendering libraries (marked, DOMPurify,
// mermaid) are loaded from a CDN in the browser, so they never reach node. That
// keeps every function here unit-testable under `node --test` with zero deps.
// esbuild bundles this barrel to web-review/axi-core.mjs for the shipped surface.

export type { ItemKind, QueueItem } from "./queue.ts";
export type { QuoteLocation } from "./annotation.ts";
export type { DiffOp } from "./diff.ts";

export { nearestHeading, findQuote, captureAnnotation, chatItem } from "./annotation.ts";
export { queueAdd, queueEdit, queueRemove, queueSerialize, queueDeserialize } from "./queue.ts";
export { toonField, toonQueue } from "./toon.ts";
export { lineDiff } from "./diff.ts";
