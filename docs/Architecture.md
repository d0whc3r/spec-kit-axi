# Architecture

How the command and the local review server work when you run them.

## What the extension is

The extension has two parts:

1. **A markdown command.** `commands/speckit.axi.review.md` is a prompt the Spec Kit
   assistant reads. It has no runtime of its own; the assistant follows it.
2. **A local review tool.** `web-review/axi-server.mjs` is a small Node
   program that uses only the Node standard library (zero dependencies). The
   assistant launches it with `node`. Unlike a pure-text extension, this part
   does have a runtime: a short-lived HTTP server bound to `127.0.0.1`.

The browser talks to the server; the agent talks to the server through its
subcommands. The server bridges the two.

## How a review is invoked

```
You run /speckit.axi.review [feature-dir]
        ↓
The slash command resolves to commands/speckit.axi.review.md
        ↓
The agent resolves the feature directory (argument, branch, or most recent specs/*)
        ↓
The agent runs:  node web-review/axi-server.mjs start <feature-dir>
        ↓
The server binds to 127.0.0.1 on an open port and opens your browser
        ↓
The browser fetches the rendered markdown; you annotate and click Send
        ↓
The agent's `poll` returns the queue; the agent edits the .md files
        ↓
fs.watch detects the edit and pushes a live reload to the browser
        ↓
The agent runs `reply` with a summary; repeat until you end the session
        ↓
The agent runs `stop`; the server exits
```

## How the browser and the agent connect

The server holds the session in memory and bridges the two sides over HTTP on
loopback:

- The browser fetches the file manifest and each document, then opens a
  server-sent events stream for live reload, reply messages, and status.
- When you click Send, the browser flushes its queue to the server.
- The agent's `poll` is a long-poll: it blocks until the queue arrives, then
  returns it as TOON.
- After editing, the agent's `reply` pushes a one-line message to the browser.
- A recursive `fs.watch` on the feature directory, debounced, triggers the
  live reload.

The annotation queue is persisted under `.speckit-axi/<feature>-<hash>/` in
your project (`server.json` and `queue.json`). It never leaves your machine.

## Rendering

The browser renders each document with `marked` for markdown, `DOMPurify` to
sanitize the result, and `mermaid` for fenced `mermaid` diagrams. These
libraries load from a pinned CDN, so they never reach the Node server and the
server stays dependency-free. Because the renderer is fetched from a CDN, the
pages need an internet connection; offline, the surface shows a notice. The
markdown itself and your notes are served only from loopback.

## Source of truth contract

The feature's `.md` files are canonical. The agent edits them in place, only as
your queued notes direct, and never writes a derived copy. Everything the
server keeps (sessions, the queue) is local working state under `.speckit-axi/`
and is discarded when you stop the server. The review surface changes how you
review the markdown, not what is authoritative: the files on disk remain the
single source of truth.
