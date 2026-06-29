# @spec-kit-axi/web-review

The review surface behind the `/speckit.axi.review` command: an Astro + Tailwind
front end plus a small Node server that lets a human review the markdown
artifacts of a feature while an agent drives the conversation.

Everything is TypeScript under `src/`. The shipped runtime is **two compiled,
zero-dependency ESM files that Node runs directly** (`axi-core.mjs` and
`axi-server.mjs`), produced by esbuild. The browser surface is bundled by Astro
to `dist/`. Both outputs are what the release zip and `validate-manifest`
expect at those exact paths.

## Project structure

```text
web-review/
├── axi-core.mjs        # build output: pure helpers (also used by the test)
├── axi-server.mjs      # build output: CLI + review server, loads axi-core.mjs at runtime
├── build-server.ts     # esbuild script that produces the two .mjs files
├── dist/               # astro build output (the browser surface)
└── src/
    ├── core/           # pure helpers shared by browser, server, and test (esbuild -> axi-core.mjs)
    ├── server/         # review server + agent CLI; cli.ts is the entry (esbuild -> axi-server.mjs)
    ├── scripts/        # browser modules; axi.ts is the entry, loaded by index.astro
    ├── components/     # Astro components (.astro), incl. vanilla shadcn UI under components/ui
    ├── layouts/        # Layout.astro
    ├── pages/          # index.astro
    ├── lib/            # cn() and other small helpers
    └── styles/         # global.css (Tailwind v4 + theme tokens)
```

## Commands

Run from inside `web-review/`:

| Command             | Action                                                                   |
| :------------------ | :----------------------------------------------------------------------- |
| `pnpm install`      | Install dependencies                                                     |
| `pnpm dev`          | Start the Astro dev server at `localhost:4321`                           |
| `pnpm build:server` | esbuild `src/core` + `src/server` into `axi-core.mjs` / `axi-server.mjs` |
| `pnpm build`        | `build:server`, then `astro build` (full build: server + browser)        |
| `pnpm preview`      | Preview the Astro build locally                                          |
| `pnpm test`         | Run the unit test with Node's built-in runner (`node --test`)            |

From the repo root the same three are exposed as `review:dev`, `review:build`,
and `review:test` (e.g. `pnpm review:build`).

> Node 22 strips the TypeScript types, so `build-server.ts` and the test files
> run directly without a separate compile step.

## The server CLI (`axi-server.mjs`)

The human talks to the server through the browser; the agent talks to it
through these subcommands. The CLI is AXI-compliant: TOON on stdout, structured
errors on stdout, diagnostics on stderr, content-first home view, exit codes
(0 ok/no-op, 1 error, 2 usage).

| Subcommand                      | Purpose                                       |
| :------------------------------ | :-------------------------------------------- |
| (none)                          | Home view                                     |
| `start <feature-dir>`           | Launch the review server and open the browser |
| `poll <feature-dir>`            | Read pending human input                      |
| `reply <feature-dir> "message"` | Send an agent message into the review         |
| `end <feature-dir>`             | End the review                                |
| `stop`                          | Stop a running server                         |

Flags: `--port N` (default: ephemeral), `--no-open`, `--help` / `-h`.
