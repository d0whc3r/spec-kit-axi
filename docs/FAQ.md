# Frequently Asked Questions

## Why does `specify extension add axi` fail with a catalog error?

If you see `'axi' is available in the 'community' catalog but installation is
not allowed from that catalog`, that is expected. Spec Kit ships the community
catalog as discovery only (`install_allowed: false`), so it can list the
extension but will not install it until you opt in.

The quickest fix is a direct install:

```bash
specify extension add axi --from \
  https://github.com/d0whc3r/spec-kit-axi/releases/download/v1.1.2/axi-1.1.2.zip
```

To install and update by name instead, approve the community catalog once. See
[Troubleshooting](Troubleshooting.md#installation-errors) for both paths in
full.

## Why does this extension exist?

Reviewing a spec in a chat window is awkward. You paste line ranges, describe
where you mean, and hope the agent edits the right place. Axi turns the
feature's markdown into a page you can read and mark up directly, so feedback
is anchored to the exact text and the agent applies it without guessing.

## Will it change my files?

Yes, but only the feature's markdown you are reviewing, and only as your queued
notes direct. The agent edits the canonical `.md` files in place and the page
live-reloads. It never writes a derived copy, and your notes stay on your
machine.

## Do I need an internet connection?

Yes, to render the pages. The renderer (`marked`, `DOMPurify`, and `mermaid`)
loads from a pinned CDN, so a plain visit needs internet; offline, the surface
shows a notice. The markdown and your notes never leave your machine; only the
renderer comes from the CDN.

## Which files does it open?

Every `.md` file in the feature directory, including nested ones such as
`contracts/`. Known names (`spec.md`, `plan.md`, `tasks.md`, `constitution.md`,
`research.md`, `data-model.md`, `quickstart.md`) sort first; the rest follow
alphabetically. Dotfiles and `node_modules` are skipped.

## Is it safe? What does the server expose?

The review server binds only to `127.0.0.1`, so it is reachable only from your
own machine. It serves the feature's markdown and the review page, and accepts
your queued notes. The notes and session state live under `.speckit-axi/` in
your project. Nothing is sent to a remote service except the renderer fetched
from the CDN.

## What is TOON?

TOON is the compact tabular format the server uses to hand your queue to the
agent on `poll`. It is cheaper for the agent to read than JSON. You never write
it by hand. See [Annotation Format](Annotation-Format.md) for the full shape.

## What is the difference between an annotation and a comment?

An annotation (`anno`) is anchored to text you selected: it carries the file,
the nearest heading, and the verbatim quote, so the agent edits the exact spot.
A comment (`chat`) is a general remark with no anchor, applied as feedback
across the relevant documents.

## Does the extension run by itself?

No. The command is a markdown prompt that needs a Spec Kit-aware assistant to
resolve and execute it. The review surface is a zero-dependency Node tool the
assistant launches with `node`; it binds only to `127.0.0.1` and has no runtime
of its own beyond Node.

## Can I run more than one review at a time?

Yes. The server keys each session by feature directory, so several can run at
once, each on its own port. Run the CLI with no arguments to list active
sessions, or `stop` with no argument to shut them all down.

## How do I end a session?

End it from the browser, or ask the agent to stop. The agent shuts the local
server down. Starting another review reopens the surface for whatever feature
you point it at.

## How do I update the extension?

If you approved the community catalog, run `specify extension update axi`.
Otherwise rerun the direct install with the newer release URL. Your `specs/`
tree is not touched.

## Where do I report a bug or ask a question?

| You want to                         | Use                                                                |
| ----------------------------------- | ------------------------------------------------------------------ |
| Report a bug in this extension      | [Issues](https://github.com/d0whc3r/spec-kit-axi/issues)           |
| Ask a usage question or share a tip | [Discussions](https://github.com/d0whc3r/spec-kit-axi/discussions) |
| Report a security vulnerability     | Private reporting, see [SECURITY.md](../SECURITY.md)               |
| Report an issue in Spec Kit core    | [github/spec-kit](https://github.com/github/spec-kit/issues)       |
