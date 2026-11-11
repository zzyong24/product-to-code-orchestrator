// portable-slice.mjs
// Zero-dependency rewrite of pydantic-ai's structured-output failure-retry loop.
//
// Origin idea (REWRITTEN, not copied) from pydantic-ai:
//   - ModelRetry exception (exceptions.py): a *recoverable* signal that carries a
//     human-readable message back to the producer asking it to "try again".
//   - _make_retry_prompt (_output.py:122): turns a validation error / ModelRetry into
//     a RetryPromptPart that is fed back into the next request.
//   - max_output_retries budget (_agent_graph.py / tool_manager.py): the loop is bounded;
//     once the budget is exhausted the last hard error is raised.
//
// The pydantic-ai original is Python + pydantic TypeAdapter + an async graph. This slice
// keeps ONLY the load-bearing control flow as pure JS with no third-party import:
//   produce(prompt) -> validate(raw) -> on failure append feedback to prompt -> retry
//   bounded by maxRetries, distinguishing "retryable" (feedback) vs "fatal" (raise now).

/**
 * Recoverable signal: raise this from a validator to request another attempt.
 * The `message` is fed back to the producer as feedback (mirrors pydantic-ai ModelRetry).
 */
export class RetrySignal extends Error {
  constructor(message) {
    super(message);
    this.name = 'RetrySignal';
    this.feedback = message;
  }
}

/**
 * Raised when the retry budget is exhausted. Carries the attempt count and the
 * last underlying error so callers can inspect why the loop gave up.
 */
export class RetryBudgetExhausted extends Error {
  constructor(attempts, lastError) {
    super(`structured output failed after ${attempts} attempt(s): ${lastError?.message ?? lastError}`);
    this.name = 'RetryBudgetExhausted';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Build the feedback-augmented prompt for the next attempt.
 * Mirrors pydantic-ai's _make_retry_prompt: the producer is told *what* failed so it
 * can self-correct, rather than blindly re-rolling the same output.
 *
 * @param {string} basePrompt   the original prompt (never mutated across attempts)
 * @param {{prompt: string, raw: string, feedback: string}[]} history  prior failed attempts
 * @returns {string}
 */
export function buildRetryPrompt(basePrompt, history) {
  if (history.length === 0) return basePrompt;
  const lines = [basePrompt, ''];
  for (const [i, h] of history.entries()) {
    lines.push(`Attempt ${i + 1} produced: ${h.raw}`);
    lines.push(`That was rejected because: ${h.feedback}`);
  }
  lines.push('');
  lines.push('Try again and fix the issue described above.');
  return lines.join('\n');
}

/**
 * Core validate -> retry -> feedback loop.
 *
 * @template T
 * @param {object}   opts
 * @param {string}   opts.prompt      original prompt / input string
 * @param {(prompt: string, attempt: number) => Promise<string> | string} opts.produce
 *        the "model call" — returns a raw string. Mock the SDK/IO here.
 * @param {(raw: string) => Promise<T> | T} opts.validate
 *        parse + validate the raw output. Throw `RetrySignal(msg)` to request a retry
 *        with feedback; throw any other Error to fail fast (fatal, no retry).
 * @param {number}  [opts.maxRetries=3]  retry budget (number of *extra* attempts after the first)
 * @returns {Promise<{ output: T, attempts: number, history: object[] }>}
 */
export async function runWithStructuredRetry({ prompt, produce, validate, maxRetries = 3 }) {
  if (maxRetries < 0) throw new RangeError('maxRetries must be >= 0');

  const history = [];
  let lastError;

  // first attempt (index 0) + maxRetries follow-ups
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const effectivePrompt = buildRetryPrompt(prompt, history);
    const raw = await produce(effectivePrompt, attempt);
    try {
      const output = await validate(raw);
      return { output, attempts: attempt + 1, history };
    } catch (err) {
      if (err instanceof RetrySignal) {
        // recoverable: record feedback and loop (if budget remains)
        lastError = err;
        history.push({ prompt: effectivePrompt, raw, feedback: err.feedback });
        continue;
      }
      // fatal: a non-retry error means the output can never be fixed by retrying
      throw err;
    }
  }

  throw new RetryBudgetExhausted(maxRetries + 1, lastError);
}
