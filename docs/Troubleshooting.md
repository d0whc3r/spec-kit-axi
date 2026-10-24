# Troubleshooting

Common breakages and their fixes.

## Installation errors

### "found in the 'community' catalog, which is discovery-only"

```text
Error: 'axi' was found in the 'community' catalog, which is discovery-only
```

This is expected behavior. Spec Kit lists community extensions in a discovery-only catalog (`install_allowed: false`) and does not install from it. Spec Kit advises against setting that catalog to `install_allowed`.

Install the extension directly from the release archive. This is also how you pin a version:

```bash
specify extension add axi --from \
  https://github.com/d0whc3r/spec-kit-axi/releases/download/v2.0.0/axi-2.0.0.zip
```

To update later, run the same command with a newer release URL and add `--force`.

Community extensions are author-maintained, and Spec Kit does not review them. Review the source before you install.

### "Configuration may be required"

`specify extension add` prints this warning for every extension that ships no config file. Axi has no configuration, so you can ignore it.

## The slash command does not appear in my assistant

1. Confirm the extension is registered:
   ```bash
   cat .specify/extensions/.registry
   ```
   You should see an `axi` entry.
2. Confirm extension files are present:
   ```bash
   ls .specify/extensions/axi
   ```
   You should see `extension.yml`, `commands/`, `templates/`.
3. Look for the right name. Slash-command agents show `/speckit.axi.review`. Skills-based agents show the command under another name: `/speckit-axi-review` in Claude Code, `$speckit-axi-review` in Codex.
4. Restart the host agent. Some agents cache the slash command surface at
   startup. Open a new chat or reload the agent's window.
5. If it still does not appear, reinstall the release:
   ```bash
   specify extension add axi --from <release-zip-url> --force
   ```

## The review server did not start

```text
error: the review server did not start
```

The agent could not reach the server within five seconds of launching it.

- Confirm Node.js is on your `PATH`: `node --version`.
- A previous session may have left a stale state directory. The server stores
  state under `.speckit-axi/`; a `start` reuses a live server, so this is
  usually harmless. If a server is wedged, run
  `node .specify/extensions/axi/templates/web-review/axi-server.mjs stop` to shut
  every server down, then start again.
- If a fixed `--port` is busy, let the server pick an open one (omit `--port`).

## The browser did not open

The server still started; only the auto-open failed. Open the URL the agent
printed (`url: http://127.0.0.1:<port>/`) in your browser by hand. To skip
auto-open on purpose, the agent can pass `--no-open` to `start`.

## The page shows an offline notice

The renderer (`marked`, `DOMPurify`, `mermaid`) loads from a pinned CDN, so the
pages need an internet connection. Offline, the surface shows a notice instead
of rendered markdown. Reconnect and reload. The markdown and your notes never
leave your machine; only the renderer comes from the CDN.

## "no review session is running"

```text
error: no review session is running
```

A `poll`, `reply`, or `end` ran with no live server for that feature. Start one
first with `/speckit.axi.review <feature-dir>`, or run
`node .specify/extensions/axi/templates/web-review/axi-server.mjs start <feature-dir>`.

## "not a directory"

```text
error: not a directory: <path>
```

The feature directory you named does not exist. Pass an existing `specs/*`
directory, or let the agent resolve it from your branch.

## A note landed on the wrong place

An `anno` note is anchored to the verbatim text you selected and the nearest
heading. If the same phrase appears more than once in a file, the queue carries
a 0-based `occurrence` to disambiguate. If an edit still lands on the wrong
copy, select a longer, more unique phrase and send it again. See
[Annotation Format](Annotation-Format.md).

## The session will not end

End it from the browser, or ask the agent to stop. If a server is still
running after you thought it ended, stop it directly:

```bash
node .specify/extensions/axi/templates/web-review/axi-server.mjs stop        # stop every running server
node .specify/extensions/axi/templates/web-review/axi-server.mjs stop <dir>  # stop one feature's server
```

## Filing a bug

When something breaks in a way you cannot resolve, file a bug with:

- Extension version: `grep version extension.yml` or
  `cat .specify/extensions/axi/extension.yml | grep version`.
- Spec Kit core version: `specify --version`.
- Node version: `node --version`.
- Host agent name and version.
- The exact command or subcommand invocation.
- The exact error string it emitted.

Use the issue tracker: <https://github.com/d0whc3r/spec-kit-axi/issues>.

For security issues, use private vulnerability reporting instead. See
[SECURITY.md](../SECURITY.md).
