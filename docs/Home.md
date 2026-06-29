# Axi Extension Wiki

Axi turns a feature's spec-kit markdown into a human-friendly review surface in
the browser. The reviewer reads the rendered documents, selects text to
annotate, and sends notes. The agent applies them to the canonical `.md` files
while the page live-reloads to show each change. Markdown stays the source of
truth, and the reviewer's notes never leave the machine.

## Start here

| Page                                      | When to read                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| [Getting Started](Getting-Started.md)     | First install, zero to your first browser review in five minutes.          |
| [Commands](Commands.md)                   | Deep reference for `/speckit.axi.review` and the review server it drives.  |
| [Workflow](Workflow.md)                   | How a review flows: feature resolution, the annotate and apply loop.       |
| [Examples](Examples.md)                   | A worked review session: a queue of notes and the edits it produces.       |
| [Annotation Format](Annotation-Format.md) | The TOON queue the reviewer sends and how each field maps to an edit.      |
| [Troubleshooting](Troubleshooting.md)     | Server, browser, port, and offline issues, with their fixes.               |
| [FAQ](FAQ.md)                             | Conceptual questions and design rationale.                                 |
| [Architecture](Architecture.md)           | How it works at runtime: the technology stack and how information travels. |

## The command at a glance

| Command               | What it does                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `/speckit.axi.review` | Open a feature's markdown in a browser review surface, collect annotations, and apply the notes. |

`/speckit.axi.review` takes an optional feature directory, for example
`/speckit.axi.review specs/001-my-feature`. Without one, the agent resolves the
feature from your git branch or the most recent `specs/*` directory. The
command does not generate a new file; it edits the feature's existing markdown
in place.

## Source of truth

The feature's `.md` files are canonical. Axi renders them for review and the
agent edits them in place, driven by the reviewer's queued notes. It never
writes a derived copy, and the annotation queue stays local under
`.speckit-axi/` in your project. When you end the session, the local server
shuts down and your markdown is left updated, nothing else touched.

## External links

- Repository: <https://github.com/d0whc3r/spec-kit-axi>
- Issues: <https://github.com/d0whc3r/spec-kit-axi/issues>
- Discussions: <https://github.com/d0whc3r/spec-kit-axi/discussions>
- Spec Kit core: <https://github.com/github/spec-kit>
