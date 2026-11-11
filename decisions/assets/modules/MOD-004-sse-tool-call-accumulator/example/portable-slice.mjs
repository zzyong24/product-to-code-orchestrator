// portable-slice.mjs
// Zero-dependency rewrite of go-stock's OpenAI-protocol SSE stream accumulator.
// Origin (L2 reference, rewritten not copied):
//   backend/data/openai_tools.go:649-832  (AskAiWithToolsDepth stream loop)
//
// What it does — the reusable core of streaming-LLM plumbing:
//   1. Parse an SSE text stream line-by-line: strip the "data:" prefix,
//      stop on the "[DONE]" sentinel, skip blank/keepalive lines.
//   2. Accumulate `content` and `reasoning_content` deltas into separate buffers.
//   3. Accumulate INCREMENTAL tool_calls: name + id arrive in the first frame for
//      a given `index`, while `arguments` stream as fragments across many frames
//      and must be concatenated. First-seen index order is preserved.
//   4. On a tool-call finish_reason, hand back the assembled tool calls; on a
//      plain "stop", hand back the assembled assistant message.
//
// No third-party imports. Pure functions + a small stateful accumulator class.

// ---- SSE line framing ---------------------------------------------------

// Parse one raw SSE line into { kind, data }.
//   kind: "event" | "done" | "blank" | "ignore"
// Mirrors the Go loop's `strings.HasPrefix(line, "data:")` + "[DONE]" check.
export function parseSseLine(rawLine) {
  const line = rawLine.replace(/\r$/, "");
  if (!line.startsWith("data:")) {
    // SSE comments (":...") and other fields (event:, id:) are not payload here.
    return { kind: "ignore" };
  }
  const data = line.slice("data:".length).trim();
  if (data === "[DONE]") return { kind: "done" };
  if (data === "") return { kind: "blank" };
  return { kind: "event", data };
}

// Split a (possibly chunked) buffer into complete lines, returning the
// leftover partial line so callers can feed a network stream incrementally.
// This is the "handle partial frames" guarantee: a frame split mid-line by
// the transport never gets parsed until its newline arrives.
export function splitLines(buffer) {
  const lines = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === "\n") {
      lines.push(buffer.slice(start, i));
      start = i + 1;
    }
  }
  return { lines, rest: buffer.slice(start) };
}

// ---- Streaming accumulator ----------------------------------------------

// Why a class: tool_call fragments arrive across many SSE events keyed by
// `index`; we need stable cross-event state. Maps to the Go closure's
// `toolCalls map[int]*pendingToolCall` + `toolCallOrder []int`.
export class StreamAccumulator {
  constructor() {
    this._content = [];        // joined -> assistant text
    this._reasoning = [];      // joined -> reasoning_content
    this._toolCalls = new Map(); // index -> { id, name, args: string[] }
    this._order = [];          // first-seen index order
    this._finishReason = null;
    this._lastId = "";
    this._lastModel = "";
  }

  // Feed one parsed OpenAI-style streaming chunk object (the JSON after "data:").
  // Returns the list of per-delta events emitted by this chunk so a UI can
  // render token-by-token (maps to the Go `ch <- map[string]any{...}` sends).
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
          // name + id land in the first frame; arguments stream as fragments.
          if (call.id) tc.id = call.id;
          if (call.function?.name) tc.name = call.function.name;
          if (call.function?.arguments) tc.args.push(call.function.arguments);
        }
      }
      if (choice.finish_reason) {
        this._finishReason = choice.finish_reason;
      }
    }
    return events;
  }

  // Should the caller now dispatch the assembled tool calls?
  // Go's shouldHandleToolCalls accepts several aliases for the finish reason.
  shouldHandleToolCalls() {
    const r = this._finishReason;
    return (
      r === "tool_calls" ||
      r === "tool_call" ||
      r === "function_call" ||
      r === "function_calls"
    );
  }

  isStopped() {
    return this._finishReason === "stop";
  }

  // Assemble the final tool calls in first-seen order. Each `index` that only
  // ever carried a partial/empty name is dropped (Go: `call.Name == ""` skip).
  // Synthesizes a deterministic id when the provider never sent one
  // (Go: `call_%d`).
  finalizeToolCalls() {
    const out = [];
    for (const idx of this._order) {
      const tc = this._toolCalls.get(idx);
      if (!tc || tc.name === "") continue;
      out.push({
        id: tc.id || `call_${idx}`,
        name: tc.name,
        arguments: tc.args.join(""),
      });
    }
    return out;
  }

  // Assemble the final assistant message (for a plain "stop").
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

// ---- One-shot convenience runner ----------------------------------------

// Drive a whole SSE text body through the accumulator. `emit` (optional) is
// called for every per-delta event, enabling live rendering. Returns the
// terminal outcome: either tool calls to dispatch, or the final message.
export function consumeSseStream(sseText, emit) {
  const acc = new StreamAccumulator();
  let buffer = sseText;
  const { lines, rest } = splitLines(buffer);
  const allLines = rest === "" ? lines : [...lines, rest];

  for (const rawLine of allLines) {
    const parsed = parseSseLine(rawLine);
    if (parsed.kind === "ignore" || parsed.kind === "blank") continue;
    if (parsed.kind === "done") break;

    let chunk;
    try {
      chunk = JSON.parse(parsed.data);
    } catch {
      // Malformed frame: skip it, keep streaming (Go logs + continues).
      continue;
    }
    const events = acc.pushChunk(chunk);
    if (emit) for (const e of events) emit(e);

    if (acc.shouldHandleToolCalls()) {
      return { kind: "tool_calls", toolCalls: acc.finalizeToolCalls() };
    }
    if (acc.isStopped()) {
      return { kind: "message", message: acc.finalizeMessage() };
    }
  }
  // Stream ended (DONE / EOF) without an explicit finish reason: best-effort
  // assemble whatever we have, preferring tool calls if any were seen.
  const tools = acc.finalizeToolCalls();
  if (tools.length > 0) return { kind: "tool_calls", toolCalls: tools };
  return { kind: "message", message: acc.finalizeMessage() };
}
