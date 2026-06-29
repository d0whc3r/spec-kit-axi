// Agent-facing subcommands: start, poll, reply, end, stop, and the content-first
// home view. The browser is the human's surface; these are the agent's.

import { stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { toonQueue } from "../core/index.ts";
import { HOST, SELF, sh, selfCmd, tilde } from "./paths.ts";
import { type ServerInfo, liveServer, api, scanSessions, isAlive, sleep } from "./state.ts";
import { discoverMarkdown } from "./markdown.ts";
import { out, fail, usage } from "./io.ts";

// A label for the session: relative to cwd when possible, else the abs path.
const sessionName = (dir: string): string => path.relative(process.cwd(), dir) || dir;

// Resolve the feature dir and require a running server, or fail with help.
async function requireServer(featureDir: string): Promise<{ dir: string; info: ServerInfo }> {
  const dir = path.resolve(featureDir);
  const info = await liveServer(dir);
  if (!info) fail("no review session is running", [`${selfCmd} start ${sh(dir)}`]);
  return { dir, info };
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], {
    stdio: "ignore",
    detached: true,
    shell: process.platform === "win32",
  }).unref();
}

async function waitForServer(featureDir: string, timeoutMs: number): Promise<ServerInfo | null> {
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

async function ensureDir(featureDir: string): Promise<void> {
  try {
    if (!(await stat(featureDir)).isDirectory()) throw new Error();
  } catch {
    fail(`not a directory: ${featureDir}`, [`${selfCmd} start <feature-dir>`]);
  }
}

export async function cmdStart(featureDir: string, opts: { port: number; noOpen: boolean }) {
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
  out(`session: ${sessionName(dir)}`);
  out(`url: ${url}`);
  out(files.length ? `artifacts: ${files.join(", ")}` : "artifacts: none found");
  out("help[2]:");
  out(
    `  the reviewer annotates in the browser, then run \`${selfCmd} poll ${sh(dir)}\` to receive notes`,
  );
  out(`  run \`${selfCmd} end ${sh(dir)}\` when the review is done`);
}

export async function cmdPoll(featureDir: string) {
  const { dir, info } = await requireServer(featureDir);

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

  const session = sessionName(dir);
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

export async function cmdReply(featureDir: string, text: string | undefined) {
  if (!text) usage('reply text is required: reply <feature-dir> "message"');
  const { info } = await requireServer(featureDir);
  await api(info, "POST", "/api/reply", { text });
  out("reply: delivered to the reviewer");
}

export async function cmdEnd(featureDir: string) {
  const dir = path.resolve(featureDir);
  const info = await liveServer(dir);
  if (!info) {
    out("session: not running (no-op)");
    return;
  }
  await api(info, "POST", "/api/end");
  out("session: ended");
}

export async function cmdStop(featureDir: string | undefined) {
  const roots = featureDir
    ? [path.resolve(featureDir)]
    : (await scanSessions()).map((i) => i.featureDir);

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

async function listSessions(): Promise<{ feature: string; port: number }[]> {
  return (await scanSessions())
    .filter(isAlive)
    .map((info) => ({ feature: sessionName(info.featureDir), port: info.port }));
}

// Content-first home view (AXI principles 8 and 10).
export async function cmdHome() {
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
