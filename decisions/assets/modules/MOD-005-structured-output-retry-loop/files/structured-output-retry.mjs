// structured-output-retry.mjs — blueprint
// ============================================================================
// Reusable "validate -> retry -> feedback" loop for any producer whose output
// must satisfy a structured contract (LLM JSON, codegen, form extraction, ...).
//
// Provenance (L2 reference, REWRITTEN not copied):
//   pydantic-ai @ 60f51471c
//   - exceptions.py:40            ModelRetry  (recoverable signal w/ message)
//   - _output.py:122             _make_retry_prompt (error -> RetryPromptPart fed back)
//   - _agent_graph.py / tool_manager.py  max_output_retries budget (bounded loop)
//
// The original couples this loop to a pydantic TypeAdapter + an async node graph.
// This blueprint strips it to the load-bearing control flow so you can drop a
// real validator (zod / ajv / pydantic-equivalent / hand-written) into `validate`
// and a real model/SDK call into `produce`.
// ============================================================================

/**
 * Recoverable signal — throw from `validate` to request another attempt.
 * `feedback` is surfaced to the producer so it can self-correct.
 * (= pydantic-ai ModelRetry. Distinguishing this from a plain Error is the
 *  whole point: it separates "the model can fix this" from "this is a bug".)
 */
export class RetrySignal extends Error {
  constructor(message) {
    super(message);
    this.name = 'RetrySignal';
    this.feedback = message;
  }
}

/** Thrown once the retry budget is exhausted; carries attempt count + last error. */
export class RetryBudgetExhausted extends Error {
  constructor(attempts, lastError) {
    super(`structured output failed after ${attempts} attempt(s): ${lastError?.message ?? lastError}`);
    this.name = 'RetryBudgetExhausted';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Compose the next prompt from the original prompt + the history of failed
 * attempts. The base prompt is NEVER mutated across attempts (so a cached
 * prefix / template stays byte-stable — same discipline pydantic-ai applies to
 * its deferred-capability catalog to protect prompt cache).
 *
 * Override this if your producer takes structured messages instead of a string.
 */
export function buildRetryPrompt(basePrompt, history) {
  if (history.length === 0) return basePrompt;
  const lines = [basePrompt, ''];
  for (const [i, h] of history.entries()) {
    lines.push(`Attempt ${i + 1} produced: ${h.raw}`);
    lines.push(`That was rejected because: ${h.feedback}`);
  }
  lines.push('', 'Try again and fix the issue described above.');
  return lines.join('\n');
}

/**
 * @template T
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {(prompt: string, attempt: number) => Promise<string>|string} opts.produce  mock SDK/IO here
 * @param {(raw: string) => Promise<T>|T} opts.validate  throw RetrySignal to retry; any other Error = fatal
 * @param {number} [opts.maxRetries=3]  extra attempts after the first
 * @param {(info: {attempt:number, feedback:string}) => void} [opts.onRetry]  optional observability hook
 * @returns {Promise<{ output: T, attempts: number, history: object[] }>}
 */
export async function runWithStructuredRetry({ prompt, produce, validate, maxRetries = 3, onRetry }) {
  if (maxRetries < 0) throw new RangeError('maxRetries must be >= 0');

  const history = [];
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const effectivePrompt = buildRetryPrompt(prompt, history);
    const raw = await produce(effectivePrompt, attempt);
    try {
      const output = await validate(raw);
      return { output, attempts: attempt + 1, history };
    } catch (err) {
      if (err instanceof RetrySignal) {
        lastError = err;
        history.push({ prompt: effectivePrompt, raw, feedback: err.feedback });
        onRetry?.({ attempt, feedback: err.feedback });
        continue;
      }
      throw err; // fatal: retrying cannot help
    }
  }

  throw new RetryBudgetExhausted(maxRetries + 1, lastError);
}
