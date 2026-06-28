// axi-server.mjs - local review surface + agent loop (Node stdlib, zero deps).
//
// The human talks to this server through the browser; the agent talks to it
// through these subcommands. The server bridges the two: the browser sends its
// queued notes, a blocked `poll` returns them as TOON, the agent edits the .md
// files, fs.watch pushes a live reload, and `reply` echoes a summary to chat.
//
// AXI-compliant CLI: TOON on stdout, structured errors on stdout, diagnostics
// on stderr, exit codes (0 ok/no-op, 1 error, 2 usage), content-first home view.

import http from "node:http";
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { toonQueue } from "./axi-core.mjs";

const WEB_DIR = import.meta.dirname;
const SELF = fileURLToPath(import.meta.url);
const HOST = "127.0.0.1";
const PRIORITY = [
  "spec.md",
  "plan.md",
  "tasks.md",
  "constitution.md",
  "research.md",
  "data-model.md",
  "quickstart.md",
];
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

// --- shared helpers --------------------------------------------------------

const out = (s) => process.stdout.write(s + "\n");
const tilde = (p) => p.replace(os.homedir(), "~");
const sh = (s) => (/\s/.test(s) ? `"${s}"` : s);
const selfCmd = `node ${tilde(SELF)}`;

function fail(msg, helps = []) {
  out(`error: ${msg}`);
  helps.forEach((h, i) => out(`help[${i + 1}]: ${h}`));
  process.exit(1);
}
function usage(msg) {
  out(`error: ${msg}`);
  process.exit(2);
}

function stateDir(featureDir) {
  const hash = createHash("sha1").update(featureDir).digest("hex").slice(0, 8);
  return path.join(process.cwd(), ".speckit-axi", `${path.basename(featureDir)}-${hash}`);
}
const serverInfoPath = (d) => path.join(stateDir(d), "server.json");
const queuePath = (d) => path.join(stateDir(d), "queue.json");

async function readServerInfo(featureDir) {
  try {
    return JSON.parse(await readFile(serverInfoPath(featureDir), "utf8"));
  } catch {
    return null;
  }
}
function isAlive(info) {
  try {
    process.kill(info.pid, 0);
    return true;
  } catch {
    return false;
  }
}
async function liveServer(featureDir) {
  const info = await readServerInfo(featureDir);
  return info && isAlive(info) ? info : null;
}
const api = (info, method, pathname, body) =>
  fetch(`http://${HOST}:${info.port}${pathname}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sortArtifacts(files) {
  const rank = (f) => {
    const i = PRIORITY.indexOf(f);
    return i === -1 ? PRIORITY.length : i;
  };
  return files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

async function discoverMarkdown(dir) {
  const found = [];
  async function walk(rel) {
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

function resolveMarkdown(featureDir, rel) {
  const full = path.normalize(path.join(featureDir, rel));
  const inside = full === featureDir || full.startsWith(featureDir + path.sep);
  return inside && full.toLowerCase().endsWith(".md") ? full : null;
}

async function serveStatic(relPath, res) {
  const full = path.normalize(path.join(WEB_DIR, relPath));
  if (full !== WEB_DIR && !full.startsWith(WEB_DIR + path.sep)) {
    res.writeHead(403);
    return res.end("forbidden");
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

function openBrowser(url) {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], {
    stdio: "ignore",
    detached: true,
    shell: process.platform === "win32",
  }).unref();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- the server process (`serve`, spawned by `start`) ----------------------

function runServer(featureDir, port) {
  // In-memory session state. The queue itself is persisted to disk.
  const session = { ended: false, sent: null, pollWaiters: [], sse: [], pollConnected: 0 };

  const snapshot = () => ({ agentListening: session.pollConnected > 0, ended: session.ended });
  function broadcast(event, data) {
    const frame = `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
    for (const res of session.sse) res.write(frame);
  }

  const json = (res, obj) => {
    res.writeHead(200, { "content-type": MIME[".json"] });
    res.end(JSON.stringify(obj));
  };

  const server = http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://${HOST}`);

    if (pathname === "/") return serveStatic("index.html", res);
    if (pathname.startsWith("/assets/")) return serveStatic(pathname.slice("/assets/".length), res);

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
        let items;
        try {
          items = JSON.parse(await readBody(req));
          if (!Array.isArray(items)) throw new Error();
        } catch {
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
      let items;
      try {
        items = JSON.parse(await readBody(req));
        if (!Array.isArray(items)) throw new Error();
      } catch {
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
      const waiter = (items) => {
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

    res.writeHead(404);
    res.end("not found");
  });

  // Live reload: watch the feature's files (debounced).
  let timer;
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
    await writeFile(
      serverInfoPath(featureDir),
      JSON.stringify({ port: server.address().port, pid: process.pid, featureDir }),
    );
    process.stderr.write(
      `axi: serving ${featureDir} on http://${HOST}:${server.address().port}/\n`,
    );
  });
}

