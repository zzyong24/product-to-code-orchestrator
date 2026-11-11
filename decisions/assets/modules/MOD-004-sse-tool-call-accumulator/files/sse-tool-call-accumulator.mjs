// sse-tool-call-accumulator.mjs
// Blueprint: a transport-agnostic accumulator for OpenAI-protocol streaming
// chat completions (SSE). Drop-in core for "stream LLM tokens + collect
// fragmented tool_calls" in any JS/TS service.
//
// Provenance (rewritten, not copied):
//   go-stock @ ArvinLovegood/go-stock, Apache-2.0
//   backend/data/openai_tools.go:649-832  (AskAiWithToolsDepth SSE loop)
//
// The Go original is one 300-line function entangled with resty, GORM writes,
// a recursive depth guard, and an event channel back to a Wails webview. This
// blueprint extracts ONLY the protocol-level accumulation, which is the part
// worth reusing. Wire the three integration seams marked [SEAM] yourself.
//
// ── The hard parts this handles (and why naive code gets them wrong) ──
//   • tool_calls are STREAMED: for a given choice index, the first frame
//     carries {id, function.name}; every later frame carries only a fragment
//     of function.arguments. You MUST key by `index` and concatenate args, or
//     you end up with truncated/duplicated argument JSON.
//   • Multiple tool calls run in parallel and interleave by index. Preserve
//     first-seen order so downstream dispatch is deterministic.
//   • content vs reasoning_content are separate streams in the same delta.
//   • "[DONE]" is a sentinel, not JSON. Blank/comment lines and partial lines
//     (transport-chunked mid-frame) must not crash the parse.

export class StreamAccumulator {
  constructor() {
    this._content = [];
    this._reasoning = [];
    this._toolCalls = new Map(); // index -> { id, name, args: string[] }
    this._order = [];
    this._finishReason = null;
    this._lastId = "";
    this._lastModel = "";
  }

  pushChunk(chunk) {
    const events = [];
    if (chunk.id) this._lastId = chunk.id;
    if (chunk.model) this._lastModel = chunk.model;

    for (const choice of chunk.choices ?? []) {
      const delta = choice.delta ?? {};
      if (delta.content) {
        this._content.push(delta.content);
        events.push({ type: "content", value: delta.content });
      }
      if (delta.reasoning_content) {
        this._reasoning.push(delta.reasoning_content);
        events.push({ type: "reasoning", value: delta.reasoning_content });
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const call of delta.tool_calls) {
          const idx = call.index ?? 0;
          let tc = this._toolCalls.get(idx);
          if (!tc) {
            tc = { id: "", name: "", args: [] };
            this._toolCalls.set(idx, tc);
            this._order.push(idx);
          }
          if (call.id) tc.id = call.id;
          if (call.function?.name) tc.name = call.function.name;
          if (call.function?.arguments) tc.args.push(call.function.arguments);
        }
      }
      if (choice.finish_reason) this._finishReason = choice.finish_reason;
    }
    return events;
  }

  shouldHandleToolCalls() {
    const r = this._finishReason;
    return r === "tool_calls" || r === "tool_call" ||
           r === "function_call" || r === "function_calls";
  }

  isStopped() { return this._finishReason === "stop"; }

  finalizeToolCalls() {
    const out = [];
    for (const idx of this._order) {
      const tc = this._toolCalls.get(idx);
      if (!tc || tc.name === "") continue;
      out.push({ id: tc.id || `call_${idx}`, name: tc.name, arguments: tc.args.join("") });
    }
    return out;
  }

  finalizeMessage() {
    return {
      role: "assistant",
      content: this._content.join(""),
      reasoning_content: this._reasoning.join(""),
      id: this._lastId,
      model: this._lastModel,
    };
  }
}

export function parseSseLine(rawLine) {
  const line = rawLine.replace(/\r$/, "");
  if (!line.startsWith("data:")) return { kind: "ignore" };
  const data = line.slice("data:".length).trim();
  if (data === "[DONE]") return { kind: "done" };
  if (data === "") return { kind: "blank" };
  return { kind: "event", data };
}

// [SEAM 1] Feed bytes from a real transport (fetch ReadableStream / Node
// Readable) here, carrying `rest` across reads so partial frames survive.
export function splitLines(buffer) {
  const lines = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === "\n") { lines.push(buffer.slice(start, i)); start = i + 1; }
  }
  return { lines, rest: buffer.slice(start) };
}

// [SEAM 2] Replace the in-memory string with an async iterator over your
// transport. On { kind:"tool_calls" } you dispatch the calls, append results
// to the message history, and re-invoke the model (the recursion the Go
// version does via AskAiWithToolsDepth + a maxDepth guard — add your own
// depth cap to avoid infinite tool loops).
// [SEAM 3] `emit` is where you push deltas to your UI (Wails EventsEmit / SSE
// passthrough / WebSocket).
export function consumeSseStream(sseText, emit) {
  const acc = new StreamAccumulator();
  const { lines, rest } = splitLines(sseText);
  const allLines = rest === "" ? lines : [...lines, rest];
  for (const rawLine of allLines) {
    const parsed = parseSseLine(rawLine);
    if (parsed.kind === "ignore" || parsed.kind === "blank") continue;
    if (parsed.kind === "done") break;
    let chunk;
    try { chunk = JSON.parse(parsed.data); } catch { continue; }
    const events = acc.pushChunk(chunk);
    if (emit) for (const e of events) emit(e);
    if (acc.shouldHandleToolCalls())
      return { kind: "tool_calls", toolCalls: acc.finalizeToolCalls() };
    if (acc.isStopped())
      return { kind: "message", message: acc.finalizeMessage() };
  }
  const tools = acc.finalizeToolCalls();
  if (tools.length > 0) return { kind: "tool_calls", toolCalls: tools };
  return { kind: "message", message: acc.finalizeMessage() };
}
