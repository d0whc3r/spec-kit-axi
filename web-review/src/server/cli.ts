// axi review server - CLI entry (esbuild bundles this to axi-server.mjs).
//
// The human talks to this server through the browser; the agent talks to it
// through these subcommands. AXI-compliant CLI: TOON on stdout, structured
// errors on stdout, diagnostics on stderr, exit codes (0 ok/no-op, 1 error,
// 2 usage), content-first home view.

import path from "node:path";
import { parseArgs } from "node:util";
import { runServer } from "./http.ts";
import { cmdStart, cmdPoll, cmdReply, cmdEnd, cmdStop, cmdHome } from "./commands.ts";
import { printHelp } from "./help.ts";
import { usage } from "./io.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string", default: "0" },
    "no-open": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});
const [cmd, arg1, arg2] = positionals;

if (values.help) {
  printHelp(cmd);
  process.exit(0);
}

switch (cmd) {
  case undefined:
    await cmdHome();
    break;
  case "start":
    if (!arg1) usage("start needs a feature dir: start <feature-dir> [--port N] [--no-open]");
    await cmdStart(arg1, { port: Number(values.port), noOpen: values["no-open"] });
    break;
  case "serve":
    if (!arg1) usage("serve needs a feature dir (internal command, use `start`)");
    runServer(path.resolve(arg1), Number(values.port));
    break;
  case "poll":
    if (!arg1) usage("poll needs a feature dir: poll <feature-dir>");
    await cmdPoll(arg1);
    break;
  case "reply":
    if (!arg1) usage('reply needs a feature dir: reply <feature-dir> "message"');
    await cmdReply(arg1, arg2);
    break;
  case "end":
    if (!arg1) usage("end needs a feature dir: end <feature-dir>");
    await cmdEnd(arg1);
    break;
  case "stop":
    await cmdStop(arg1);
    break;
  default:
    usage(`unknown command "${cmd}". Commands: start, poll, reply, end, stop`);
}
