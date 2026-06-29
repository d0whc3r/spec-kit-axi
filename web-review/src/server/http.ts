// The review server process (`serve`, spawned by `start`).
//
// The human talks to it through the browser; the agent talks to it through the
// CLI subcommands. The browser queues notes, a blocked `poll` returns them, the
// agent edits the .md files, fs.watch pushes a live reload, `reply` echoes a
// summary to chat. State is in-memory; the queue is persisted to disk.

import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HOST } from "./paths.ts";
import { stateDir, serverInfoPath, queuePath } from "./state.ts";
import { discoverMarkdown, resolveMarkdown } from "./markdown.ts";

// The static surface is the Astro build output (./dist next to this file),
// written by `astro build`. In dev the Astro dev server serves the UI and
// proxies /api + /md here, so this dir is unused. fileURLToPath(import.meta.url)
// resolves to the bundled axi-server.mjs at runtime.
const WEB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Parse a JSON array request body, or null if it is not valid JSON / not an
// array. Callers decide the 400 message (the queue and send endpoints differ).
async function readArrayBody(req: IncomingMessage): Promise<unknown[] | null> {
  try {
    const v = JSON.parse(await readBody(req));
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

async function serveStatic(relPath: string, res: ServerResponse): Promise<void> {
  const full = path.normalize(path.join(WEB_DIR, relPath));
  if (full !== WEB_DIR && !full.startsWith(WEB_DIR + path.sep)) {
    res.writeHead(403);
    return void res.end("forbidden");
  }
  try {
    const body = await readFile(full);
    res.writeHead(200, { "content-type": MIME[path.extname(full)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}

interface Session {
  ended: boolean;
  sent: unknown[] | null;
  pollWaiters: ((items: unknown[]) => void)[];
  sse: ServerResponse[];
  pollConnected: number;
}

export function runServer(featureDir: string, port: number): void {
  // In-memory session state. The queue itself is persisted to disk.
  const session: Session = { ended: false, sent: null, pollWaiters: [], sse: [], pollConnected: 0 };

  const snapshot = () => ({ agentListening: session.pollConnected > 0, ended: session.ended });
  function broadcast(event: string, data?: unknown) {
    const frame = `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
    for (const res of session.sse) res.write(frame);
  }

  const json = (res: ServerResponse, obj: unknown) => {
    res.writeHead(200, { "content-type": MIME[".json"] });
    res.end(JSON.stringify(obj));
  };

  const server = http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? "/", `http://${HOST}`);

    if (pathname === "/") return serveStatic("index.html", res);

    if (pathname === "/api/manifest") {
      const files = await discoverMarkdown(featureDir);
      return json(res, { feature: path.basename(featureDir), files });
    }

    if (pathname.startsWith("/md/")) {
      const full = resolveMarkdown(featureDir, decodeURIComponent(pathname.slice("/md/".length)));
      if (!full) {
        res.writeHead(404);
        return res.end("unknown file");
      }
      try {
        const body = await readFile(full);
        res.writeHead(200, { "content-type": "text/markdown; charset=utf-8" });
        return res.end(body);
      } catch {
        res.writeHead(404);
        return res.end("not found");
      }
    }

    if (pathname === "/api/queue") {
      const file = queuePath(featureDir);
      if (req.method === "PUT") {
        const items = await readArrayBody(req);
        if (!items) {
          res.writeHead(400);
          return res.end("invalid queue");
        }
        await mkdir(stateDir(featureDir), { recursive: true });
        await writeFile(file, JSON.stringify(items, null, 2));
        res.writeHead(204);
        return res.end();
      }
      res.writeHead(200, { "content-type": MIME[".json"] });
      try {
        return res.end(await readFile(file, "utf8"));
      } catch {
        return res.end("[]");
      }
    }

    // Server-sent events: reload, status, reply, ended.
    if (pathname === "/api/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      res.write(`event: status\ndata: ${JSON.stringify(snapshot())}\n\n`);
      session.sse.push(res);
      req.on("close", () => {
        session.sse = session.sse.filter((c) => c !== res);
      });
      return;
    }

    // Browser flushes its queue (the Send button).
    if (pathname === "/api/send" && req.method === "POST") {
      const items = await readArrayBody(req);
      if (!items) {
        res.writeHead(400);
        return res.end("invalid");
      }
      const waiter = session.pollWaiters.shift();
      if (waiter) waiter(items);
      else session.sent = items;
      res.writeHead(204);
      return res.end();
    }

    // Agent long-poll: returns the sent queue, blocking until there is one.
    if (pathname === "/api/poll") {
      if (session.ended) return json(res, { ended: true, items: [] });
      if (session.sent) {
        const items = session.sent;
        session.sent = null;
        return json(res, { ended: false, items });
      }
      session.pollConnected++;
      broadcast("status", snapshot());
      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        session.pollWaiters = session.pollWaiters.filter((w) => w !== waiter);
        session.pollConnected = Math.max(0, session.pollConnected - 1);
        broadcast("status", snapshot());
      };
      const waiter = (items: unknown[]) => {
        if (settled) return;
        json(res, { ended: session.ended, items: items ?? [] });
        cleanup();
      };
      session.pollWaiters.push(waiter);
      req.on("close", cleanup);
      return;
    }

    // Agent reply -> browser chat.
    if (pathname === "/api/reply" && req.method === "POST") {
      const { text } = JSON.parse((await readBody(req)) || "{}");
      broadcast("reply", { text: text ?? "" });
      res.writeHead(204);
      return res.end();
    }

    // End the session.
    if (pathname === "/api/end" && req.method === "POST") {
      session.ended = true;
      for (const w of session.pollWaiters.splice(0)) w([]);
      broadcast("ended", {});
      res.writeHead(204);
      return res.end();
    }

    if (pathname === "/api/shutdown" && req.method === "POST") {
      res.writeHead(204);
      res.end();
      server.close();
      return process.exit(0);
    }

    // Anything else is a static asset from the Astro build (index, /_astro/*,
    // favicon). serveStatic confines reads to WEB_DIR.
    if (req.method === "GET") return serveStatic(pathname, res);

    res.writeHead(404);
    res.end("not found");
  });

  // Live reload: watch the feature's files (debounced).
  let timer: NodeJS.Timeout;
  try {
    watch(featureDir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => broadcast("reload", {}), 150);
    });
  } catch {
    /* recursive watch unsupported on this platform: live reload is skipped */
  }

  server.listen(port, HOST, async () => {
    await mkdir(stateDir(featureDir), { recursive: true });
    const addr = server.address();
    const boundPort = typeof addr === "object" && addr ? addr.port : port;
    await writeFile(
      serverInfoPath(featureDir),
      JSON.stringify({ port: boundPort, pid: process.pid, featureDir }),
    );
    process.stderr.write(`axi: serving ${featureDir} on http://${HOST}:${boundPort}/\n`);
  });
}
