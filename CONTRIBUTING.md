# Contributing to the Axi Extension

Thanks for considering a contribution. This repository hosts a single Spec Kit extension (`axi`) that ships as a release zip and a catalog entry.

## Repo Layout

The repo root IS the extension root, per the canonical Spec Kit extension layout. The release pipeline packages only the extension's runtime surface into the zip (`extension.yml`, `README.md`, `LICENSE`, `commands/**`, `templates/**`; see the `INCLUDE` list in `.github/scripts/build-zip.mjs`).

- `extension.yml`, `README.md`, `LICENSE`, `CHANGELOG.md` at the repo root.
- `commands/` holds the canonical command prompt. `templates/web-review/` holds the review runtime that `pnpm review:build` compiles from `web-review/src/`. The runtime is gitignored build output, and the zip ships it.
- `catalog.json` is the single-entry catalog file. CI updates the pipeline-owned fields (`version`, `download_url`, `requires`, `updated_at`, `created_at`) on every release. `requires` is copied from `extension.yml`, so edit it there.
- `.github/workflows/release.yml` is the release pipeline.
- `.github/scripts/` holds pipeline helpers (`validate-manifest.mjs`, `build-zip.mjs`, `sync-metadata.mjs`, `lint-content.mjs`).
- `docs/` is the user-facing wiki source; `web/` is the GitHub Pages site.

## Developer Install (Self-Dogfood)

To dogfood the extension on this repo or any other Spec Kit project, run from the cloned repo:

```bash
pnpm review:build
specify extension add --dev "$(pwd)"
```

The CLI installs the extension under `.specify/extensions/axi/` of the target project and registers it. `.extensionignore` limits the copy to the files the release zip ships. After each change, re-run the install with `--force` to overwrite the installed copy.

## Iterating on the Commands

The slash command is a markdown prompt at `commands/speckit.axi.review.md`. Edit it, then dogfood:

1. Run `/speckit.axi.review <feature-dir>` against a real feature directory. `web-review/test/fixtures/specs/001-sample` works.
2. Annotate a phrase and add a chat comment in the browser, then click **Send**.
3. Check that `poll` prints both notes, the agent edits the quoted text under the right heading, and the `reply` summary shows in the browser.
4. End the session in the browser. Check that the next `poll` reports the ended session and the agent runs `stop`.

## Local Pipeline Checks

Before opening a PR, run:

```bash
pnpm run check        # validate + sync:check + lint + lint:content
```

To exercise the build path locally (requires `zip` and `unzip`):

```bash
node .github/scripts/build-zip.mjs
ls dist/
```

## Cutting a Release

Releases are automatic. The `release` workflow at `.github/workflows/release.yml` runs `pnpm run release` (semantic-release) on every push to `main`. Conventional Commits drive the next version, changelog, and tag.

