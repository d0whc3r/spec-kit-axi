# Coverage Map

For each user-facing page, the canonical sources it documents and the
specific facts it asserts. Use this in Phase 2 of `maintain-docs` to
figure out which sources to re-check when a page is suspected of drift.

The reverse direction (canonical file → which pages depend on it) is at
the bottom.

Only user-facing pages appear here. Contributor and tooling docs
(`CONTRIBUTING.md`, `AGENTS.md`/`CLAUDE.md`) are out of this skill's
scope and are intentionally absent.

## Wiki pages

### `docs/Home.md`

Documents: the extension purpose, the command at a glance, the
reading order, the source-of-truth contract.

Asserts:

- Extension purpose paragraph (matches `README.md` lead and
  `extension.yml.extension.description`).
- The "Command / What it does" table (must be
  byte-equivalent to the same table in `README.md`).
- The links to every other wiki page.
- The source-of-truth contract: the agent edits the feature's `.md` files
  in place, never writes a derived copy, and the annotation queue stays
  local under `.speckit-axi/`.

Re-check whenever: a command is added or removed; the description in
`extension.yml` changes; a wiki page is added or removed.

### `docs/Getting-Started.md`

Documents: install, first run, basic usage.

Asserts:

- Spec Kit version requirement (must match `extension.yml.requires.speckit_version`).
- Install URL with pinned version (must match
  `extension.yml.extension.version` and `catalog.json.version`).
- The command, its optional feature-directory argument, and what it
  edits.
- The prerequisites: Node.js on `PATH`, a browser, and an internet
  connection for the CDN-loaded renderer.

Scope rule: this page covers the user install paths (direct install from
the release URL and the approved community catalog). It does not cover
the dev install (`specify extension add --dev`); that is a contributor
step and lives in `CONTRIBUTING.md`.

Re-check whenever: version bumps; install paths change;
`/speckit.axi.review` behavior changes.

### `docs/Commands.md`

Documents: the command in full, plus the review server it drives.

Asserts:

- One section per command in `commands/`.
- The "Reads" and "Writes" lines must match the command file body: reads
  every `.md` in the feature directory, writes the same files edited in
  place, no derived copy.
- The feature-resolution order matches the command file.
- The review server table (subcommands `start`, `poll`, `reply`, `end`,
  `stop`), the `start` flags (`--port`, `--no-open`), the exit codes
  (`0`, `1`, `2`), and the common error messages table match the review
  server source under `web-review/src/server/`.
- The session state layout under `.speckit-axi/` matches what the server
  writes (`server.json`, `queue.json`, one directory per feature).

Re-check whenever: any file under `commands/` changes; the review server
CLI surface under `web-review/src/server/` changes.

### `docs/Workflow.md`

Documents: the input/output flow and the annotate-and-apply loop.

Asserts:

- The review loop: `start` opens the browser, the reviewer queues notes,
  Send unblocks the agent's `poll`, the agent edits and runs `reply`,
  the browser live-reloads, and ending the session leads to `stop`.
- The feature-resolution order (same list as `docs/Commands.md`).
- The file discovery and sort order (known names first: `spec.md`,
  `plan.md`, `tasks.md`, `constitution.md`, `research.md`,
  `data-model.md`, `quickstart.md`; the rest alphabetical).
- The ending rules: ending in the browser leads the next `poll` to
  return the ended state; an agent-initiated stop runs `end` first.

Re-check whenever: the command file changes the loop; the server's file
discovery or session lifecycle changes.

### `docs/Examples.md`

Documents: a worked review session and the edits it produces.

Asserts:

- The TOON queue excerpt matches the shape the server prints on `poll`
  (the `queue[N]{kind,file,heading,occurrence,quote,note}:` header, `-`
  for absent fields, the ended line).
- The review loop shown matches `docs/Workflow.md`.

Re-check whenever: the TOON queue shape or the review loop changes. The
example bodies are illustrative and do not need byte-exact match, but
field names, ordering, and presence must match what the server prints.

### `docs/Annotation-Format.md`

Documents: the TOON queue the reviewer sends and how each field maps to
an edit.

Asserts:

