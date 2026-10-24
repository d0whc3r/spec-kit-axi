// Pipeline: lint extension content (shipped command bodies).
//
// Each shipped command is linted for prose rules (no em dash, no banned
// AI-tell phrases). Then an oxfmt --check pass over commands and README.
//
// Usage: node lint-content.mjs

import path from "node:path";
import { $, fs } from "zx";
import { repoRoot, isMain } from "./lib/repo.mjs";
import { logger } from "./lib/log.mjs";

const log = logger("lint-content");

const BANNED_PHRASES = ["delve", "tapestry", "in essence", "navigate the landscape"];

// Shipped command bodies are linted for prose rules
// (AGENTS.md "Agent Boundaries" rule 4: no em dashes, plain English).
const COMMANDS = ["commands/speckit.axi.review.md"];

const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(repoRoot, rel));

// Shared prose rules for shipped content: no em dash, no banned AI-tell phrases.
function lintProse(rel, text, fail) {
  if (text.includes("—")) fail(`em dash found in ${rel}`);
  for (const phrase of BANNED_PHRASES) {
    if (text.toLowerCase().includes(phrase)) {
      fail(`banned phrase "${phrase}" found in ${rel}`);
    }
  }
}

// Shipped commands name Spec Kit commands only through __SPECKIT_COMMAND_<NAME>__
// tokens, which Spec Kit resolves per agent at install time. oxfmt turns a token
// outside backticks into bold text, so check for that too.
function lintCommandRefs(rel, text, fail) {
  if (/(^|[\s`(])\/speckit\.[a-z]/m.test(text)) {
    fail(`literal Spec Kit command name in ${rel}: use a __SPECKIT_COMMAND_<NAME>__ token`);
  }
  if (text.includes("**SPECKIT_COMMAND_")) {
    fail(`token formatted as bold in ${rel}: keep each token inside backticks`);
  }
}

export async function lintContent() {
  let failed = false;
  const fail = (msg) => {
    log.fail(msg);
    failed = true;
  };

  for (const cmd of COMMANDS) {
    if (!exists(cmd)) fail(`${cmd} missing`);
    else {
      const text = read(cmd);
      lintProse(cmd, text, fail);
      lintCommandRefs(cmd, text, fail);
    }
  }

  // oxfmt pass over the shipped markdown.
  const oxfmt = path.join(repoRoot, "node_modules/.bin/oxfmt");
  if (fs.existsSync(oxfmt)) {
    const res = await $({ cwd: repoRoot, nothrow: true })`${oxfmt} --check ${[
      "commands/**/*.md",
      "README.md",
    ]}`;
    if (res.exitCode !== 0) fail("oxfmt reported unformatted markdown files");
  }

  if (failed) return false;
  log.ok("content lint passed");
  return true;
}

if (isMain(import.meta.url)) {
  if (!(await lintContent())) process.exit(1);
}
