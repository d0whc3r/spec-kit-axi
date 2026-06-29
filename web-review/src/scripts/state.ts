// Shared UI state + small pure helpers. The split modules read and write the
// fields on `store` instead of the module-scoped variables the single-file
// script used, so there is one source of truth for the live session.

import type { QueueItem } from "../core/index.ts";

export const store = {
  items: [] as QueueItem[],
  currentFile: null as string | null,
  currentMd: "",
  agentListening: false,
  ended: false,
  processing: false,
};

const TITLES: Record<string, string> = {
  "spec.md": "Spec",
  "plan.md": "Plan",
  "tasks.md": "Tasks",
  "constitution.md": "Constitution",
  "research.md": "Research",
  "data-model.md": "Data model",
  "quickstart.md": "Quickstart",
};

// Tab label for a (possibly nested, dynamic) artifact path.
export function label(relpath: string): string {
  const base = relpath.split("/").pop() ?? relpath;
  if (TITLES[base]) return TITLES[base];
  return relpath.replace(/\.md$/i, "");
}

export function shorten(s: string, n = 90): string {
  s = s || "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export const isDark = (): boolean => {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches);
};