- The field list (`kind`, `file`, `heading`, `occurrence`, `quote`,
  `note`) and the two note kinds (`anno`, `chat`) match what the server
  emits on `poll`.
- The quoting and escaping rules (double quotes, doubled inner quotes,
  `\n` for newlines) match the server's TOON encoder.
- The empty-queue and ended-session lines match the server's output.

Re-check whenever: the server's TOON encoding or queue fields change.

### `docs/Troubleshooting.md`

Documents: install errors, server and browser breakages, and their
fixes.

Asserts:

- The installation-errors section (the community catalog
  `install_allowed: false` case), matching the install paths in
  `README.md`, with a pinned install URL that matches the current
  version.
- Each CLI error message the review server can print, with the same
  meaning and a working fix, matching the error table in
  `docs/Commands.md`.
- The `stop` invocations for shutting servers down match the CLI.

Re-check whenever: the install paths change; the server adds or renames
an error message.

### `docs/FAQ.md`

Documents: conceptual questions and design rationale, from the user's
point of view.

Asserts: rationale that may reference the source-of-truth contract, the
loopback-only server, the CDN-loaded renderer, or the TOON queue. The
direct-install answer carries a pinned install URL that must match the
current version. Drift here is rare; most edits are additive.

Re-check whenever: a frequently asked question surfaces in issues that
is not yet covered; the behavior the FAQ describes changes; the version
bumps.

### `docs/Architecture.md`

Documents: how the extension works at runtime, for a user who wants to
understand what happens when they run the command.

Scope rule: this page is "how it works", not "how it ships". It covers
the two parts (the markdown command and the Node review server), the
invocation flow, how information travels (HTTP endpoints, the SSE
stream, the TOON queue), rendering, and the source-of-truth contract.
It does **not** cover the repo source tree, the build of the shipped
runtime, the release pipeline, `semantic-release`, CI, or repo
governance. Those are contributor concerns in `CONTRIBUTING.md`. It also
does not name specific assistants; refer generically to "the host agent"
when needed.

Asserts:

- The runtime invocation flow (command → `start` → browser → `poll` →
  edits → `reply` → `stop`) matches the command file and the server.
- The endpoint and event names (`/api/manifest`, `/api/queue`,
  `/api/send`, `/api/events`, `/api/poll`, `/api/reply`) match the
  server source.
- The source-of-truth contract matches what the command enforces (the
  agent edits the feature's `.md` files in place; state under
  `.speckit-axi/` is local working state).

Re-check whenever: the command's flow changes; the server's endpoints or
events change.

### `docs/_Sidebar.md`

Documents: wiki navigation.

Asserts: one bullet per wiki page that exists, in reading order, plus
external links (Repo / Issues / Discussions, and a Contributing link that
points to `CONTRIBUTING.md` at the repo root by absolute URL).

Re-check whenever: a wiki page is added or removed; the repo URL changes.

### `docs/_Footer.md`

Documents: a footer line for the wiki.

Asserts: a link back to the repo, to Spec Kit core, and to the license.
Rarely changes.

### `docs/README.md`

Repo-only meta-doc about the `docs/` folder (excluded from the published
wiki). Maintain only its reading-order link list so it matches the pages
that exist, and its editing voice rules. The wiki-publishing mechanics
(the sync workflow) are tooling and live in `CONTRIBUTING.md`, not here.

Re-check whenever: a wiki page is added or removed.

## Root markdown

### `README.md`

Documents: the same things `docs/Home.md` documents plus install and
quickstart. The repo's front door.

Asserts:

- Description paragraph (must match `extension.yml.extension.description`
  in intent).
- The "Command / What it does" table (must be
  byte-equivalent to `docs/Home.md`).
- Install paths and pinned version (must match `extension.yml.extension.version`).
- Links to every `docs/*.md` page that exists (as wiki URLs).
- A single Contributing pointer to `CONTRIBUTING.md` at the repo root.

Re-check whenever: command count changes; version bumps; a wiki page is
added.

### `WORKFLOW.md`

Documents: the canonical usage narrative. Longer-form than
`docs/Workflow.md`, still written for the user running the command.

