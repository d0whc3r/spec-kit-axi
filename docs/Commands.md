# Commands Reference

One slash command. It opens a feature's markdown for review in the browser,
collects the reviewer's notes, and applies them to the canonical files. It does
not generate a new file; it edits the feature's existing markdown in place.

| Command                       | Reads                                | Writes                                           | Audience                |
| ----------------------------- | ------------------------------------ | ------------------------------------------------ | ----------------------- |
| [`/speckit.axi`](#speckitaxi) | every `.md` in the feature directory | the same `.md` files, edited in place from notes | Anyone reviewing a spec |

`/speckit.axi` accepts an optional feature directory as its argument
(`/speckit.axi specs/001-my-feature`). Without one, the agent resolves the
feature itself (see [Feature resolution](#feature-resolution)).

---

## `/speckit.axi`

Opens a human-friendly review surface for the active feature's markdown. The
reviewer reads the rendered documents, selects text to annotate, and chats
comments. The agent receives the queued feedback and edits the canonical `.md`
files, while the browser live-reloads so the reviewer sees each change.

**Reads**: every `.md` file in the feature directory, including nested ones
(for example `contracts/`). Known names sort first; the rest follow
alphabetically.
**Writes**: the same `.md` files, edited in place, only as the reviewer's
queued notes direct. No derived copy is ever written.

### Feature resolution

When you do not name a directory, the agent resolves it in this order:

1. If you named a path, use it.
2. Else the `specs/` subdirectory that matches the current git branch.
3. Else, if there is exactly one `specs/*` directory, use it.
4. Else the most recently modified `specs/*` directory.
5. If it is still unclear, ask you.

### What a run looks like

1. The agent launches the review server and opens your browser at a
   `127.0.0.1` address.
2. You read, annotate, and click **Send**. The queue goes to the agent.
3. The agent applies each note to the markdown and posts a one-line summary.
4. The browser live-reloads. Repeat until you end the session.
5. The agent shuts the server down.

See [Workflow](Workflow.md) for the full loop and [Annotation
Format](Annotation-Format.md) for the shape of the queue.

---

## The review server

`/speckit.axi` drives a small Node tool that ships with the extension at
`templates/axi-web/axi-server.mjs`. It uses only the Node standard library
(zero dependencies) and binds only to `127.0.0.1`. You never call these
subcommands by hand; the agent does, while you stay in the browser. They are
documented here so you understand what the agent is doing.

| Subcommand                      | Purpose                                                             |
| ------------------------------- | ------------------------------------------------------------------- |
| `start <feature-dir>`           | Open or reuse a session and launch the browser.                     |
| `poll <feature-dir>`            | Block until the reviewer clicks Send, then print the queue as TOON. |
| `reply <feature-dir> "message"` | Show a one-line message to the reviewer in the browser.             |
| `end <feature-dir>`             | End the session. The next poll returns the ended state.             |
| `stop [feature-dir]`            | Shut the server down. With no argument, stops every running server. |

The CLI is `node templates/axi-web/axi-server.mjs <subcommand>`. Run it with no
arguments to list active sessions, or any subcommand with `--help` for its
flags and examples.

### `start` flags

| Flag        | Effect                                      |
| ----------- | ------------------------------------------- |
| `--port N`  | Bind to a fixed port. Default: an open one. |
| `--no-open` | Do not open the browser.                    |

### Exit codes

The CLI follows the AXI conventions: TOON on stdout, diagnostics on stderr.

| Code | Meaning           |
| ---- | ----------------- |
| `0`  | Success or no-op. |
| `1`  | Error.            |
| `2`  | Usage error.      |

### Common error messages

These print as `error: <message>` on stdout with `help[n]:` follow-up lines.

| Message                               | Cause                                                     | Fix                                                       |
| ------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| `not a directory: <path>`             | The feature directory does not exist.                     | Pass an existing `specs/*` directory.                     |
| `the review server did not start`     | The server process failed to come up within five seconds. | Retry `start`. See [Troubleshooting](Troubleshooting.md). |
| `no review session is running`        | `poll`, `reply`, or `end` ran with no live server.        | Run `start` first.                                        |
| `lost contact with the review server` | The server stopped while a poll was waiting.              | Run `start` again.                                        |

## Session state

The server keeps its state under `.speckit-axi/` in your project, one
directory per feature (`<feature-basename>-<hash>/`) holding `server.json` and
`queue.json`. The annotation queue lives there; it never leaves your machine.
`.speckit-axi/` is local working state, not something you commit.