// --- agent-facing subcommands ----------------------------------------------

async function waitForServer(featureDir, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const info = await liveServer(featureDir);
    if (info) {
      try {
        if ((await api(info, "GET", "/api/manifest")).ok) return info;
      } catch {
        /* not ready yet */
      }
    }
    await sleep(100);
  }
  return null;
}

async function ensureDir(featureDir) {
  try {
    if (!(await stat(featureDir)).isDirectory()) throw new Error();
  } catch {
    fail(`not a directory: ${featureDir}`, [`${selfCmd} start <feature-dir>`]);
  }
}

async function cmdStart(featureDir, opts) {
  const dir = path.resolve(featureDir);
  await ensureDir(dir);

  let info = await liveServer(dir);
  if (!info) {
    spawn(process.execPath, [SELF, "serve", dir, "--port", String(opts.port)], {
      detached: true,
      stdio: "ignore",
    }).unref();
    info = await waitForServer(dir, 5000);
    if (!info) fail("the review server did not start", [`retry ${selfCmd} start ${sh(dir)}`]);
  }

  const url = `http://${HOST}:${info.port}/`;
  if (!opts.noOpen) openBrowser(url);

  const files = await discoverMarkdown(dir);
  out(`session: ${path.relative(process.cwd(), dir) || dir}`);
  out(`url: ${url}`);
  out(files.length ? `artifacts: ${files.join(", ")}` : "artifacts: none found");
  out("help[2]:");
  out(
    `  the reviewer annotates in the browser, then run \`${selfCmd} poll ${sh(dir)}\` to receive notes`,
  );
  out(`  run \`${selfCmd} end ${sh(dir)}\` when the review is done`);
}

async function cmdPoll(featureDir) {
  const dir = path.resolve(featureDir);
  const info = await liveServer(dir);
  if (!info) fail("no review session is running", [`${selfCmd} start ${sh(dir)}`]);

  const beat = setInterval(
    () => process.stderr.write("axi: waiting for the reviewer to send notes...\n"),
    15000,
  );
  let payload;
  try {
    payload = await (await api(info, "GET", "/api/poll")).json();
  } catch {
    clearInterval(beat);
    fail("lost contact with the review server", [`${selfCmd} start ${sh(dir)}`]);
  }
  clearInterval(beat);

  const session = path.relative(process.cwd(), dir) || dir;
  if (payload.ended) {
    out(`session: ${session}`);
    out("queue: 0 items - the reviewer ended the session");
    out(`help[1]: run \`${selfCmd} stop ${sh(dir)}\` to shut the server down`);
    return;
  }
  out(toonQueue(payload.items, { session }));
  out("help[2]:");
  out(`  edit the files, then run \`${selfCmd} reply ${sh(dir)} "what you changed"\``);
  out(`  run \`${selfCmd} poll ${sh(dir)}\` again to receive the next round`);
}

async function cmdReply(featureDir, text) {
  if (!text) usage('reply text is required: reply <feature-dir> "message"');
  const dir = path.resolve(featureDir);
  const info = await liveServer(dir);
  if (!info) fail("no review session is running", [`${selfCmd} start ${sh(dir)}`]);
  await api(info, "POST", "/api/reply", { text });
  out("reply: delivered to the reviewer");
}

async function cmdEnd(featureDir) {
  const dir = path.resolve(featureDir);
  const info = await liveServer(dir);
  if (!info) {
    out("session: not running (no-op)");
    return;
  }
  await api(info, "POST", "/api/end");
  out("session: ended");
}

async function cmdStop(featureDir) {
  const roots = [];
  if (featureDir) {
    roots.push(path.resolve(featureDir));
  } else {
    const base = path.join(process.cwd(), ".speckit-axi");
    try {
      for (const e of await readdir(base, { withFileTypes: true })) {
        if (e.isDirectory()) {
          try {
            roots.push(
              JSON.parse(await readFile(path.join(base, e.name, "server.json"), "utf8")).featureDir,
            );
          } catch {
            /* no server.json in this dir */
          }
        }
      }
    } catch {
      /* no .speckit-axi */
    }
  }

  let stopped = 0;
  for (const dir of roots) {
    const info = await liveServer(dir);
    if (!info) continue;
    try {
      await api(info, "POST", "/api/shutdown");
    } catch {
      /* the process may exit before responding */
    }
    stopped++;
  }
  out(
    stopped
      ? `stopped: ${stopped} server${stopped === 1 ? "" : "s"}`
      : "stopped: 0 servers (no-op)",
  );
}

