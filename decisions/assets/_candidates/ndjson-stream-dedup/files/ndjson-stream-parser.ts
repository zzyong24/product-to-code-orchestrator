// ndjson-stream-parser.ts
// ----------------------------------------------------------------------------
// Blueprint: NDJSON stream parser with cross-line text dedup.
//
// Drop this beside your child-process / fetch-stream consumer. It turns a raw
// byte stream of newline-delimited JSON into a clean sequence of `delta` /
// `meta` events, solving the two failure modes naive parsers hit:
//
//   1. Object split across chunk boundaries  -> buffer by "\n", not by chunk.
//   2. Same turn emitted twice (streamed text_delta AND a final assistant
//      message body) -> a `sawStreamEventText` latch drops the duplicate.
//
// L2 reference (origin, Apache-2.0, do NOT run it — read only):
//   html-anything src/lib/agents/argv.ts:156-333   (ParseState + parseLineWithState)
//   html-anything src/lib/agents/invoke.ts:130-153 (per-spawn parser + newline buffer)
//
// This file is a rewrite. Adapt the envelope branches to your upstream's
// concrete JSON shape; the buffering + latch mechanics are protocol-agnostic.
// ----------------------------------------------------------------------------

export type ParseEvent =
  | { kind: "delta"; text: string }
  | { kind: "meta"; key: string; value: unknown }
  | { kind: "noise" };

/** Cross-line state carried between lines of ONE logical stream. */
export type ParseState = { sawStreamEventText?: boolean };

export function parseLine(line: string, state: ParseState): ParseEvent[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [{ kind: "noise" }];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const obj = parsed as Record<string, unknown>;
  const out: ParseEvent[] = [];

  // init / metadata envelope ------------------------------------------------
  if (obj.type === "system" && obj.subtype === "init") {
    if (obj.model) out.push({ kind: "meta", key: "model", value: obj.model });
    if (obj.session_id) out.push({ kind: "meta", key: "session", value: obj.session_id });
  }

  // fine-grained streamed deltas — latch on first text_delta ----------------
  if (obj.type === "stream_event" && obj.event && typeof obj.event === "object") {
    const ev = obj.event as { type?: string; delta?: { type?: string; text?: string; thinking?: string } };
    if (ev.delta?.type === "text_delta" && typeof ev.delta.text === "string") {
      state.sawStreamEventText = true; // <-- the dedup latch
      out.push({ kind: "delta", text: ev.delta.text });
    } else if (ev.delta?.type === "thinking_delta" && typeof ev.delta.thinking === "string") {
      out.push({ kind: "meta", key: "thinking", value: ev.delta.thinking });
    }
  }

  // consolidated assistant body — fallback ONLY if we never streamed --------
  if (obj.type === "assistant" && obj.message && typeof obj.message === "object") {
    const msg = obj.message as { content?: Array<{ type?: string; text?: string }>; usage?: Record<string, number> };
    if (!state.sawStreamEventText) {
      const text = (msg.content ?? [])
        .filter((c) => c?.type === "text" && typeof c.text === "string")
        .map((c) => c.text!)
        .join("");
      if (text) out.push({ kind: "delta", text });
    }
    if (msg.usage) out.push({ kind: "meta", key: "usage_partial", value: msg.usage });
  }

  // terminal frame ----------------------------------------------------------
  if (obj.type === "result") {
    if (obj.usage) out.push({ kind: "meta", key: "usage", value: obj.usage });
    if (typeof obj.duration_ms === "number") out.push({ kind: "meta", key: "duration_ms", value: obj.duration_ms });
  }

  return out;
}

/** One parser per logical stream — keeps the latch out of other streams. */
export function makeParser(): (line: string) => ParseEvent[] {
  const state: ParseState = {};
  return (line) => parseLine(line, state);
}

/**
 * Cross-chunk newline buffer. Wire `push` into your data handler and call
 * `flush` on close to drain a final unterminated line.
 *
 * Example (Node child_process):
 *   const acc = createStreamAccumulator();
 *   child.stdout.setEncoding("utf8");
 *   child.stdout.on("data", (c: string) => { for (const ev of acc.push(c)) emit(ev); });
 *   child.on("close", () => { for (const ev of acc.flush()) emit(ev); });
 *
 * Example (fetch ReadableStream):
 *   const reader = res.body!.getReader();
 *   const dec = new TextDecoder();
 *   const acc = createStreamAccumulator();
 *   for (;;) {
 *     const { value, done } = await reader.read();
 *     if (done) break;
 *     for (const ev of acc.push(dec.decode(value, { stream: true }))) emit(ev);
 *   }
 *   for (const ev of acc.flush()) emit(ev);
 */
export function createStreamAccumulator(): {
  push: (chunk: string) => ParseEvent[];
  flush: () => ParseEvent[];
} {
  const parse = makeParser();
  let buf = "";
  return {
    push(chunk) {
      buf += chunk;
      const events: ParseEvent[] = [];
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line) continue;
        for (const ev of parse(line)) events.push(ev);
      }
      return events;
    },
    flush() {
      if (!buf) return [];
      const tail = buf;
      buf = "";
      return parse(tail);
    },
  };
}
