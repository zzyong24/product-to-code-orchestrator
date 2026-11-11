import test from "node:test";
import assert from "node:assert/strict";
import { parseJsonLoose, extractText, createProviderWithSdk } from "./portable-slice.mjs";

test("MOD-002: parseJsonLoose 容忍 markdown 围栏", () => {
  // 断言以 parse.ts 实际行为为准:剥 ```json fence 再 JSON.parse。
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('{"a":1}'), { a: 1 });
});

test("MOD-002: provider.complete() 经 mock SDK 返回文本(供应商无关)", async () => {
  const mockSdk = {
    messages: {
      create: async ({ messages }) => ({ content: [{ type: "text", text: `echo:${messages[0].content}` }] }),
    },
  };
  const provider = createProviderWithSdk(mockSdk);
  const out = await provider.complete({ system: "s", prompt: "ping" });
  assert.equal(out, "echo:ping"); // extractText 从 content[].text 拼出
});
