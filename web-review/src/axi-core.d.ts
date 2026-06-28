// Types for the shared pure helpers in web-review/axi-core.mjs, imported
// here through the "@axi-core" Vite alias (see astro.config.mjs). The runtime
// module is plain ESM with no bundled dependencies.

declare module "@axi-core" {
  export type ItemKind = "anno" | "chat";

  export interface QueueItem {
    id?: number;
    kind: ItemKind;
    file: string | null;
    heading: string | null;
    quote: string | null;
    occurrence: number;
    note: string;
  }

  export function captureAnnotation(input: {
    md: string;
    quote: string;
    file: string | null;
    note: string;
  }): QueueItem;

  export function chatItem(note: string): QueueItem;

  export function queueAdd(items: QueueItem[], item: QueueItem): QueueItem[];
  export function queueEdit(items: QueueItem[], id: number, patch: Partial<QueueItem>): QueueItem[];
  export function queueRemove(items: QueueItem[], id: number): QueueItem[];
}
