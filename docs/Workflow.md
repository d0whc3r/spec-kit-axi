# Workflow

How a review flows: from launching the surface, through the annotate and apply
loop, to ending the session.

## The review loop

```
Browser (the reviewer)            Review server            Agent
──────────────────────            ─────────────            ─────

read rendered .md  ───────────────────────────────────────  /speckit.axi.review
select text, add notes                                       start <feature-dir>
                          ◄─── opens browser ────────────
click Send  ──────────────►  queue flushed
                             poll returns queue (TOON)  ───►  edit canonical .md
                                                              reply "<summary>"
page live-reloads  ◄───── fs.watch detects edit ──────────
read the change, repeat   ───────────────────────────────►  poll for next round
end session in browser  ──►  ended state
                             poll returns ended  ─────────►  stop
```

The reviewer drives the loop from the browser. The agent never edits anything
on its own; it only acts on the queue you send.

## Step by step

1. **Launch.** The agent resolves the feature directory and runs the server's
   `start`. Your browser opens at a `127.0.0.1` address. Every `.md` file in
   the feature shows up as a tab.
2. **Read and annotate.** Select any phrase to attach a note, or type a general
   comment in the composer. Notes collect in the Notes panel, where you can
   edit or remove them.
3. **Send.** One click hands the whole queue to the agent. The agent's `poll`
   was blocking on it and now receives the notes as TOON. See
   [Annotation Format](Annotation-Format.md).
4. **Apply.** The agent edits the canonical `.md` files in place, then `reply`
   posts a one-line summary to the browser.
5. **Live-reload.** The server watches the feature directory and pushes a
   reload, so the rendered document updates in place.
6. **Repeat or end.** Keep reviewing, or end the session from the browser. The
   agent's next `poll` returns the ended state and it runs `stop`.

## Feature resolution

The agent picks the feature directory in this order:

1. The path you named, if any.
2. The `specs/` subdirectory matching the current git branch.
3. The one `specs/*` directory, if there is exactly one.
4. The most recently modified `specs/*` directory.
5. Otherwise it asks you.

## Which files appear

The server discovers every `.md` file under the feature directory, recursively,
skipping dotfiles and `node_modules`. Known names sort first in this order:

```
spec.md, plan.md, tasks.md, constitution.md, research.md, data-model.md, quickstart.md
```

Everything else follows alphabetically. Nested files such as `contracts/`
appear as their own tabs.

## Source of truth

The feature's `.md` files are canonical. The agent edits them in place, only as
your notes direct, and never writes a derived copy. The annotation queue lives
under `.speckit-axi/` in your project and stays local. When the session ends
and the server stops, your markdown is left updated, nothing else touched.

## Ending a session

End it from the browser, or ask the agent to stop. If you end it in the
browser, the agent's next `poll` sees the ended state and runs `stop`. If you
ask the agent to stop instead, it runs `end` first so the browser shows the
session as ended, then `stop` to shut the server down.
