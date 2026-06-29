import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";

// The review UI is a static single page that talks to the axi review server
// (web-review/axi-server.mjs) over fetch + Server-Sent Events. During
// `astro dev` those endpoints do not exist locally, so they are proxied to a
// running review server. Start one on the fixed dev port first:
//
//   node web-review/axi-server.mjs serve <feature-dir> --port 4317
//
const AXI_SERVER = "http://127.0.0.1:4317";

// Pure helpers shared with the server. The browser imports the TypeScript
// source directly through the "@axi-core" alias (Vite bundles it); esbuild
// compiles the same source to the shipped axi-core.mjs for the server + test.
const axiCore = fileURLToPath(new URL("./src/core/index.ts", import.meta.url));

// https://astro.build/config
export default defineConfig({
  // The build output is the extension's shipped static surface. It is written
  // to web-review/dist (gitignored, populated only by the build), next to the
  // axi-server.mjs that serves it.
  outDir: fileURLToPath(new URL("./dist", import.meta.url)),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { "@axi-core": axiCore },
    },
    server: {
      proxy: {
        "/api": { target: AXI_SERVER, changeOrigin: true },
        "/md": { target: AXI_SERVER, changeOrigin: true },
      },
    },
  },
});
