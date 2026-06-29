import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nearestHeading,
  findQuote,
  captureAnnotation,
  chatItem,
  queueAdd,
  queueEdit,
  queueRemove,
  queueSerialize,
  queueDeserialize,
  toonField,
  toonQueue,
  lineDiff,
} from "../src/core/index.ts";

const MD = `# Title

intro line

## Goals

the system must be fast

## Goals again

the system must be fast
`;

test("nearestHeading returns the heading enclosing an index", () => {
  const i = MD.indexOf("the system must be fast");
  assert.equal(nearestHeading(MD, i), "Goals");
});

test("nearestHeading returns '' before any heading", () => {
  assert.equal(nearestHeading(MD, MD.indexOf("intro")), "Title");
  assert.equal(nearestHeading("no headings here", 5), "");
});

test("findQuote returns index and occurrence for the first match", () => {
  const r = findQuote(MD, "the system must be fast");
  assert.equal(r.occurrence, 0);
  assert.equal(r.index, MD.indexOf("the system must be fast"));
});

test("findQuote disambiguates duplicates by occurrence", () => {
  const second = MD.indexOf("the system must be fast", MD.indexOf("the system must be fast") + 1);
  // Searching from the start finds occurrence 0; the source has two copies.
  const all = MD.split("the system must be fast").length - 1;
  assert.equal(all, 2);
  assert.ok(second > 0);
});

test("findQuote falls back to whitespace-flexible matching", () => {
  const r = findQuote("a  b\nc", "a b c");
  assert.ok(r);
  assert.equal(r.index, 0);
});

test("findQuote returns null when absent or empty", () => {
  assert.equal(findQuote(MD, "nonexistent"), null);
  assert.equal(findQuote(MD, "   "), null);
});

test("captureAnnotation builds an anno item with heading + verbatim quote", () => {
  const a = captureAnnotation({
    md: MD,
    quote: "the system must be fast",
    file: "spec.md",
    note: " too vague ",
  });
  assert.deepEqual(a, {
    kind: "anno",
    file: "spec.md",
    heading: "Goals",
    quote: "the system must be fast",
    occurrence: 0,
    note: "too vague",
  });
});

test("chatItem builds a chat item with no anchor", () => {
  const c = chatItem("overall scope is too big");
  assert.equal(c.kind, "chat");
  assert.equal(c.file, null);
  assert.equal(c.note, "overall scope is too big");
});

test("queueAdd assigns incrementing ids", () => {
  let q = [];
  q = queueAdd(q, chatItem("one"));
  q = queueAdd(q, chatItem("two"));
  assert.deepEqual(
    q.map((i) => i.id),
    [1, 2],
  );
});

test("queueEdit patches by id and preserves the id", () => {
  let q = queueAdd([], chatItem("one"));
  q = queueEdit(q, 1, { note: "edited" });
  assert.equal(q[0].note, "edited");
  assert.equal(q[0].id, 1);
});

test("queueRemove drops the matching id", () => {
  let q = queueAdd(queueAdd([], chatItem("one")), chatItem("two"));
  q = queueRemove(q, 1);
  assert.deepEqual(
    q.map((i) => i.note),
    ["two"],
  );
});

test("queue serialize/deserialize round-trips; bad input is []", () => {
  const q = queueAdd([], chatItem("one"));
  assert.deepEqual(queueDeserialize(queueSerialize(q)), q);
  assert.deepEqual(queueDeserialize("not json"), []);
  assert.deepEqual(queueDeserialize("{}"), []);
});

test("toonField marks empty as '-' and quotes commas/quotes/newlines", () => {
  assert.equal(toonField(null), "-");
  assert.equal(toonField(""), "-");
  assert.equal(toonField("plain"), "plain");
  assert.equal(toonField("a,b"), '"a,b"');
  assert.equal(toonField('say "hi"'), '"say ""hi"""');
  assert.equal(toonField("line1\nline2"), '"line1\\nline2"');
});

test("toonQueue gives a definitive empty state", () => {
  assert.equal(toonQueue([], { session: "specs/001" }), "session: specs/001\nqueue: 0 items");
});

test("toonQueue encodes anno + chat rows with the header", () => {
  const items = [
    {
      id: 1,
      kind: "anno",
      file: "spec.md",
      heading: "Goals",
      occurrence: 0,
      quote: "must be fast",
      note: "quantify, ms?",
    },
    {
      id: 2,
      kind: "chat",
      file: null,
      heading: null,
      occurrence: 0,
      quote: null,
      note: "tighten scope",
    },
  ];
  const toon = toonQueue(items, { session: "specs/001" });
  assert.equal(
    toon,
    [
      "session: specs/001",
      "queue[2]{kind,file,heading,occurrence,quote,note}:",
      '  anno,spec.md,Goals,0,must be fast,"quantify, ms?"',
      "  chat,-,-,0,-,tighten scope",
    ].join("\n"),
  );
});

test("lineDiff marks added, removed, and unchanged lines", () => {
  const before = "a\nb\nc\n";
  const after = "a\nB\nc\nd\n";
  assert.deepEqual(lineDiff(before, after), [
    { type: "same", text: "a" },
    { type: "del", text: "b" },
    { type: "add", text: "B" },
    { type: "same", text: "c" },
    { type: "add", text: "d" },
    { type: "same", text: "" },
  ]);
});

test("lineDiff on identical input is all 'same'", () => {
  const md = "# Title\n\nbody\n";
  assert.ok(lineDiff(md, md).every((op) => op.type === "same"));
});