async function listSessions() {
  const base = path.join(process.cwd(), ".speckit-axi");
  const sessions = [];
  let entries;
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    return sessions;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    try {
      const info = JSON.parse(await readFile(path.join(base, e.name, "server.json"), "utf8"));
      if (isAlive(info)) {
        sessions.push({
          feature: path.relative(process.cwd(), info.featureDir) || info.featureDir,
          port: info.port,
        });
      }
    } catch {
      /* skip */
    }
  }
  return sessions;
}

// Content-first home view (AXI principles 8 and 10).
async function cmdHome() {
  out(`bin: ${tilde(SELF)}`);
  out(
    "description: axi review surface - render a feature's markdown for human review, then return queued notes to the agent",
  );
  const sessions = await listSessions();
  if (!sessions.length) {
    out("sessions: 0 active");
  } else {
    out(`sessions[${sessions.length}]{feature,url}:`);
    for (const s of sessions) out(`  ${s.feature},http://${HOST}:${s.port}/`);
  }
  out("help[2]:");
  out(`  run \`${selfCmd} start <feature-dir>\` to open a review session`);
  out(`  run \`${selfCmd} poll <feature-dir>\` to receive queued notes`);
}

// --- help (AXI principle 10) -----------------------------------------------

const HELP = {
  start: [
    "start <feature-dir> [--port N] [--no-open]",
    "  Open (or reuse) a review session and launch the browser.",
    "  --port N    bind to a fixed port (default: an open one)",
    "  --no-open   do not open the browser",
    "examples:",
    `  ${selfCmd} start specs/001-feature`,
    `  ${selfCmd} start specs/001-feature --no-open`,
  ].join("\n"),
  poll: [
    "poll <feature-dir>",
    "  Block until the reviewer sends notes, then print them as TOON on stdout.",
    "examples:",
    `  ${selfCmd} poll specs/001-feature`,
  ].join("\n"),
  reply: [
    'reply <feature-dir> "message"',
    "  Show a message to the reviewer in the browser chat.",
    "examples:",
    `  ${selfCmd} reply specs/001-feature "applied your notes"`,
  ].join("\n"),
  end: [
    "end <feature-dir>",
    "  End the review session. The next poll returns the ended state.",
    "examples:",
    `  ${selfCmd} end specs/001-feature`,
  ].join("\n"),
  stop: [
    "stop [feature-dir]",
    "  Shut down the review server. With no argument, stops every running server.",
    "examples:",
    `  ${selfCmd} stop`,
    `  ${selfCmd} stop specs/001-feature`,
  ].join("\n"),
};

function printHelp(cmd) {
  if (HELP[cmd]) return out(HELP[cmd]);
  out(`bin: ${tilde(SELF)}`);
  out("commands:");
  out(`  ${selfCmd} start <feature-dir> [--port N] [--no-open]   open a review session`);
  out(`  ${selfCmd} poll <feature-dir>                            receive queued notes (TOON)`);
  out(`  ${selfCmd} reply <feature-dir> "message"                 message the reviewer`);
  out(`  ${selfCmd} end <feature-dir>                             end the session`);
  out(`  ${selfCmd} stop [feature-dir]                            shut the server(s) down`);
  out(`run \`${selfCmd}\` with no arguments to see active sessions`);
}

// --- dispatch --------------------------------------------------------------

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string", default: "0" },
    "no-open": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});
const [cmd, arg1, arg2] = positionals;

if (values.help) {
  printHelp(cmd);
  process.exit(0);
}

switch (cmd) {
  case undefined:
    await cmdHome();
    break;
  case "start":
    if (!arg1) usage("start needs a feature dir: start <feature-dir> [--port N] [--no-open]");
    await cmdStart(arg1, { port: Number(values.port), noOpen: values["no-open"] });
    break;
  case "serve":
    if (!arg1) usage("serve needs a feature dir (internal command, use `start`)");
    runServer(path.resolve(arg1), Number(values.port));
    break;
  case "poll":
    if (!arg1) usage("poll needs a feature dir: poll <feature-dir>");
    await cmdPoll(arg1);
    break;
  case "reply":
    if (!arg1) usage('reply needs a feature dir: reply <feature-dir> "message"');
    await cmdReply(arg1, arg2);
    break;
  case "end":
    if (!arg1) usage("end needs a feature dir: end <feature-dir>");
    await cmdEnd(arg1);
    break;
  case "stop":
    await cmdStop(arg1);
    break;
  default:
    usage(`unknown command "${cmd}". Commands: start, poll, reply, end, stop`);
}