Asserts: same flow as `docs/Workflow.md` but with more context, plus the
CLI subcommand table. Treat the two as a long/short pair. When
`docs/Workflow.md` updates, `WORKFLOW.md` may also need an update.

Re-check whenever: `docs/Workflow.md` changes; the subcommands change.

### `CHANGELOG.md`

Documents: per-version change log.

Asserts: top entry version matches `extension.yml.extension.version`
(unless an `[Unreleased]` block is open).

Re-check whenever: the version bumps. The release pipeline edits this
file; the skill only verifies the top entry version is consistent and
does not edit it unless explicitly asked.

## Website

### `web/index.html`

Documents: the public, short front door to the extension. A single page
covering the purpose, the command, the review loop, getting started,
install help, and a FAQ subset. Deployed to GitHub Pages.

Asserts:

- The hero purpose paragraph (matches `extension.yml.extension.description`
  and the `README.md` lead).
- The version: the header version badge, the pinned install snippets,
  and the JSON-LD `softwareVersion` (all must match
  `extension.yml.extension.version`).
- The hero badges: command count, `Requires Spec Kit >= 0.2.0`, license.
- The command (same command name and what it does as
  `docs/Home.md`; HTML form, not byte-equivalent).
- The review server path
  (`.specify/extensions/axi/templates/web-review/axi-server.mjs`) and the
  subcommand table (matching `docs/Commands.md`).
- The install-help section (the community catalog error and both opt-in
  paths, matching `docs/Troubleshooting.md`).
- The FAQ entries (a subset of `docs/FAQ.md`; must not contradict it).
- The repository, wiki, issues, and discussions links.

Edit content only. Do not restyle `web/src/styles.css` or rewrite
the TypeScript under `web/src/`. `web/README.md` is a repo-only meta-doc
about the folder, maintained like `docs/README.md`.

Re-check whenever: a command is added or removed; the description in
`extension.yml` changes; the version bumps; the server CLI surface
changes; an FAQ answer in `docs/FAQ.md` changes in a way the website
echoes.

## Out of scope (do not maintain as user docs)

- `CONTRIBUTING.md` — the contributor home: repo layout, dev install,
  pipeline checks, release procedure, catalog submission, style coupling,
  branch naming. User-facing pages link here for contributor questions;
  the skill does not edit it.
- `AGENTS.md` / `CLAUDE.md` — agent behavioral guidelines and repo
  governance, not user docs.
- `SECURITY.md`, `SUPPORT.md`, `CODE_OF_CONDUCT.md` — standard repo
  files. Leave alone unless explicitly asked.

## Canonical sources → pages that depend on them

Use this when you know which source changed and want to find every
user-facing page that might need a touch.

| Canonical file                              | Pages to re-check                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `extension.yml` (commands/version)          | `README.md`, `docs/Home.md`, `docs/Commands.md`, `docs/Getting-Started.md`, `docs/Troubleshooting.md`, `docs/FAQ.md`, `CHANGELOG.md`, `web/index.html` |
| `extension.yml.extension.description`       | `README.md`, `docs/Home.md`, `web/index.html`                                                                                                   |
| `catalog.json` (version, counts)            | `README.md`, `docs/Getting-Started.md`, `web/index.html`                                                                                        |
| `commands/speckit.axi.review.md`            | `docs/Commands.md`, `docs/Workflow.md`, `docs/Examples.md`, `docs/Getting-Started.md`, `docs/Architecture.md`, `WORKFLOW.md`, `web/index.html`   |
| `web-review/src/server/` (CLI, errors)      | `docs/Commands.md` (subcommands, flags, exit codes, error table), `docs/Troubleshooting.md`, `WORKFLOW.md`, `web/index.html`                    |
| `web-review/src/` (TOON queue shape)        | `docs/Annotation-Format.md`, `docs/Examples.md`                                                                                                  |
| `web-review/src/` (endpoints, events)       | `docs/Architecture.md`                                                                                                                           |
| `docs/FAQ.md` (echoed answers)              | `web/index.html` (FAQ subset)                                                                                                                    |
| New file at `docs/<Page>.md`                | `docs/Home.md`, `docs/_Sidebar.md`, `docs/README.md`, `README.md` (if linked there)                                                              |
