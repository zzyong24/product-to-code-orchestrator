// portable-slice.mjs
// ----------------------------------------------------------------------------
// Zero-dependency rewrite of html-anything's NDJSON stream parser.
//
// PROBLEM (inherited idea, not code):
//   A child-process / network source streams newline-delimited JSON (NDJSON)
//   in arbitrary chunks. Two hard parts that every naive parser gets wrong:
//     1. A single JSON object can be split across two read()/data chunks, and
//        a single chunk can contain many objects. You must buffer by newline,
//        NOT by chunk boundary.
//     2. Some upstreams emit the SAME text twice: once as fine-grained
//        `text_delta` stream events AND again as one consolidated `assistant`
//        message at the end (e.g. anything run with --include-partial-messages).
//        Without cross-line state you write the whole output twice.
//
// This slice keeps the two load-bearing mechanics — newline buffering across
// chunks + a `sawStreamEventText` latch — as pure JS. No child_process, no
// SDK, no third-party package. Feed it bytes; get back deduped events.
//
// Rewritten from: html-anything src/lib/agents/{argv.ts,invoke.ts}
// License of origin: Apache-2.0 (permissive). This is a rewrite, not a copy.
// ----------------------------------------------------------------------------

/**
 * @typedef {{ kind: "delta", text: string }
 *          | { kind: "meta", key: string, value: unknown }
 *          | { kind: "noise" }} ParseEvent
 */

/**
 * Parse one already-split NDJSON line into zero or more events, mutating the
 * cross-line `state` so later lines can be deduped against earlier ones.
 *
 * The envelope shape modeled here is the common "stream-json" family:
 *   { type: "system",  subtype: "init", model, session_id }
 *   { type: "stream_event", event: { type, delta: { type, text } } }
 *   { type: "assistant", message: { content: [{ type, text }] } }
 *   { type: "result", usage }
 *
 * @param {string} line   one raw line (no trailing newline)
 * @param {{ sawStreamEventText?: boolean }} state  carried across calls
 * @returns {ParseEvent[]}
 */
export function parseLine(line, state) {
  const trimmed = line.trim();
  if (!trimmed) return [];

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Not JSON — surface as noise so callers can choose to log a raw preview
    // instead of silently dropping protocol violations.
    return [{ kind: "noise" }];
  }
  if (!parsed || typeof parsed !== "object") return [];

  const obj = /** @type {Record<string, unknown>} */ (parsed);
  /** @type {ParseEvent[]} */
  const out = [];

  // --- init / session metadata ---------------------------------------------
  if (obj.type === "system" && obj.subtype === "init") {
    if (obj.model) out.push({ kind: "meta", key: "model", value: obj.model });
    if (obj.session_id)
      out.push({ kind: "meta", key: "session", value: obj.session_id });
  }

  // --- fine-grained streamed text deltas -----------------------------------
  // The moment we see ONE streamed text_delta we latch sawStreamEventText.
  // That latch is the whole point: it tells the assistant-message branch below
  // "the streamed tokens already cover this turn, do not re-emit the body".
  if (
    obj.type === "stream_event" &&
    obj.event &&
    typeof obj.event === "object"
  ) {
    const ev = /** @type {{ type?: string, delta?: { type?: string, text?: string, thinking?: string } }} */ (
      obj.event
    );
    if (ev.delta?.type === "text_delta" && typeof ev.delta.text === "string") {
      state.sawStreamEventText = true;
      out.push({ kind: "delta", text: ev.delta.text });
    } else if (
      ev.delta?.type === "thinking_delta" &&
      typeof ev.delta.thinking === "string"
    ) {
      out.push({ kind: "meta", key: "thinking", value: ev.delta.thinking });
    }
  }

  // --- consolidated assistant message (fallback only) ----------------------
  // Older sources (or sources without partial-message streaming) only emit
  // this. We honor it ONLY when no streamed text_delta was seen — otherwise it
  // is a verbatim duplicate of everything we already streamed.
  if (obj.type === "assistant" && obj.message && typeof obj.message === "object") {
    const msg = /** @type {{ content?: Array<{ type?: string, text?: string }>, usage?: Record<string, number> }} */ (
      obj.message
    );
    if (!state.sawStreamEventText) {
      const text = (msg.content ?? [])
        .filter((c) => c?.type === "text" && typeof c.text === "string")
        .map((c) => c.text)
        .join("");
      if (text) out.push({ kind: "delta", text });
    }
    if (msg.usage)
      out.push({ kind: "meta", key: "usage_partial", value: msg.usage });
  }

  // --- terminal result frame -----------------------------------------------
  if (obj.type === "result") {
    if (obj.usage) out.push({ kind: "meta", key: "usage", value: obj.usage });
    if (typeof obj.duration_ms === "number")
      out.push({ kind: "meta", key: "duration_ms", value: obj.duration_ms });
  }

  return out;
}

/**
 * Build a stateful per-stream parser. One factory call == one logical stream;
 * the latch lives in the returned closure so concurrent streams never leak
 * dedupe state into each other.
 *
 * @returns {(line: string) => ParseEvent[]}
 */
export function makeParser() {
  /** @type {{ sawStreamEventText?: boolean }} */
  const state = {};
  return (line) => parseLine(line, state);
}

/**
 * Wrap a parser with cross-chunk newline buffering. This is the half that
 * `invoke.ts` does inside the child.stdout 'data' handler: accumulate, split
 * on every complete "\n", keep the unterminated tail for the next chunk.
 *
 * Usage:
 *   const acc = createStreamAccumulator();
 *   for (const chunk of chunks) for (const ev of acc.push(chunk)) handle(ev);
 *   for (const ev of acc.flush()) handle(ev);   // trailing line w/o newline
 *
 * @returns {{ push: (chunk: string) => ParseEvent[], flush: () => ParseEvent[] }}
 */
export function createStreamAccumulator() {
  const parse = makeParser();
  let buf = "";

  return {
    push(chunk) {
      buf += chunk;
      /** @type {ParseEvent[]} */
      const events = [];
      let nl;
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

/**
 * Convenience: collect just the concatenated text deltas from a sequence of
 * arbitrarily-chunked NDJSON input. This is what a consumer ultimately wants.
 *
 * @param {Iterable<string>} chunks
 * @returns {string}
 */
export function accumulateText(chunks) {
  const acc = createStreamAccumulator();
  let text = "";
  const drain = (events) => {
    for (const ev of events) if (ev.kind === "delta") text += ev.text;
  };
  for (const chunk of chunks) drain(acc.push(chunk));
  drain(acc.flush());
  return text;
}
