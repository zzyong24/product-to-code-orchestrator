// MOD-002 portable slice — 从 files/parse.ts + provider.ts 抽出的零依赖切片。
// 真 @anthropic-ai/sdk 路径见 files/anthropic-adapter.ts;本切片用 mock SDK 证明
// "供应商无关 complete()" 抽象 + 解析助手自洽。

// —— 以下三个函数 = files/parse.ts 真实现,去 import "server-only" + TS 类型注解(逻辑未改)——
export function parseJsonLoose(text) {
  if (!text) return undefined;
  let body = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(body);
  if (fence?.[1]) body = fence[1].trim();
  const candidates = [];
  const obj = [body.indexOf("{"), body.lastIndexOf("}")];
  const arr = [body.indexOf("["), body.lastIndexOf("]")];
  if (obj[0] !== -1 && obj[1] > obj[0]) candidates.push(obj);
  if (arr[0] !== -1 && arr[1] > arr[0]) candidates.push(arr);
  candidates.sort((a, b) => a[0] - b[0]);
  for (const [start, end] of candidates) {
    try { return JSON.parse(body.slice(start, end + 1)); } catch { /* try next */ }
  }
  return undefined;
}

export function extractText(message) {
  const content = message?.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => !!b && typeof b === "object" && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
}

export function buildSystem(system, schema) {
  const parts = [];
  if (system && system.trim()) parts.push(system.trim());
  if (schema !== undefined) parts.push("只输出符合所需结构的 JSON,不要解释、不要代码块包裹。");
  return parts.length ? parts.join("\n\n") : undefined;
}

// 供应商无关 provider:注入一个 mock SDK(.messages.create),证明 adapter 不绑死真 SDK。
export function createProviderWithSdk(sdk) {
  return {
    async complete({ system, prompt }) {
      const res = await sdk.messages.create({ system, messages: [{ role: "user", content: prompt }] });
      return extractText(res);
    },
  };
}
