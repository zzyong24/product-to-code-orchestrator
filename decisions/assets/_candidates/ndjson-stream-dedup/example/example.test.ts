// example.test.ts
// Run: node --test --experimental-strip-types example/example.test.ts  (node v22)
//
// Asserts the two load-bearing behaviors of the NDJSON stream parser:
//   (1) newline buffering across arbitrary chunk boundaries
//   (2) cross-line dedup: a final `assistant` body is dropped when the same
//       turn was already delivered as streamed `text_delta` events.
//
// No SDK, no child_process, no network. The "stream" is just an array of
// strings sliced at adversarial offsets.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeParser,
  parseLine,
  createStreamAccumulator,
  accumulateText,
} from "./portable-slice.mjs";

// --- helpers ----------------------------------------------------------------

/** Split a full NDJSON document into N near-equal raw chunks (boundary-blind). */
function chunkize(doc: string, n: number): string[] {
  const out: string[] = [];
  const size = Math.ceil(doc.length / n);
  for (let i = 0; i < doc.length; i += size) out.push(doc.slice(i, i + size));
  return out;
}

const lines = (...objs: unknown[]) =>
  objs.map((o) => JSON.stringify(o)).join("\n") + "\n";

// ---------------------------------------------------------------------------

test("streamed text_delta events concatenate in order", () => {
  const parse = makeParser();
  const evs = [
    ...parse(JSON.stringify({ type: "stream_event", event: { delta: { type: "text_delta", text: "Hel" } } })),
    ...parse(JSON.stringify({ type: "stream_event", event: { delta: { type: "text_delta", text: "lo" } } })),
  ];
  const text = evs.filter((e) => e.kind === "delta").map((e: any) => e.text).join("");
  assert.equal(text, "Hello");
});

test("assistant body is DROPPED once stream_event text was seen (dedup latch)", () => {
  const parse = makeParser();
  // streamed tokens first...
  parse(JSON.stringify({ type: "stream_event", event: { delta: { type: "text_delta", text: "<!DOCTYPE html>" } } }));
  // ...then the consolidated assistant message carrying the SAME text.
  const evs = parse(
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "<!DOCTYPE html>" }] },
    }),
  );
  const deltas = evs.filter((e) => e.kind === "delta");
  assert.equal(deltas.length, 0, "assistant body must not re-emit streamed text");
});

test("assistant body IS used when no stream_event text was seen (fallback)", () => {
  const parse = makeParser();
  const evs = parse(
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "fallback body" }] },
    }),
  );
  const text = evs.filter((e) => e.kind === "delta").map((e: any) => e.text).join("");
  assert.equal(text, "fallback body");
});

test("each makeParser() has isolated latch (no cross-stream leak)", () => {
  const a = makeParser();
  const b = makeParser();
  // stream A latches...
  a(JSON.stringify({ type: "stream_event", event: { delta: { type: "text_delta", text: "x" } } }));
  // ...but stream B must still accept its own assistant fallback.
  const evs = b(JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "B" }] } }));
  assert.equal(evs.filter((e) => e.kind === "delta").length, 1);
});

test("accumulator reassembles objects split across chunk boundaries", () => {
  const doc = lines(
    { type: "system", subtype: "init", model: "m", session_id: "s1" },
    { type: "stream_event", event: { delta: { type: "text_delta", text: "AB" } } },
    { type: "stream_event", event: { delta: { type: "text_delta", text: "CD" } } },
    { type: "assistant", message: { content: [{ type: "text", text: "ABCD" }] } },
    { type: "result", usage: { input_tokens: 1 } },
  );
  // Try several adversarial chunk counts incl. 1-byte chunks.
  for (const n of [1, 2, 3, 7, doc.length]) {
    assert.equal(accumulateText(chunkize(doc, n)), "ABCD", `n=${n}`);
  }
});

test("meta events surface model/session/usage", () => {
  const acc = createStreamAccumulator();
  const all = [
    ...acc.push(lines(
      { type: "system", subtype: "init", model: "claude-x", session_id: "sess" },
    )),
    ...acc.push(lines({ type: "result", usage: { output_tokens: 42 } })),
    ...acc.flush(),
  ];
  const metas = all.filter((e) => e.kind === "meta") as any[];
  assert.equal(metas.find((m) => m.key === "model")?.value, "claude-x");
  assert.equal(metas.find((m) => m.key === "session")?.value, "sess");
  assert.deepEqual(metas.find((m) => m.key === "usage")?.value, { output_tokens: 42 });
});

test("non-JSON lines become noise, not crashes", () => {
  const evs = parseLine("this is not json", {});
  assert.equal(evs.length, 1);
  assert.equal(evs[0].kind, "noise");
});

test("flush emits a trailing line with no terminating newline", () => {
  const acc = createStreamAccumulator();
  // push a complete object WITHOUT trailing "\n" — it stays buffered...
  let evs = acc.push(JSON.stringify({ type: "stream_event", event: { delta: { type: "text_delta", text: "tail" } } }));
  assert.equal(evs.filter((e) => e.kind === "delta").length, 0, "no newline yet → buffered");
  // ...until flush.
  evs = acc.flush();
  assert.equal(evs.filter((e) => e.kind === "delta").map((e: any) => e.text).join(""), "tail");
});

test("blank lines between objects are skipped", () => {
  const doc =
    JSON.stringify({ type: "stream_event", event: { delta: { type: "text_delta", text: "P" } } }) +
    "\n\n\n" +
    JSON.stringify({ type: "stream_event", event: { delta: { type: "text_delta", text: "Q" } } }) +
    "\n";
  assert.equal(accumulateText([doc]), "PQ");
});
