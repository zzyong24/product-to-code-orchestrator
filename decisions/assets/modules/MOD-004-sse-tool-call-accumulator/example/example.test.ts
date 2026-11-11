// example.test.ts
// node:test + node:assert/strict. Run:
//   node --test --experimental-strip-types example.test.ts   (node v22)
//
// Asserts the core SSE-accumulator behavior with a mocked OpenAI-style stream.
// No SDK, no network: the "stream" is a plain string of SSE frames.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseSseLine,
  splitLines,
  StreamAccumulator,
  consumeSseStream,
} from "./portable-slice.mjs";

// Build an SSE frame the way an OpenAI-compatible endpoint emits it.
function frame(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n`;
}

test("parseSseLine: classifies data / done / blank / ignore", () => {
  assert.deepEqual(parseSseLine('data: {"a":1}'), {
    kind: "event",
    data: '{"a":1}',
  });
  assert.deepEqual(parseSseLine("data: [DONE]"), { kind: "done" });
  assert.deepEqual(parseSseLine("data:"), { kind: "blank" });
  assert.deepEqual(parseSseLine(": keepalive"), { kind: "ignore" });
  // trailing CR (\r\n transports) is stripped before the [DONE] check
  assert.deepEqual(parseSseLine("data: [DONE]\r"), { kind: "done" });
});

test("splitLines: returns complete lines and a partial leftover", () => {
  const { lines, rest } = splitLines("a\nb\nhalf");
  assert.deepEqual(lines, ["a", "b"]);
  assert.equal(rest, "half");
});

test("content + reasoning deltas accumulate into separate buffers", () => {
  const sse =
    frame({ id: "x1", model: "m", choices: [{ delta: { reasoning_content: "think" } }] }) +
    frame({ id: "x1", model: "m", choices: [{ delta: { content: "Hel" } }] }) +
    frame({ id: "x1", model: "m", choices: [{ delta: { content: "lo" } }] }) +
    frame({ id: "x1", model: "m", choices: [{ delta: {}, finish_reason: "stop" }] }) +
    "data: [DONE]\n";

  const seen: string[] = [];
  const out = consumeSseStream(sse, (e) => seen.push(`${e.type}:${e.value}`));

  assert.equal(out.kind, "message");
  assert.equal(out.message.content, "Hello");
  assert.equal(out.message.reasoning_content, "think");
  assert.equal(out.message.id, "x1");
  // live per-delta events fired in order
  assert.deepEqual(seen, ["reasoning:think", "content:Hel", "content:lo"]);
});

test("incremental tool_calls: name in first frame, arguments concatenated", () => {
  // The defining behavior: arguments stream as fragments keyed by index.
  const sse =
    frame({
      choices: [
        {
          delta: {
            tool_calls: [
              { index: 0, id: "call_abc", function: { name: "GetStockKLine", arguments: '{"cod' } },
            ],
          },
        },
      ],
    }) +
    frame({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'e":"600' } }] } }] }) +
    frame({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '519"}' } }] } }] }) +
    frame({ choices: [{ delta: {}, finish_reason: "tool_calls" }] });

  const out = consumeSseStream(sse);
  assert.equal(out.kind, "tool_calls");
  assert.equal(out.toolCalls.length, 1);
  assert.deepEqual(out.toolCalls[0], {
    id: "call_abc",
    name: "GetStockKLine",
    arguments: '{"code":"600519"}',
  });
  // arguments are valid JSON once reassembled
  assert.deepEqual(JSON.parse(out.toolCalls[0].arguments), { code: "600519" });
});

test("parallel tool_calls keep first-seen index order and synthesize ids", () => {
  // Two interleaved tool calls; index 1 appears before index 0 is completed,
  // and index 1 never carries an id -> deterministic call_<idx> fallback.
  const sse =
    frame({
      choices: [
        {
          delta: {
            tool_calls: [
              { index: 0, id: "call_zero", function: { name: "A", arguments: "{" } },
            ],
          },
        },
      ],
    }) +
    frame({ choices: [{ delta: { tool_calls: [{ index: 1, function: { name: "B", arguments: "[" } }] } }] }) +
    frame({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: "}" } }] } }] }) +
    frame({ choices: [{ delta: { tool_calls: [{ index: 1, function: { arguments: "]" } }] } }] }) +
    frame({ choices: [{ delta: {}, finish_reason: "tool_calls" }] });

  const out = consumeSseStream(sse);
  assert.equal(out.kind, "tool_calls");
  assert.deepEqual(out.toolCalls, [
    { id: "call_zero", name: "A", arguments: "{}" },
    { id: "call_1", name: "B", arguments: "[]" },
  ]);
});

test("malformed frame is skipped, stream keeps going", () => {
  const sse =
    frame({ choices: [{ delta: { content: "ok" } }] }) +
    "data: {not json}\n" +
    frame({ choices: [{ delta: { content: "!" }, finish_reason: "stop" }] });

  const out = consumeSseStream(sse);
  assert.equal(out.kind, "message");
  assert.equal(out.message.content, "ok!");
});

test("tool calls with empty name are dropped from finalize", () => {
  const acc = new StreamAccumulator();
  acc.pushChunk({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: "x" } }] } }] });
  // index 0 only ever had arguments, never a name -> dropped
  assert.deepEqual(acc.finalizeToolCalls(), []);
});

test("[DONE] without explicit finish_reason still assembles message", () => {
  const sse =
    frame({ choices: [{ delta: { content: "partial" } }] }) + "data: [DONE]\n";
  const out = consumeSseStream(sse);
  assert.equal(out.kind, "message");
  assert.equal(out.message.content, "partial");
});
