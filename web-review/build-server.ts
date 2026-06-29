// Compile the TypeScript review server + shared core into the two shipped,
// zero-dependency ESM files the extension runs directly with `node`:
//
//   src/core/index.ts   -> axi-core.mjs    (pure helpers; also used by the test)
//   src/server/cli.ts   -> axi-server.mjs  (CLI + review server)
//
// axi-server.mjs imports its sibling axi-core.mjs at runtime (kept external),
// so the shipped pair mirrors the source split. Bundling is done with esbuild,
// the same bundler Vite/Astro use internally; the browser surface goes through
// Astro proper. Outputs are committed; the release zip and validate-manifest
// expect them at these exact paths.
//
// Run with `node build-server.ts` (Node strips the types).

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const r = (...p: string[]) => path.join(root, ...p);

const common = {
  bundle: true,
  format: "esm" as const,
  platform: "node" as const,
  target: "node22",
  // Readable output: this runs as a debuggable Node script, not a hot path.
  minify: false,
  legalComments: "none" as const,
};

await build({
  ...common,
  entryPoints: [r("src/core/index.ts")],
  outfile: r("axi-core.mjs"),
});

await build({
  ...common,
  entryPoints: [r("src/server/cli.ts")],
  outfile: r("axi-server.mjs"),
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

console.error("build-server: wrote axi-core.mjs + axi-server.mjs");
