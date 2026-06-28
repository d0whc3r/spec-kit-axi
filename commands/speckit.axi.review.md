---
description: "Open a feature's spec-kit markdown in a browser review surface, collect the reviewer's annotations and comments, then apply the queued feedback to the files."
---

# Axi

`/speckit.axi.review` opens a human-friendly review surface for the active feature's
markdown artifacts. The reviewer reads the rendered documents, selects text to
annotate, and chats comments. You (the agent) receive the queued feedback and
edit the canonical `.md` files, while the browser live-reloads so the reviewer
sees each change.

The review tool ships with this extension at `web-review/axi-server.mjs`
(Node, zero dependencies, loopback only). Follow the playbook in
`templates/axi-template.md` when applying feedback.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). Treat it
as the feature directory to review, or as a hint for resolving it.

## Outline

The `axi` CLI is `node web-review/axi-server.mjs`. Run these steps.

### 1. Resolve the feature directory

Pick the directory that holds the feature's markdown (`spec.md`, `plan.md`, and
whatever else was generated):

1. If the user named a path, use it.
2. Else use the `specs/` subdirectory that matches the current git branch.
3. Else, if there is exactly one `specs/*` directory, use it.
4. Else use the most recently modified `specs/*` directory.
5. If it is still unclear, ask the user.

### 2. Launch the review surface

Run `node web-review/axi-server.mjs start <feature-dir>`. It opens the
browser and prints the URL and the discovered artifacts. Tell the reviewer the
surface is ready and that they can annotate and send notes.

### 3. Review loop

Repeat until the session ends:

1. Run `node web-review/axi-server.mjs poll <feature-dir>`. It blocks
   until the reviewer clicks Send, then prints the queued notes as TOON.
2. If the output says the reviewer ended the session, leave the loop.
3. Otherwise apply each note to the canonical markdown:
   - `anno`: open `file`, find the verbatim `quote` under `heading` (use
     `occurrence` to disambiguate duplicates), and act on the reviewer's `note`.
   - `chat`: apply the `note` as feedback across the relevant documents.
     Preserve each document's structure and style. Change only what the notes ask.
4. Run `node web-review/axi-server.mjs reply <feature-dir> "<summary>"`
   with a one-line summary of what you changed. The browser live-reloads.
5. Poll again for the next round.

### 4. Finish

When the review is done, shut the server down with
`node web-review/axi-server.mjs stop <feature-dir>`.

If you are ending the review yourself (the reviewer asked you to stop rather than
ending it in the browser), first run
`node web-review/axi-server.mjs end <feature-dir>` so the browser shows the
session as ended, then run `stop`.

## Output

This command does not generate a new file. It edits the feature's existing
markdown in place, driven by the reviewer's queued annotations, and reports a
short summary of each applied round.
