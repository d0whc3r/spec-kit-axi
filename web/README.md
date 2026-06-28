# web/

The public landing site for the axi extension, published to GitHub
Pages. The page content is hand-authored in `index.html`; the interactive
behaviour and styling are written in TypeScript and CSS under `src/` and
**built with [Vite](https://vite.dev/)** into `dist/`, which is what gets
deployed.

The page is built with progressive enhancement: the CSS is a real `<link>`, so
the site is fully readable and styled with JavaScript disabled. The bundled
module (`src/main.ts`) only adds the optional behaviour: the mobile nav toggle,
the copy buttons on code blocks, and the install-method tabs.

```text
web/
├── index.html          single-page site; the Vite entry. Hand-authored content.
├── src/
│   ├── main.ts         entry module: wires nav, clipboard, and tabs
│   ├── nav.ts          mobile navigation toggle
│   ├── clipboard.ts    copy-to-clipboard buttons
│   ├── tabs.ts         ARIA tabs (install methods)
│   └── styles.css      all styling, responsive, light and dark
├── public/
│   ├── favicon.svg
│   └── examples/       staged from /examples (gitignored)
├── dist/               build output, published to Pages (gitignored)
├── vite.config.ts      base "./" (project Pages path); output to dist/
├── tsconfig.json
├── package.json        @spec-kit-axi/web (pnpm workspace member)
└── README.md           this file
```

## Build and local preview

The build tooling (Vite, TypeScript) lives in this folder's own
`package.json`, a pnpm workspace member, so it never weighs on the root
package. Run these from the repo root:

```bash
pnpm web:dev        # Vite dev server (stage examples first: pnpm examples:sync)
pnpm web:build      # stage examples + type-check + build into web/dist
pnpm web:preview    # serve the production build from web/dist
```

`pnpm examples:sync` copies `/examples` (the single source of truth) into
`web/public/examples`; Vite then copies `public/` into `dist/` verbatim.
`web/public/examples` is gitignored, so the example files are never committed
twice. `/examples` is currently a placeholder.

## Relationship to the docs

The site is a **derived view** of the same canonical sources the wiki under
[`docs/`](../docs/) draws from: `extension.yml`, `catalog.json`,
`commands/`, and `templates/`. The wiki is the long-form reference; this site
is the short, public front door to it.

Because both are derived, they must agree. The `maintain-docs` skill owns that
alignment: when a command, version, or install URL changes, the skill updates
the wiki **and** this site together, and its drift detector flags the site when
it falls behind. See
[`.agents/skills/maintain-docs/SKILL.md`](../.agents/skills/maintain-docs/SKILL.md).

Facts on this page that must match the canonical sources and the wiki:

- The version pin and the `requires.speckit_version` value (header badge, hero
  badge, install snippets).
- The command name (`/speckit.axi`) and what it does.
- The install and usage commands, including the pinned release URL.
- Repository, wiki, issues, and discussions links.

## Deployment

The [`pages.yml`](../.github/workflows/pages.yml) workflow runs after every
release, builds the site with Vite, and publishes `web/dist` to GitHub Pages.
The site is served at `https://d0whc3r.github.io/spec-kit-axi/`.

GitHub Pages must be set to the **GitHub Actions** source once, in the
repository settings, for the workflow to publish.
