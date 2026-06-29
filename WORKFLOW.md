# How to Use the Axi Extension

Axi gives a human a clear, browser-based way to review the markdown a feature
produced (spec, plan, tasks, and whatever else was generated) and hand precise
feedback back to the agent.

## Run a review

Ask the agent to run `/speckit.axi.review`. Optionally name the feature directory:

```text
/speckit.axi.review specs/001-my-feature
```

If you do not name one, the agent resolves it (the path you gave, the `specs/`
directory matching your branch, the only one present, or the most recent).

The agent starts a local review surface and opens your browser at a
`127.0.0.1` address. Every markdown file in the feature directory shows up as a
tab, including nested ones such as `contracts/`.

## Review in the browser

- **Read**: each artifact renders as a web page, with tables and mermaid
  diagrams.
- **Annotate**: select any phrase and add a note. The note records the file,
  the nearest heading, and the exact text you picked.
- **Comment**: type a general remark in the composer (Enter adds it,
  Shift+Enter for a newline).
- **Queue**: notes collect in the Notes panel. Edit or remove any before
  sending.
- **Send**: one button hands the whole queue to the agent.

The status line shows whether the agent is connected, when it is processing
your notes, and any reply it sends back. When the agent finishes a round, the
document live-reloads in place.

## What the agent does

For each note, the agent edits the canonical `.md` file: for an annotation it
finds the exact text you selected under its heading and acts on your note; for
a comment it applies the feedback across the relevant documents. It then posts
a one-line summary and waits for your next round. End the session in the
browser or ask the agent to stop when you are done.

## The CLI behind it

`/speckit.axi.review` drives a small Node tool, `.specify/extensions/axi/templates/web-review/axi-server.mjs`:

| Command                      | Purpose                                         |
| ---------------------------- | ----------------------------------------------- |
| `start <feature-dir>`        | Open or reuse a session and launch the browser. |
| `poll <feature-dir>`         | Wait for sent notes, then print them as TOON.   |
| `reply <feature-dir> "text"` | Show a message to the reviewer.                 |
| `end <feature-dir>`          | End the session.                                |
| `stop [feature-dir]`         | Shut the server down.                           |

Run any command with `--help` for its flags and examples. The renderer loads
from a CDN, so reviewing needs an internet connection; all of your notes stay
local.
