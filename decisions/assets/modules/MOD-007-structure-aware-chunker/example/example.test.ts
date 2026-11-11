import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkSections, estimateTokens } from "./portable-slice.mjs";

// A deterministic word-counter so budgeting assertions are exact and do not
// depend on the CJK heuristic. 1 token == 1 whitespace-delimited word.
const wordCount = (s: string): number => s.split(/\s+/).filter(Boolean).length;

test("empty / nullish input yields no chunks", () => {
  assert.deepEqual(chunkSections(null), []);
  assert.deepEqual(chunkSections(""), []);
  assert.deepEqual(chunkSections([]), []);
});

test("single short section becomes one chunk", () => {
  const out = chunkSections("hello world", { countTokens: wordCount });
  assert.equal(out.length, 1);
  assert.match(out[0], /hello world/);
});

test("greedy merge keeps small sections together under budget", () => {
  const sections = ["a a a", "b b b", "c c c"]; // 3 tokens each
  const out = chunkSections(sections, { chunkTokenNum: 100, countTokens: wordCount });
  assert.equal(out.length, 1, "all fit under budget => single chunk");
  assert.match(out[0], /a a a/);
  assert.match(out[0], /c c c/);
});

test("sections split into multiple chunks once budget is crossed", () => {
  // budget 5 tokens, each section 4 tokens; after one section (4) the next
  // crosses the threshold and starts a new chunk.
  const sections = ["w w w w", "x x x x", "y y y y"];
  const out = chunkSections(sections, { chunkTokenNum: 5, overlappedPercent: 0, countTokens: wordCount });
  assert.ok(out.length >= 2, `expected >=2 chunks, got ${out.length}`);
  // No token budget is grossly violated: every chunk near the budget band.
  for (const c of out) {
    assert.ok(wordCount(c) <= 9, `chunk too large: ${wordCount(c)} tokens`);
  }
});

test("character overlap carries a tail from the previous chunk", () => {
  // overlappedPercent=50 means a NEW chunk starts as soon as the current
  // chunk exceeds budget*0.5 tokens. With 3-token sections and budget 4, the
  // first section (3 > 2) immediately forces the next section into a fresh
  // chunk, and that fresh chunk is seeded with the trailing 50% of chunk 1.
  const sections = ["alpha bravo charlie", "delta echo foxtrot"];
  const out = chunkSections(sections, { chunkTokenNum: 4, overlappedPercent: 50, countTokens: wordCount });
  assert.ok(out.length >= 2, `expected >=2 chunks, got ${out.length}: ${JSON.stringify(out)}`);
  // Chunk 2 must contain content carried over from chunk 1 (a tail of its text).
  const chunk1 = out[0];
  const chunk2 = out[1];
  const tail = chunk1.slice(Math.floor(chunk1.length * 0.5));
  assert.ok(
    chunk2.startsWith(tail),
    `chunk2 should start with chunk1's 50% tail.\n tail=${JSON.stringify(tail)}\n chunk2=${JSON.stringify(chunk2)}`,
  );
});

test("zero overlap means chunks do not share carried text", () => {
  const sections = ["alpha bravo charlie", "delta echo foxtrot"];
  const out = chunkSections(sections, { chunkTokenNum: 4, overlappedPercent: 0, countTokens: wordCount });
  // With keepRatio=1, the second section appends rather than splitting => 1 chunk.
  assert.equal(out.length, 1);
  assert.match(out[0], /alpha bravo charlie/);
  assert.match(out[0], /delta echo foxtrot/);
});

test("position tag is appended to large-enough chunks", () => {
  const sections: Array<[string, string]> = [["one two three four five six seven eight nine", "@@PAGE1"]];
  const out = chunkSections(sections, { chunkTokenNum: 100, countTokens: wordCount });
  assert.equal(out.length, 1);
  assert.match(out[0], /@@PAGE1/, "position appended when token count >= 8");
});

test("position tag is dropped on tiny fragments", () => {
  const sections: Array<[string, string]> = [["hi", "@@POS"]];
  const out = chunkSections(sections, { chunkTokenNum: 100, countTokens: wordCount });
  assert.equal(out.length, 1);
  assert.doesNotMatch(out[0], /@@POS/, "position dropped when fragment < 8 tokens");
});

test("custom backtick delimiters trigger structure-aware hard split", () => {
  // "`## `" marks heading boundaries; each fragment becomes its own chunk,
  // and the delimiter token itself is dropped.
  const text = "intro## section A body## section B body";
  const out = chunkSections(text, { delimiter: "`## `", countTokens: wordCount });
  assert.equal(out.length, 3, `expected 3 fragments, got ${out.length}: ${JSON.stringify(out)}`);
  assert.match(out[0], /intro/);
  assert.match(out[1], /section A body/);
  assert.match(out[2], /section B body/);
  for (const c of out) assert.doesNotMatch(c, /## /, "delimiter token must be stripped");
});

test("estimateTokens counts CJK per-char and latin per-word", () => {
  assert.equal(estimateTokens("hello world"), 2);
  assert.equal(estimateTokens("你好世界"), 4); // 4 CJK chars => 4 tokens
  assert.equal(estimateTokens("hi 你好"), 3); // 1 word + 2 CJK
  assert.equal(estimateTokens(""), 0);
});
