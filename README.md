# Axi Extension for Spec Kit

A Spec Kit extension that turns a feature's markdown artifacts into a
human-friendly review surface in the browser. The reviewer reads the rendered
documents, selects text to annotate, and chats comments. Those notes queue up
and, on one click, go back to the agent, which edits the canonical `.md` files
while the browser live-reloads to show the changes.

## How it works

1. Run `/speckit.axi`. The agent launches a local review surface (Node, zero
   dependencies, loopback only) for the active feature and opens your browser.
2. You read the artifacts as web pages. Select any phrase to attach a note, or
   type a general comment in the chat. Notes collect in a queue.
3. Click **Send**. The agent receives the whole queue and edits the markdown.
4. The browser live-reloads. The agent posts a short summary of what changed.
   Repeat until you end the session.

Markdown stays the source of truth: the agent edits the `.md` files, never a
derived copy. Annotations and the queue stay local. The renderer (marked,
DOMPurify, mermaid) loads from a pinned CDN, so viewing needs an internet
connection; offline, the surface shows a notice.

## At a glance

| Command        | What it does                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `/speckit.axi` | Open a feature's markdown in a browser review surface, collect annotations, and apply the notes. |

## Requirements

- Node.js (the review tool runs with `node`, no install step).
- A browser and an internet connection for the renderer.

## Documentation

The wiki is generated from [`docs/`](docs/) on every push to `main`. See
[WORKFLOW.md](WORKFLOW.md) for the deep usage guide.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
