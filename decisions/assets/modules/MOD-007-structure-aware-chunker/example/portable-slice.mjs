// portable-slice.mjs — zero-dependency structure-aware document chunker.
//
// Rewritten (NOT copied) from RAGFlow's rag/nlp/__init__.py:naive_merge
// (Apache-2.0). The original is Python, coupled to a tiktoken-based token
// counter and a PDF-tag stripper. This rewrite keeps ONLY the algorithm:
//
//   greedy-merge sections into chunks under a token budget, carry a
//   character-level overlap tail from the previous chunk, plus an optional
//   hard-split mode driven by custom delimiters.
//
// No third-party imports. The token counter is injectable; a cheap default
// (whitespace + CJK-char heuristic) ships so the module runs standalone.

/**
 * Default token estimator: counts CJK characters individually and
 * whitespace-delimited runs of non-CJK as ~1 token each. Good enough for
 * budgeting; swap in tiktoken/your tokenizer via opts.countTokens.
 * @param {string} s
 * @returns {number}
 */
export function estimateTokens(s) {
  if (!s) return 0;
  let cjk = 0;
  let stripped = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    // CJK Unified Ideographs + common Kana/Hangul ranges, counted per-char.
    if (
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0x3040 && cp <= 0x30ff) ||
      (cp >= 0xac00 && cp <= 0xd7a3)
    ) {
      cjk++;
    } else {
      stripped += ch;
    }
  }
  const words = stripped.split(/\s+/).filter(Boolean).length;
  return cjk + words;
}

/**
 * Extract custom delimiters wrapped in backticks, e.g. "`\n## `" -> ["\n## "].
 * Mirrors RAGFlow's `([^`]+)` convention for explicit structure boundaries.
 * @param {string} delimiter
 * @returns {string[]}
 */
function parseCustomDelimiters(delimiter) {
  const out = [];
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(delimiter)) !== null) out.push(m[1]);
  return out;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MIN_POS_TOKENS = 8; // positions/tags on tiny fragments are noise; drop.

/**
 * Hard-split mode: when the delimiter string contains backtick-wrapped
 * markers, split each section on those markers and emit every fragment as
 * its own chunk (structure-aware split — no budget merging). The markers
 * themselves are dropped from output.
 * @param {Array<[string,string]>} sections  pairs of [text, position]
 * @param {string[]} customDelimiters
 * @param {(s:string)=>number} countTokens
 * @returns {string[]}
 */
function splitByCustomDelimiters(sections, customDelimiters, countTokens) {
  const uniq = [...new Set(customDelimiters)].sort((a, b) => b.length - a.length);
  const pattern = uniq.map(escapeRegExp).join("|");
  const splitRe = new RegExp(`(${pattern})`, "s");
  const fullRe = new RegExp(`^(?:${pattern})$`, "s");

  const chunks = [];
  for (const [sec, pos] of sections) {
    for (const sub of sec.split(splitRe)) {
      if (sub === undefined || sub === "") continue;
      if (fullRe.test(sub)) continue; // drop the delimiter token itself
      let text = "\n" + sub;
      let localPos = pos;
      if (countTokens(text) < MIN_POS_TOKENS) localPos = "";
      if (localPos && text.indexOf(localPos) < 0) text += localPos;
      chunks.push(text);
    }
  }
  return chunks;
}

/**
 * Normalize the `sections` input into an array of [text, position] pairs.
 * Accepts a bare string, an array of strings, or an array of [text,pos].
 * @param {string | Array<string | [string,string]>} sections
 * @returns {Array<[string,string]>}
 */
function normalizeSections(sections) {
  if (sections == null) return [];
  if (typeof sections === "string") sections = [sections];
  if (sections.length === 0) return [];
  return sections
    .map((s) => (typeof s === "string" ? [s, ""] : [s[0], s[1] ?? ""]))
    .filter(([text]) => text != null && text !== "");
}

/**
 * Greedily merge sections into chunks bounded by a token budget, carrying a
 * character-level overlap tail from the tail of the previous chunk into the
 * head of the next.
 *
 * Core invariant (from RAGFlow): a NEW chunk is started whenever the current
 * chunk's token count has already crossed `budget * (100 - overlap%) / 100`.
 * On starting a new chunk, the trailing `overlap%` characters of the previous
 * chunk are prepended, giving sliding-window continuity across boundaries.
 *
 * @param {string | Array<string | [string,string]>} sections
 * @param {object} [opts]
 * @param {number} [opts.chunkTokenNum=128]      target tokens per chunk
 * @param {string} [opts.delimiter="\n。；！？"]  backtick-wrapped markers => hard-split mode
 * @param {number} [opts.overlappedPercent=0]     0..100 character overlap between chunks
 * @param {(s:string)=>number} [opts.countTokens] token estimator (injectable)
 * @returns {string[]} chunk texts
 */
export function chunkSections(sections, opts = {}) {
  const {
    chunkTokenNum = 128,
    delimiter = "\n。；！？",
    overlappedPercent = 0,
    countTokens = estimateTokens,
  } = opts;

  const norm = normalizeSections(sections);
  if (norm.length === 0) return [];

  const overlap = Math.max(0, Math.min(100, overlappedPercent));
  const keepRatio = (100 - overlap) / 100;

  const customDelimiters = parseCustomDelimiters(delimiter);
  if (customDelimiters.length > 0) {
    return splitByCustomDelimiters(norm, customDelimiters, countTokens);
  }

  const cks = [""];
  const tkNums = [0];

  const addChunk = (rawText, position) => {
    let t = rawText;
    const tnum = countTokens(t);
    let pos = position || "";
    if (tnum < MIN_POS_TOKENS) pos = "";

    const startNew = cks[cks.length - 1] === "" || tkNums[tkNums.length - 1] > chunkTokenNum * keepRatio;

    if (startNew) {
      const prev = cks[cks.length - 1];
      if (overlap > 0 && prev) {
        const tail = prev.slice(Math.floor(prev.length * keepRatio));
        t = tail + t;
      }
      if (pos && t.indexOf(pos) < 0) t += pos;
      cks.push(t);
      tkNums.push(tnum);
    } else {
      if (pos && cks[cks.length - 1].indexOf(pos) < 0) t += pos;
      cks[cks.length - 1] += t;
      tkNums[tkNums.length - 1] += tnum;
    }
  };

  for (const [sec, pos] of norm) addChunk("\n" + sec, pos);

  // Drop the seed empty chunk if it was never written into.
  return cks[0] === "" ? cks.slice(1) : cks;
}
