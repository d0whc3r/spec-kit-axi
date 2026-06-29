// Help text (AXI principle 10): per-command on `--help <cmd>`, an overview
// otherwise.

import { SELF, selfCmd, tilde } from "./paths.ts";
import { out } from "./io.ts";

const HELP: Record<string, string> = {
  start: [
    "start <feature-dir> [--port N] [--no-open]",
    "  Open (or reuse) a review session and launch the browser.",
    "  --port N    bind to a fixed port (default: an open one)",
    "  --no-open   do not open the browser",
    "examples:",
    `  ${selfCmd} start specs/001-feature`,
    `  ${selfCmd} start specs/001-feature --no-open`,
  ].join("\n"),
  poll: [
    "poll <feature-dir>",
    "  Block until the reviewer sends notes, then print them as TOON on stdout.",
    "examples:",
    `  ${selfCmd} poll specs/001-feature`,
  ].join("\n"),
  reply: [
    'reply <feature-dir> "message"',
    "  Show a message to the reviewer in the browser chat.",
    "examples:",
    `  ${selfCmd} reply specs/001-feature "applied your notes"`,
  ].join("\n"),
  end: [
    "end <feature-dir>",
    "  End the review session. The next poll returns the ended state.",
    "examples:",
    `  ${selfCmd} end specs/001-feature`,
  ].join("\n"),
  stop: [
    "stop [feature-dir]",
    "  Shut down the review server. With no argument, stops every running server.",
    "examples:",
    `  ${selfCmd} stop`,
    `  ${selfCmd} stop specs/001-feature`,
  ].join("\n"),
};

export function printHelp(cmd: string | undefined): void {
  if (cmd && HELP[cmd]) return out(HELP[cmd]);
  out(`bin: ${tilde(SELF)}`);
  out("commands:");
  out(`  ${selfCmd} start <feature-dir> [--port N] [--no-open]   open a review session`);
  out(`  ${selfCmd} poll <feature-dir>                            receive queued notes (TOON)`);
  out(`  ${selfCmd} reply <feature-dir> "message"                 message the reviewer`);
  out(`  ${selfCmd} end <feature-dir>                             end the session`);
  out(`  ${selfCmd} stop [feature-dir]                            shut the server(s) down`);
  out(`run \`${selfCmd}\` with no arguments to see active sessions`);
}
