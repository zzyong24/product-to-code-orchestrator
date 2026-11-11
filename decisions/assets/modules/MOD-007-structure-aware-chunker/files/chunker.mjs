// chunker.mjs — blueprint: structure-aware document chunker (zero-dep core).
//
// L2 reference (origin, do NOT run): RAGFlow rag/nlp/__init__.py:naive_merge
//   https://github.com/infiniflow/ragflow  (Apache-2.0, v0.25.4)
//
// This is the production-shaped blueprint. The runnable proof lives in
// ../example/portable-slice.mjs (identical core; this file adds the structural
// comments explaining WHY each branch exists so you can adapt it safely).
//
// ---------------------------------------------------------------------------
// PROBLEM
// ---------------------------------------------------------------------------
// A parser hands you an ordered list of text "sections" (paragraphs, table
// rows, OCR blocks), each optionally tagged with a position marker (page/bbox).
// You need to pack them into retrieval chunks that:
//   (a) stay under a token budget (so they fit an embedding model window),
//   (b) overlap at the edges (so a fact split across a boundary is still
//       recallable from at least one chunk), and
//   (c) respect explicit structure markers (headings) as hard cut points when
//       the caller supplies them.
//
// This is a pure string+number algorithm. No tokenizer, no IO, no SDK.
//
// ---------------------------------------------------------------------------
// TWO MODES
// ---------------------------------------------------------------------------
// 1. GREEDY-MERGE (default): walk sections, accumulate into the current chunk
//    until token count crosses `budget * (100 - overlap%)/100`, then open a new
//    chunk seeded with the trailing `overlap%` characters of the previous one.
//    -> sliding window with overlap, but merges small sections instead of
//       blindly cutting every N chars.
//
// 2. HARD-SPLIT: if `delimiter` contains backtick-wrapped markers (e.g.
//    "`\n## `"), split each section on those markers and emit every fragment
//    as its own chunk. The marker itself is dropped. Use when the document has
//    authoritative structure (markdown headings) you must not merge across.
//
// ---------------------------------------------------------------------------
// PORTABILITY NOTES (what was rewritten away from the origin)
// ---------------------------------------------------------------------------
//   - Origin counted tokens with tiktoken; here `countTokens` is injected and
//     defaults to a CJK-aware heuristic so the module is standalone.
//   - Origin stripped PDF position tags via RAGFlowPdfParser.remove_tag before
//     computing the overlap tail; here the overlap tail is a plain char slice.
//     If your sections embed inline tags, strip them in `countTokens` / before
//     calling, or reintroduce a remove-tag hook.
//   - MIN_POS_TOKENS=8: positions on tiny fragments are dropped as noise —
//     keep this, it prevents page markers polluting one-word chunks.

export { chunkSections, estimateTokens } from "../example/portable-slice.mjs";

// ---------------------------------------------------------------------------
// WHEN TO REACH FOR THIS
// ---------------------------------------------------------------------------
//   RAG ingestion, log/transcript windowing, any "pack ordered fragments into
//   budgeted, overlapping windows" task.
//
// WHEN NOT TO:
//   - You need semantic/embedding-driven split points (use a semantic chunker).
//   - Fragments have no ordering or budget matters not at all.
//   - You need exact tokenizer parity with a specific model at ingest time —
//     then inject that model's real tokenizer as `countTokens`, do not trust
//     the heuristic for billing-grade counts.
