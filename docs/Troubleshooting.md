# Troubleshooting

Common breakages and their fixes.

## Installation errors

### "installation is not allowed from that catalog"

```text
Error: 'axi' is available in the 'community' catalog but installation is
not allowed from that catalog.

To enable installation, add 'axi' to an approved catalog
(install_allowed: true) in .specify/extension-catalogs.yml.
```

This is expected behavior, not a broken release. Spec Kit ships the community
catalog as **discovery only**. It carries `install_allowed: false` by design,
so the CLI can list community extensions but will not install one until you opt
in. You have two ways to opt in.

**Option A: install directly (recommended).** No catalog config, always works,
and it is the only way to pin a specific version:

```bash
specify extension add axi --from \
  https://github.com/d0whc3r/spec-kit-axi/releases/download/v1.0.0/axi-1.0.0.zip
```

To update later, rerun the same command with a newer version URL.

**Option B: approve the community catalog.** Do this once if you want to
install and update by name. It adds the catalog with `install_allowed: true`
to `.specify/extension-catalogs.yml`:

```bash
specify extension catalog add \
  https://raw.githubusercontent.com/github/spec-kit/main/extensions/catalog.community.json \
  --name community --install-allowed

specify extension add axi
specify extension update axi
```

Community extensions are author-maintained and not reviewed by Spec Kit. Review
the source before approving a catalog.

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
3. Restart the host agent. Some agents cache the slash command surface at
   startup. Open a new chat or reload the agent's window.
4. If it still does not appear, try a fresh install:
   ```bash
   specify extension update axi
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
  `node templates/axi-web/axi-server.mjs stop` to shut every server down, then
  start again.
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
`node templates/axi-web/axi-server.mjs start <feature-dir>`.

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
node templates/axi-web/axi-server.mjs stop          # stop every running server
node templates/axi-web/axi-server.mjs stop <dir>    # stop one feature's server
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
