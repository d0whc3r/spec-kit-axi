---
name: shadcn-astro
description: |
  How to add and maintain shadcn/ui components in web-review (Astro + Tailwind v4)
  WITHOUT React. Components are vanilla .astro files using cva + cn; interactive
  ones use small delegated vanilla JS instead of Radix. shadcn tokens are mapped
  onto the existing axi theme, so dark mode is automatic (no `dark:` variants).

  Use when adding a shadcn component to web-review, porting a component from
  ui.shadcn.com, editing src/components/ui/, touching the theme tokens in
  src/styles/global.css, or whenever the shadcn CLI wants to emit .tsx files.
---

# shadcn/ui in web-review (Astro, no React)

web-review is Astro + Tailwind v4 with **no UI framework**. We use shadcn/ui's
*design* (its exact Tailwind classes and CSS-variable contract) but implement
each component as a plain `.astro` file. There is no React, no Radix, no
`@astrojs/react`.

## The one hard rule

**Do NOT run the shadcn CLI (`npx shadcn@latest add ...`).** It writes React
`.tsx` files that this project cannot render. To add a component you port it by
hand (steps below). The CLI is fine for one thing only: reading a component's
source on https://ui.shadcn.com to copy its classes.

## How the pieces fit

| Piece | Location | Notes |
| --- | --- | --- |
| `cn()` merger | `src/lib/utils.ts` | `clsx` + `tailwind-merge`. Lets a `class` prop override defaults. |
| `@/*` alias | `tsconfig.json` `paths` | `@/components/ui/button.astro`, `@/lib/utils`. |
| Theme tokens | `src/styles/global.css` | shadcn tokens mapped onto the axi palette in `@theme inline`. |
| Components | `src/components/ui/*.astro` | One component per file (Astro has no multi-export). |
| Deps | `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` | No React. `tw-animate-css` powers `animate-in`/`fade-in` etc. |

## Theme: shadcn tokens are aliases of the axi palette

`src/styles/global.css` defines the axi palette (`--bg`, `--fg`, `--accent`,
`--muted`, `--border`, `--panel-bg`, `--bubble-bg`, `--code-bg`, `--danger`,
`--radius`) and these flip for dark mode via `@media (prefers-color-scheme)` and
`:root[data-theme="dark"]`. The shadcn `--color-*` utilities are mapped onto
those vars inside `@theme inline`, so **components inherit light/dark for free —
never write `dark:` variants for semantic colors.**

Mapping (shadcn utility → axi var):

| shadcn | axi var | | shadcn | axi var |
| --- | --- | --- | --- | --- |
| `background` / `foreground` | `--bg` / `--fg` | | `muted` | `--code-bg` |
| `card` / `card-foreground` | `--panel-bg` / `--fg` | | `muted-foreground` | `--muted` |
| `popover` / `popover-foreground` | `--bg` / `--fg` | | `accent` | `--bubble-bg` |
| `primary` | `--accent` (blue) | | `accent-foreground` | `--fg` |
| `primary-foreground` | `#fff` | | `destructive` | `--danger` |
| `secondary` | `--bubble-bg` | | `border` / `input` | `--border` |
| `secondary-foreground` | `--fg` | | `ring` | `--accent` |

**Naming collision to remember:** axi already used `--color-muted` (grey text)
and `--color-accent` (blue). Those names now carry shadcn meaning. The axi blue
is `primary` (`bg-primary`/`text-primary`); axi grey text is `muted-foreground`
(`text-muted-foreground`). The non-colliding axi aliases (`bg-bg`, `text-fg`,
`border-border`, `bg-panel`, `bg-bubble`, `bg-code`, `bg-accent-soft`) still
exist for the axi widget markup.

## Adding a component (the port workflow)

1. Open the component on https://ui.shadcn.com → "Manually" tab to see source.
2. Create `src/components/ui/<name>.astro`. Translate JSX → Astro:
   - `className=` → `class=`; spread props with `{...rest}`; children → `<slot />`.
   - Keep the **exact Tailwind classes** so it inherits the theme.
   - Type props with `HTMLAttributes<"button">` from `astro/types`.
   - Merge with `cn(...defaults, className)` so callers can override.
3. Variants: keep shadcn's `cva(...)` config verbatim (it is framework-agnostic
   JS) and `export const xVariants` so other files / `<a>` tags can borrow it.
4. Interactivity: there is no Radix. Replace it with data attributes plus one
   delegated listener in the root component's `<script>` (see `tabs.astro` and
   `dropdown-menu.astro`). One delegated handler covers every instance — do not
   add per-instance `client:` directives.
5. Multi-part components (Card, Tabs, DropdownMenu) become one `.astro` file per
   part, e.g. `card.astro`, `card-header.astro`, `card-title.astro`, ...

### Skeleton for a static component

```astro
---
import type { HTMLAttributes } from "astro/types";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<"div">;
const { class: className, ...rest } = Astro.props;
---

<div class={cn("<paste shadcn classes here>", className)} {...rest}>
  <slot />
</div>
```

## Gotchas

- **Astro builds every file in `src/pages/`.** A demo/showcase page there ships
  in the release artifact (`outDir` = `web-review/dist/`). Keep demos out of
  `src/pages/` unless you want them shipped. Unused `ui/` components are
  tree-shaken, so they cost nothing until a page imports them.
- **Runtime widgets must stay shadcn too.** The review surface builds most of
  its DOM at runtime in `src/scripts/axi.js`. Astro components can't be
  instantiated in the browser, so do NOT hand-write shadcn class strings in JS.
  Instead put a prototype inside a `<template id="tpl-...">` in `index.astro`
  built from real shadcn components, then `clone` it in `axi.js` and fill in
  text via `[data-*]` hooks. This keeps the dynamic widgets identical to the
  static ones with zero class duplication.
- **`textarea`**: keep the `<slot />` on the same line as the tag
  (`...>{...}<slot /></textarea>`) so Astro does not inject whitespace into the
  value.
- **`@theme inline` is correct here** (single light/dark theme whose vars are
  redefined). Do not switch to non-inline `@theme` — see the repo's
  `tailwind-v4-shadcn` skill, error #6, for when inline would break instead.
- **No `tailwind.config.*`** — v4 config lives in `global.css`.

## Components available

button, badge, card (+ header/title/description/content/footer), input,
textarea, skeleton, tabs (+ list/trigger/content), dropdown-menu (+ trigger/
content/item/label/separator).

Vanilla interactivity ceilings (raise only if needed): tabs are flat (no nested
`<Tabs>`); dropdown has no arrow-key navigation and no collision-aware
positioning (right-aligned under the trigger).
