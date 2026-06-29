// Per-feature session state: where the queue + server handshake live on disk,
// liveness checks, the HTTP bridge to a running server, and a scan of all
// recorded sessions.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { HOST } from "./paths.ts";

export interface ServerInfo {
  port: number;
  pid: number;
  featureDir: string;
}

// A stable, collision-resistant state dir per feature (basename + path hash).
export function stateDir(featureDir: string): string {
  const hash = createHash("sha1").update(featureDir).digest("hex").slice(0, 8);
  return path.join(process.cwd(), ".speckit-axi", `${path.basename(featureDir)}-${hash}`);
}
export const serverInfoPath = (d: string): string => path.join(stateDir(d), "server.json");
export const queuePath = (d: string): string => path.join(stateDir(d), "queue.json");

export async function readServerInfo(featureDir: string): Promise<ServerInfo | null> {
  try {
    return JSON.parse(await readFile(serverInfoPath(featureDir), "utf8"));
  } catch {
    return null;
  }
}

export function isAlive(info: ServerInfo): boolean {
  try {
    process.kill(info.pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function liveServer(featureDir: string): Promise<ServerInfo | null> {
  const info = await readServerInfo(featureDir);
  return info && isAlive(info) ? info : null;
}

export const api = (
  info: ServerInfo,
  method: string,
  pathname: string,
  body?: unknown,
): Promise<Response> =>
  fetch(`http://${HOST}:${info.port}${pathname}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

// Every recorded session under .speckit-axi (alive or not). Callers filter.
export async function scanSessions(): Promise<ServerInfo[]> {
  const base = path.join(process.cwd(), ".speckit-axi");
  const found: ServerInfo[] = [];
  let entries;
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    try {
      found.push(JSON.parse(await readFile(path.join(base, e.name, "server.json"), "utf8")));
    } catch {
      /* no readable server.json in this dir */
    }
  }
  return found;
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
