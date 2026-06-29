// Queue model (pure).

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

function nextId(items: QueueItem[]): number {
  return items.reduce((max, it) => Math.max(max, it.id ?? 0), 0) + 1;
}

export function queueAdd(items: QueueItem[], item: QueueItem): QueueItem[] {
  return [...items, { id: nextId(items), ...item }];
}

export function queueEdit(items: QueueItem[], id: number, patch: Partial<QueueItem>): QueueItem[] {
  return items.map((it) => (it.id === id ? { ...it, ...patch, id } : it));
}

export function queueRemove(items: QueueItem[], id: number): QueueItem[] {
  return items.filter((it) => it.id !== id);
}

export function queueSerialize(items: QueueItem[]): string {
  return JSON.stringify(items ?? [], null, 2);
}

export function queueDeserialize(json: string): QueueItem[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
