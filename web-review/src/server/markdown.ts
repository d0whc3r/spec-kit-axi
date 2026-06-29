// Discovering and resolving the feature's markdown artifacts.

import { readdir } from "node:fs/promises";
import path from "node:path";

// Canonical Spec Kit artifacts first, then anything else alphabetically.
export const PRIORITY = [
  "spec.md",
  "plan.md",
  "tasks.md",
  "constitution.md",
  "research.md",
  "data-model.md",
  "quickstart.md",
];

export function sortArtifacts(files: string[]): string[] {
  const rank = (f: string) => {
    const i = PRIORITY.indexOf(f);
    return i === -1 ? PRIORITY.length : i;
  };
  return files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export async function discoverMarkdown(dir: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(rel: string) {
    let entries;
    try {
      entries = await readdir(path.join(dir, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(childRel);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) found.push(childRel);
    }
  }
  await walk("");
  return sortArtifacts(found);
}

// A relative path resolved inside featureDir, or null if it escapes or is not .md.
export function resolveMarkdown(featureDir: string, rel: string): string | null {
  const full = path.normalize(path.join(featureDir, rel));
  const inside = full === featureDir || full.startsWith(featureDir + path.sep);
  return inside && full.toLowerCase().endsWith(".md") ? full : null;
}
