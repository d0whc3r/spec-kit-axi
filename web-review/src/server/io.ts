// stdout + exit helpers (AXI: TOON/structured on stdout, exit codes).
//
// fail = error + exit 1, usage = error + exit 2. Both return `never` so callers
// like `if (!info) fail(...)` narrow the value as non-null afterwards.

export const out = (s: string): void => void process.stdout.write(s + "\n");

export function fail(msg: string, helps: string[] = []): never {
  out(`error: ${msg}`);
  helps.forEach((h, i) => out(`help[${i + 1}]: ${h}`));
  process.exit(1);
}

export function usage(msg: string): never {
  out(`error: ${msg}`);
  process.exit(2);
}
