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

## Documentation

The full guide lives in the **[project wiki](https://github.com/d0whc3r/spec-kit-axi/wiki)**. This README is the front door only.

| Wiki page                                                                           | When to read                                                          |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Home](https://github.com/d0whc3r/spec-kit-axi/wiki/Home)                           | Overview and reading order.                                           |
| [Getting Started](https://github.com/d0whc3r/spec-kit-axi/wiki/Getting-Started)     | First install, zero to your first browser review in five minutes.     |
| [Commands](https://github.com/d0whc3r/spec-kit-axi/wiki/Commands)                   | Deep reference for `/speckit.axi` and the review server it drives.    |
| [Workflow](https://github.com/d0whc3r/spec-kit-axi/wiki/Workflow)                   | How a review flows: feature resolution, the annotate and apply loop.  |
| [Examples](https://github.com/d0whc3r/spec-kit-axi/wiki/Examples)                   | A worked review session and the edits it produces.                    |
| [Annotation Format](https://github.com/d0whc3r/spec-kit-axi/wiki/Annotation-Format) | The TOON queue the reviewer sends and how each field maps to an edit. |
| [Troubleshooting](https://github.com/d0whc3r/spec-kit-axi/wiki/Troubleshooting)     | Server, browser, port, and offline issues, with their fixes.          |
| [FAQ](https://github.com/d0whc3r/spec-kit-axi/wiki/FAQ)                             | Conceptual questions and design rationale.                            |
| [Architecture](https://github.com/d0whc3r/spec-kit-axi/wiki/Architecture)           | How the command and the local review server work.                     |

The wiki is generated from [`docs/`](docs/) on every push to `main`. To browse
the same content as plain markdown, open the [docs folder](docs/).

## At a glance

| Command        | What it does                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `/speckit.axi` | Open a feature's markdown in a browser review surface, collect annotations, and apply the notes. |

`/speckit.axi` takes an optional feature directory, for example
`/speckit.axi specs/001-my-feature`. Without one, the agent resolves the
feature from your branch or the most recent `specs/*` directory. The command
does not generate a new file; it edits the feature's existing markdown in place.

## Requirements

- Node.js (the review tool runs with `node`, no install step).
- A browser and an internet connection for the renderer.

## Install

Install directly from the latest release. This needs no catalog setup and is the
recommended path:

```bash
specify extension add axi --from https://github.com/d0whc3r/spec-kit-axi/releases/download/v0.0.1/axi-0.0.1.zip
```

Change the version in the URL to pin a different release.

Want to install by name with `specify extension add axi`? That resolves the
extension from Spec Kit's community catalog, which ships as discovery only
(`install_allowed: false`). Approve it once:

```bash
specify extension catalog add https://raw.githubusercontent.com/github/spec-kit/main/extensions/catalog.community.json --name community --install-allowed
specify extension add axi
```

If `specify extension add axi` fails with `installation is not allowed from that catalog`, that is why. See [Troubleshooting](https://github.com/d0whc3r/spec-kit-axi/wiki/Troubleshooting#installation-errors).

For prerequisites and the first-run walkthrough see [Getting Started](https://github.com/d0whc3r/spec-kit-axi/wiki/Getting-Started).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
