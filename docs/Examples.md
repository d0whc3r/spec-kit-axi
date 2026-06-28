# Examples

A worked review session. The fictional feature is **bulk export of dashboards
to PDF** in a fictional product called Lumen. We open its `spec.md` in the
browser, leave two notes, and watch the agent apply them.

## The document under review: `spec.md` (excerpt)

The reviewer opens `/speckit.axi.review specs/001-bulk-export` and reads the rendered
`spec.md`. One section looks like this:

```markdown
## Goals

- The export must be fast.
- Users can select many dashboards and export them in one action.

## Out of scope

- Scheduled recurring exports.
- Live-data PDFs. v1 is a snapshot at export time.
```

## Leaving notes

The reviewer does two things in the browser:

1. Selects the phrase **must be fast** under the Goals heading and attaches the
   note: `quantify, target ms?`
2. Types a general comment in the composer: `tighten the scope section`

Both land in the Notes panel. The reviewer clicks **Send**.

## What the agent receives

The agent's `poll` unblocks and prints the queue as TOON:

```text
session: specs/001-bulk-export
queue[2]{kind,file,heading,occurrence,quote,note}:
  anno,spec.md,Goals,0,must be fast,"quantify, target ms?"
  chat,-,-,0,-,tighten the scope section
```

The first note is an `anno`: anchored to the exact text under a heading. The
second is a `chat`: a general comment with no anchor. See
[Annotation Format](Annotation-Format.md) for the field meanings.

## What the agent does

For the `anno`, the agent opens `spec.md`, finds **must be fast** under
**Goals**, and rewrites that bullet to quantify the target:

```markdown
## Goals

- Inline export completes in under 15 seconds at the 95th percentile for 50 dashboards.
- Users can select many dashboards and export them in one action.
```

For the `chat`, the agent tightens the Out of scope section across the
document, keeping its structure and style:

```markdown
## Out of scope

- Scheduled or recurring exports.
- Live-data PDFs. v1 is a snapshot at export time.
```

It edits `spec.md` in place. No derived copy is written.

## The reply and live-reload

The agent runs `reply` with a one-line summary:

```text
reply: delivered to the reviewer
```

The browser shows the summary in chat (for example "Quantified the speed goal
and tightened Out of scope") and the rendered `spec.md` live-reloads to show
both edits. The reviewer reads the result and either sends another round or ends
the session.

## Ending the session

The reviewer ends the session from the browser. The agent's next `poll`
returns:

```text
session: specs/001-bulk-export
queue: 0 items - the reviewer ended the session
```

The agent runs `stop`, the local server shuts down, and `spec.md` is left with
the two edits applied.