1. Write commits using [Conventional Commits](https://www.conventionalcommits.org/). Examples:
   - `fix: ...` triggers a patch bump.
   - `feat: ...` triggers a minor bump.
   - A `BREAKING CHANGE:` footer in the commit body triggers a major bump. The default angular preset ignores a `feat!:` header.
   - `chore:`, `docs:`, `refactor:`, `test:`, `ci:` do not trigger a release.
2. Land your work on `main` with CI green. The release workflow fires on push.
3. `semantic-release` runs the plugin chain in `.releaserc.json`:
   - Determine the next version from commits since the last tag.
   - Generate release notes and prepend them to `CHANGELOG.md`.
   - Run `.github/scripts/semantic-release-prepare.mjs <version>` to bump `extension.yml` and `package.json`, refresh the direct-install URLs and the website version, build the zip, and update `catalog.json`.
   - Commit `chore(release): catalog v<version>` as `github-actions[bot]` with the files in the `assets` list of `.releaserc.json`.
   - Create tag `v<version>`, publish a GitHub Release, and attach `dist/axi-<version>.zip`.
4. After a release, the workflow adds install notes to the GitHub Release, publishes the wiki, and runs `.github/scripts/submit-catalog-update.mjs`. That script renders the `[Extension Submission]` document and uploads it as the `upstream-catalog-issue` artifact (see **Community Catalog Submission** below).
5. If no commits since the last tag qualify, semantic-release exits cleanly and nothing is released. Push another qualifying commit to trigger a release.
6. To rehearse the version decision locally without publishing:
   ```bash
   pnpm install
   pnpm release:dry
   ```

Re-tagging an already-released version is not supported. Push a qualifying commit so the next patch version is cut.

### Community Catalog Submission

The release pipeline keeps the community catalog at `github/spec-kit` in sync by preparing a submission issue for each release. Filing it is manual: automatic `gh issue create` against the upstream repo proved unreliable, so CI renders the issue as a document and you file it by hand.

**What runs on each release:**

`.github/scripts/submit-catalog-update.mjs` queries the upstream `catalog.community.json`. If `axi` is present the document targets `[Extension]: Update Axi Extension to vX.Y.Z`; if absent it targets `[Extension]: Add Axi Extension`. The rendered markdown is uploaded as the `upstream-catalog-issue` workflow artifact, retained for 7 days. No token is required.

**Filing the issue:**

1. Open the finished `release` run in Actions and download the `upstream-catalog-issue` artifact.
2. Follow the **How to file this issue** steps at the top of the document: open the [Extension Submission form](https://github.com/github/spec-kit/issues/new?template=extension_submission.yml), set the title, and copy each form field from the document's **Issue body** section.

To regenerate the document for an already-released tag, run the script locally with that tag (see below). There is no manual CI trigger; the document is only produced automatically by the `release` workflow.

To rehearse locally:

```bash
VERSION=<x.y.z>  # replace with the version you want to rehearse
GITHUB_REPOSITORY=d0whc3r/spec-kit-axi OUTPUT_FILE=/tmp/issue.md \
  node .github/scripts/submit-catalog-update.mjs "$VERSION" patch "v${VERSION}"
cat /tmp/issue.md
```

## Publishing the Documentation Wiki

The user-facing docs live in `docs/` and are published to the project's
GitHub Wiki. The wiki is a separate git repo at
`https://github.com/d0whc3r/spec-kit-axi.wiki.git`. GitHub renders
`_Sidebar.md` and `_Footer.md` as navigation chrome, and wiki pages are
flat (no nested folders).

**Automatic sync.** `.github/workflows/sync-wiki.yml` runs
`.github/scripts/stage-wiki.mjs` to stage `docs/*.md` into `.wiki-staging/`,
then publishes that staging dir to the wiki on every push to `main` that
touches `docs/`. It can also be triggered manually from the Actions tab.

The staging script:

- Excludes `docs/README.md` (repo-only meta-doc).
- Strips `.md` from intra-wiki links (`[Commands](Commands.md)` ->
  `[Commands](Commands)`) since GitHub Wiki does not resolve the extension.
- Rewrites `../FILE.md` parent-dir links to absolute repo URLs so they keep
  working from the wiki.

To rehearse the staged output locally:

```bash
node .github/scripts/stage-wiki.mjs docs .wiki-staging
ls .wiki-staging/
```

GitHub does not create the `.wiki.git` repo until the wiki has at least one
page. Before the first sync, enable Wikis under Settings -> Features, then
create any placeholder page from the UI. After that the workflow can push
unattended.

Keep `docs/` strictly user-facing (how to use the extension and how it
works). Contributor and tooling topics belong in this file, not the wiki.
The `maintain-docs` skill under `.agents/skills/` enforces that split.

## Branch Naming

Use feature branches named `NNN-short-description` (sequential numbering).

## Style Rules for Shipped Content

Write the shipped command prompt (`commands/speckit.axi.review.md`) in plain English and active voice. `.github/scripts/lint-content.mjs` enforces these rules on it:

1. No em dash character.
2. No banned AI-tell phrases (the `BANNED_PHRASES` list in the script).
3. The file passes `oxfmt --check`.

Write every Spec Kit command name in the prompt as a token, for example `__SPECKIT_COMMAND_AXI_REVIEW__` or `__SPECKIT_COMMAND_PLAN__`. Spec Kit replaces it at install time with the agent's form (`/speckit.axi.review` or `/speckit-axi-review`). Check the installed file after `specify extension add --dev`.

The command edits only the feature's markdown, and only as the reviewer's notes direct. Keep that boundary when you change the prompt. If you change these rules, update the command prompt and the lint script in the same commit.

## Reporting Issues

Open a GitHub issue with: the extension version (`grep version extension.yml`), the Spec Kit version, the slash command invocation, and the resulting refusal or the diff between actual and expected output.
