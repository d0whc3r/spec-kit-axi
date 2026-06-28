# Axi Template

Reference for `/speckit.axi.review`: the shape of the feedback the review surface
returns, and how to apply it to the canonical markdown. The command file is
`commands/speckit.axi.review.md`; the review tool is `templates/axi-web/axi-server.mjs`.

## Annotation format

`poll` prints the reviewer's queue as TOON. Each row is one note:

```text
session: specs/001-feature
queue[2]{kind,file,heading,occurrence,quote,note}:
  anno,spec.md,Goals,0,must be fast,"quantify, target ms?"
  chat,-,-,0,-,tighten the scope section
```

- `kind`: `anno` (anchored to selected text) or `chat` (a general comment).
- `file`: the artifact the note targets (`-` for chat).
- `heading`: the nearest heading above the selection (`-` for chat).
- `occurrence`: 0-based index when the same quote appears more than once.
- `quote`: the verbatim selected text, your search key into the source.
- `note`: what the reviewer wants.

An empty round prints `queue: 0 items`. When the reviewer ends the session, the
line says so, and you should stop the loop.

## Template

Per review round, for each note:

1. `anno`: open `file`, locate the verbatim `quote` under `heading` (use
   `occurrence` to pick the right duplicate), and apply the `note`.
2. `chat`: apply the `note` as feedback across the relevant documents.
3. Keep each document's structure, headings, and style. Change only what the
   notes ask for. Markdown stays the source of truth.
4. After editing, run `reply <feature-dir> "<summary>"` so the reviewer sees a
   one-line summary, then `poll` again for the next round.
