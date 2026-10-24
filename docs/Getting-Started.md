# Getting Started

Five minutes from zero to a markdown review in your browser.

## Prerequisites

- Spec Kit `>= 0.12.17` initialized in your project. Verify with:
  ```bash
  specify --version
  ls .specify
  ```
- A Spec Kit-aware assistant that can resolve slash commands.
- Node.js 22 or later on your `PATH`. The review surface runs with `node` and
  has no install step.
- A feature directory under `specs/` with some markdown to review (at least a
  `spec.md`).
- A browser and an internet connection. The renderer loads from a pinned CDN,
  so the pages need internet; offline, the surface shows a notice.

If you do not have a Spec Kit project yet:

```bash
specify init my-project
cd my-project
```

## Step 1: Install the extension

Install a release from its download URL:

```bash
specify extension add axi --from \
  https://github.com/d0whc3r/spec-kit-axi/releases/download/v2.0.0/axi-2.0.0.zip
```

Spec Kit shows the source URL and asks you to confirm. Change the version in the URL to pin a different release.

To see the catalog entry first, run `specify extension search axi` or `specify extension info axi`. Install by name (`specify extension add axi`) does not work. Spec Kit lists community extensions in a discovery-only catalog and does not install from it. Spec Kit also advises against setting that catalog to `install_allowed`. See [Troubleshooting](Troubleshooting.md#installation-errors).

To update later, run the install command with a newer release URL and add `--force`:

```bash
specify extension add axi --from <newer-release-zip-url> --force
```

Confirm install:

```bash
cat .specify/extensions/.registry        # 'axi' entry should be present
ls .specify/extensions/axi               # extension files present
```

## Step 2: Have a feature to review

The command reviews whatever markdown a feature directory already holds. If you
do not have one yet, create it with the Spec Kit core commands first:

```text
/speckit.specify
/speckit.plan
```

When `/speckit.specify` finishes, the optional `after_specify` hook offers to open `spec.md` in the review surface. When `/speckit.plan` finishes, the optional `after_plan` hook offers to open `plan.md` and the other plan artifacts. Accept the offer to skip Step 3, or run the command yourself.

Any `.md` under the feature directory is fair game: `spec.md`, `plan.md`,
`tasks.md`, and nested files such as `contracts/`.

## Step 3: Open the review surface

Run the command in your assistant. Name the feature directory, or let the agent
resolve it from your branch:

```text
/speckit.axi.review specs/001-my-feature
```

Skills-based agents show the command under another name: `/speckit-axi-review` in Claude Code, `$speckit-axi-review` in Codex.

The agent starts a local review server bound to `127.0.0.1`, opens your
browser, and tells you the surface is ready. Each markdown file shows up as a
tab, rendered with tables and mermaid diagrams.

## Step 4: Annotate and send

In the browser:

1. Select any phrase to attach a note. Axi records the file, the nearest
   heading, and the exact text you picked, so the agent edits the right spot.
2. Or type a general comment in the composer for feedback that spans documents.
3. Notes collect in the Notes panel. Edit or remove any before sending.
4. Click **Send**. The whole queue goes to the agent.

The agent edits the canonical `.md` files, posts a one-line summary of what
changed, and the document live-reloads in place. Keep reviewing for as many
rounds as you need.

## Step 5: Finish

End the session from the browser when you are done, or ask the agent to stop.
The agent shuts the local server down. Your markdown is updated in place;
nothing else is touched.

## Targeting a specific feature

Pass the directory as the command argument:

```text
/speckit.axi.review specs/002-some-other-feature
```

Without an argument the agent picks the feature that Spec Kit marks as active (`.specify/feature.json`), then the directory that matches your git branch, the one `specs/*` directory if there is exactly one, or the most recently modified `specs/*` directory. If it is still unclear, it asks.

## What next

- Read [Commands](Commands.md) for the full reference of the command and the
  review server it drives.
- Read [Workflow](Workflow.md) to see the review loop end to end.
- Read [Examples](Examples.md) for a worked session.
- When something refuses to run, jump to [Troubleshooting](Troubleshooting.md).
