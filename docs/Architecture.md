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

## Technology stack

The pieces are deliberately small and dependency-light.

- **Review server** (`web-review/axi-server.mjs`): the Node standard library
  only. `node:http` runs the loopback server, `node:fs` reads the markdown
  and watches for edits, `node:crypto` derives the per-feature state
  directory. No third-party packages and no install step; the agent runs it
  with `node`.
- **Browser surface**: a single static page (HTML, CSS, and a small amount
  of JavaScript) that the server serves from loopback. It holds the
  annotation and chat interactions and the live status of the session.
- **Markdown rendering**: done in the browser by `marked`, `DOMPurify`, and
  `mermaid`, loaded from a pinned CDN. See [Rendering](#rendering).
- **Transport**: HTTP over loopback throughout, with no WebSocket. The
  browser fetches content with plain requests and gets live updates over a
  server-sent events (SSE) stream. The agent runs the CLI subcommands
  (`start`, `poll`, `reply`, `end`, `stop`), which reach the server over
  HTTP, and receives the queued notes by long-polling.
- **Queue format**: the agent receives the reviewer's notes as TOON, a
  compact tabular encoding that costs fewer tokens than JSON. See
  [Annotation Format](Annotation-Format.md).

At runtime nothing leaves your machine except the renderer's CDN fetch. The
markdown and your notes are served only over loopback.

## How a review is invoked

```text
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

## How information travels

The server holds the session in memory and bridges the two sides over HTTP on
loopback. Neither side talks to the other directly; both talk to the server.

The browser uses plain requests for content and one long-lived stream for
updates:

- `GET /api/manifest` lists the feature's markdown files; `GET /md/<file>`
  returns one raw file.
- `PUT /api/queue` saves the working queue to disk so it survives a page
  reload; `POST /api/send` hands the queue to the agent when you click Send.
- `GET /api/events` is a server-sent events stream. The server pushes
  `status` (is the agent listening), `reload` (a file changed), `reply` (an
  agent message), and `ended` over it.

The agent drives the session through its CLI, which calls the matching
endpoints:

- `poll` is a long-poll on `GET /api/poll`. It blocks until you click Send,
  then returns your notes as TOON and prints them. While it waits, the server
  marks the agent as connected and pushes a `status` event, so the browser
  shows "agent ready".
- `reply` posts to `/api/reply`; the server relays it to the browser as a
  `reply` event. `end` and `stop` close the session and the server.

So one round trip is: you click Send, the browser posts the queue to
`/api/send`, the blocked `poll` returns it as TOON, the agent edits the `.md`
files, a recursive `fs.watch` on the feature directory (debounced) fires, the
server broadcasts `reload`, the browser re-fetches the current document, and
`reply` posts a one-line summary to the chat. Each queued note carries its
kind (`anno` or `chat`), the file, the nearest heading, the quoted text, and
your comment; see [Annotation Format](Annotation-Format.md).

The queue and the server handshake are persisted under
`.speckit-axi/<feature>-<hash>/` in your project (`queue.json` and
`server.json`). They never leave your machine.

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
