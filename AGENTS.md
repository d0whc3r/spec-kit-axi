# AGENTS.md

This repo is the `axi` extension for [Spec Kit](https://github.com/github/spec-kit). It ships one command, `speckit.axi.review`, and two optional hooks that offer it: `after_specify` and `after_plan`. The command opens a feature's markdown in a local browser review surface. The reviewer annotates text and sends notes. The agent applies the notes to the `.md` files, and the browser live-reloads.

## Working rules

- State your assumptions. If a request is unclear, ask before you code.
- Write the minimum code that solves the problem. Add no speculative features or abstractions.
- Change only what the task needs. Match the existing style. Remove only the orphans that your change creates.
- Define a check for each change (a test, a script, a build), and run it before you finish.

## Commands

Run these from the repo root. The repo uses Node 24 (`.nvmrc`) and pnpm 12 (`packageManager`).

| Command                                        | What it does                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm install`                                 | Install the workspace (`web`, `web-review`).                                                        |
| `pnpm review:build`                            | Build the review runtime into `templates/web-review/`. Run it before `pnpm check` on a fresh clone. |
| `pnpm check`                                   | Validate the manifests, check metadata sync, run oxfmt and oxlint, and lint the shipped command.    |
| `pnpm test`                                    | Run the `web-review` unit test (`node --test`).                                                     |
| `pnpm web:build`                               | Build the GitHub Pages site into `web/dist/`.                                                       |
| `pnpm build`                                   | Build the release zip into `dist/`. Needs `zip` and `unzip`.                                        |
| `pnpm sync`                                    | Copy the identity fields from `package.json` into `extension.yml` and `catalog.json`.               |
| `specify extension add --dev "$(pwd)" --force` | Install this checkout into its own Spec Kit project. From another project, pass the checkout path.  |

CI (`.github/workflows/ci.yml`) runs `review:build`, `check`, `test`, and `web:build` on each pull request.

## Layout

| Path                             | Purpose                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `commands/speckit.axi.review.md` | The shipped command prompt.                                                                                                     |
| `web-review/src/`                | The review surface source. `core/` is shared logic, `server/` is the Node server and agent CLI, `scripts/` is the browser code. |
| `templates/web-review/`          | Build output of `web-review` (gitignored). The zip ships it, and it runs from `.specify/extensions/axi/templates/web-review/`.  |
| `extension.yml`, `catalog.json`  | The extension manifest and the catalog entry.                                                                                   |
| `docs/`, `web/`                  | The user docs (synced to the GitHub Wiki) and the landing site (GitHub Pages).                                                  |
| `.github/scripts/`               | Validation, sync, zip, and release scripts.                                                                                     |

## Conventions

- `package.json` owns the identity fields (description, author, homepage, repository, license, keywords). Edit them there, then run `pnpm sync`.
- The release pipeline owns `version`, `download_url`, the timestamps, and the pinned install URLs in the docs. Do not edit them by hand.
- `pnpm validate` fails when `requires` differs between `extension.yml` and `catalog.json`. Change both files together.
- A change to the command surface updates these files together: the command file, `provides.commands` in `extension.yml`, the `provides.commands` count in `catalog.json`, and the `REQUIRED` list in `.github/scripts/validate-manifest.mjs`.
- A change to the `hooks` block in `extension.yml` also updates the `provides.hooks` count in `catalog.json` and the hook lists in `README.md`, `WORKFLOW.md`, `docs/`, and `web/index.html`. `pnpm validate` checks the count.
- Renaming or removing the command is a breaking change. Use a `BREAKING CHANGE:` footer. The release preset (angular) ignores a `feat!:` header. Commits follow Conventional Commits, because semantic-release reads them.
- In `commands/`, write every Spec Kit command as a token, for example `__SPECKIT_COMMAND_AXI_REVIEW__` or `__SPECKIT_COMMAND_PLAN__`. At install time Spec Kit replaces it with `/speckit.axi.review` for slash-command agents or `/speckit-axi-review` for skills-based agents such as Claude Code. The token includes the `/`, so do not write a `/` before it. Tokens need Spec Kit `>=0.12.17`, the value of `requires.speckit_version`. User docs keep the readable names.
- Renovate (`renovate.json`) is the only dependency bot. Updates to `web-review/package.json` use `fix`, because they change the shipped `templates/web-review/`. All other updates use `chore`.
- The shipped command uses plain English and no em dash. `pnpm lint:content` enforces this.
- `docs/` and `web/` are for users. Put contributor topics in `CONTRIBUTING.md`. The `maintain-docs` skill keeps the docs in sync with the command.

## Gotchas

- `pnpm validate` and `pnpm build` need `templates/web-review/axi-server.mjs` and `axi-core.mjs`. Run `pnpm review:build` first.
- `.extensionignore` keeps a `--dev` install equal to the zip. Keep it in sync with `INCLUDE` in `.github/scripts/build-zip.mjs`.
- `build-server.ts` and the unit test run as TypeScript directly in Node. Use explicit `.ts` import specifiers.
- `.specify/`, `specs/`, and `.speckit-axi/` (review session state) are local and gitignored.
- To develop the browser surface, start a review server on port 4317, then run `astro dev --background` inside `web-review/`. See the comment in `web-review/astro.config.ts`.

<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan

<!-- SPECKIT END -->

<!-- CODEGRAPH_START -->

## CodeGraph

`.mcp.json` configures the CodeGraph MCP server. When `.codegraph/` holds an index, use `codegraph_explore` for structural code questions before grep. If the project has no index, ask the user before you run `codegraph init`.

<!-- CODEGRAPH_END -->
