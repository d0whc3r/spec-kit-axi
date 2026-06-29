// Compile the TypeScript review server + shared core into the two shipped,
// zero-dependency ESM files the extension runs directly with `node`. They are
// emitted into ../templates/web-review so the repo and the release zip share
// one layout (the extension installs to .specify/extensions/axi/, so the
// installed server is .specify/extensions/axi/templates/web-review/axi-server.mjs):
//
//   src/core/index.ts   -> ../templates/web-review/axi-core.mjs    (pure helpers; also used by the test)
//   src/server/cli.ts   -> ../templates/web-review/axi-server.mjs  (CLI + review server)
//
// axi-server.mjs imports its sibling axi-core.mjs at runtime (kept external),
// so the shipped pair mirrors the source split. Bundling is done with esbuild,
// the same bundler Vite/Astro use internally; the browser surface goes through
// Astro proper. Outputs are gitignored build artifacts; the release zip and
// validate-manifest expect them at these exact paths.
//
// Run with `node build-server.ts` (Node strips the types).

import { build, type BuildOptions } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const r = (...p: string[]) => path.join(root, ...p);

const common: BuildOptions = {
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  // Readable output: this runs as a debuggable Node script, not a hot path.
  minify: true,
  legalComments: "none",
};

await build({
  ...common,
  entryPoints: [r("src/core/index.ts")],
  outfile: r("../templates/web-review/axi-core.mjs"),
});

await build({
  ...common,
  entryPoints: [r("src/server/cli.ts")],
  outfile: r("../templates/web-review/axi-server.mjs"),
  // Keep the core import external so the shipped server loads the sibling
  // axi-core.mjs rather than inlining a second copy.
  plugins: [
    {
      name: "core-external",
      setup(b) {
        b.onResolve({ filter: /\/core\/index(\.ts)?$/ }, () => ({
          path: "./axi-core.mjs",
          external: true,
        }));
      },
    },
  ],
});

console.error("build-server: wrote ../templates/web-review/axi-core.mjs + axi-server.mjs");
