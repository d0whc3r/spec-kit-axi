// Host + self-path helpers used to build the agent-facing help strings.
//
// `import.meta.url` here resolves to the bundled axi-server.mjs at runtime
// (esbuild emits a single file), so SELF is the path the agent invokes and
// the path `start` re-spawns as the `serve` process.

import os from "node:os";
import { fileURLToPath } from "node:url";

export const HOST = "127.0.0.1";
export const SELF = fileURLToPath(import.meta.url);

export const tilde = (p: string): string => p.replace(os.homedir(), "~");
export const sh = (s: string): string => (/\s/.test(s) ? `"${s}"` : s);
export const selfCmd = `node ${tilde(SELF)}`;
