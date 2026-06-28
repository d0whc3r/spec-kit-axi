# Annotation Format

When you click **Send**, the review server hands the agent your queued notes as
TOON, a compact tabular format that is cheaper than JSON for the agent to read.
This page documents the shape of that queue and how each field maps to an edit.
You never write TOON by hand; the browser builds it from your annotations. It is
described here so you understand what the agent receives.

## The queue

A polled queue looks like this:

```text
session: specs/001-feature
queue[2]{kind,file,heading,occurrence,quote,note}:
  anno,spec.md,Goals,0,must be fast,"quantify, target ms?"
  chat,-,-,0,-,tighten the scope section
```

The header line `queue[N]{...}:` names the field order. Each following line is
one note. A `-` marks an absent field. Values that contain a comma, a quote, or
leading or trailing space are wrapped in double quotes, with inner quotes
doubled; newlines become a literal `\n` so each note stays on one line.

An empty round prints `queue: 0 items`. When you end the session, the line says
so and the agent stops the loop.

## The fields

| Field        | Meaning                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| `kind`       | `anno` for a note anchored to selected text, `chat` for a general comment.  |
| `file`       | The artifact the note targets. `-` for a `chat` note.                       |
| `heading`    | The nearest heading above the selected text. `-` for a `chat` note.         |
| `occurrence` | 0-based index when the same quote appears more than once in the file.       |
| `quote`      | The verbatim selected text. This is the agent's search key into the source. |
| `note`       | What you want changed.                                                      |

## Two kinds of note

### `anno`: anchored to text

You selected a phrase in a rendered document and attached a note. The browser
captures the verbatim text you picked, the file it came from, and the nearest
heading above it. The agent opens `file`, finds the verbatim `quote` under
`heading`, and applies your `note` there.

When the same phrase appears more than once in a file, `occurrence` (0-based)
tells the agent which one you meant, so the right duplicate gets the edit.

### `chat`: a general comment

You typed a comment in the composer that is not tied to a selection. Its `file`,
`heading`, and `quote` are all `-`. The agent applies the `note` as feedback
across the relevant documents.

## How the agent applies a round

For each note in the queue:

1. `anno`: open `file`, locate the verbatim `quote` under `heading` (use
   `occurrence` to pick the right duplicate), and apply the `note`.
2. `chat`: apply the `note` as feedback across the relevant documents.
3. Keep each document's structure, headings, and style. Change only what the
   notes ask for. Markdown stays the source of truth.

After editing, the agent runs `reply` with a one-line summary so you see what
changed, then polls again for the next round. See [Workflow](Workflow.md) for
the full loop and [Examples](Examples.md) for a worked round.
