// example.test.ts
// Run: node --test --experimental-strip-types example.test.ts  (node v22)
//
// Asserts the core behavior of the rewritten structured-output retry loop.
// The "model" (produce) is mocked — no SDK, no network, no third-party import.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runWithStructuredRetry,
  buildRetryPrompt,
  RetrySignal,
  RetryBudgetExhausted,
} from './portable-slice.mjs';

// A tiny "structured output": expect strict JSON { ok: true }.
function validateOkJson(raw: string): { ok: boolean } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RetrySignal('output was not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || (parsed as any).ok !== true) {
    throw new RetrySignal('expected JSON object with ok === true');
  }
  return parsed as { ok: boolean };
}

test('succeeds on first attempt when output is already valid', async () => {
  let calls = 0;
  const res = await runWithStructuredRetry({
    prompt: 'give me ok',
    produce: () => {
      calls++;
      return '{"ok": true}';
    },
    validate: validateOkJson,
  });
  assert.deepEqual(res.output, { ok: true });
  assert.equal(res.attempts, 1);
  assert.equal(calls, 1);
  assert.equal(res.history.length, 0);
});

test('retries with feedback then succeeds (validate -> retry -> feedback loop)', async () => {
  const outputs = ['not json', '{"ok": false}', '{"ok": true}'];
  const seenPrompts: string[] = [];
  let i = 0;

  const res = await runWithStructuredRetry({
    prompt: 'produce ok json',
    produce: (prompt: string) => {
      seenPrompts.push(prompt);
      return outputs[i++];
    },
    validate: validateOkJson,
    maxRetries: 3,
  });

  assert.deepEqual(res.output, { ok: true });
  assert.equal(res.attempts, 3);
  assert.equal(res.history.length, 2);

  // first attempt sees the bare prompt; later attempts get feedback appended
  assert.equal(seenPrompts[0], 'produce ok json');
  assert.match(seenPrompts[1], /not valid JSON/);
  assert.match(seenPrompts[2], /ok === true/);
});

test('raises RetryBudgetExhausted when budget runs out', async () => {
  let calls = 0;
  await assert.rejects(
    runWithStructuredRetry({
      prompt: 'never valid',
      produce: () => {
        calls++;
        return 'garbage';
      },
      validate: validateOkJson,
      maxRetries: 2,
    }),
    (err: unknown) => {
      assert.ok(err instanceof RetryBudgetExhausted);
      assert.equal((err as RetryBudgetExhausted).attempts, 3); // 1 initial + 2 retries
      assert.ok((err as RetryBudgetExhausted).lastError instanceof RetrySignal);
      return true;
    },
  );
  assert.equal(calls, 3);
});

test('fatal (non-RetrySignal) error fails fast without consuming retries', async () => {
  let calls = 0;
  await assert.rejects(
    runWithStructuredRetry({
      prompt: 'boom',
      produce: () => {
        calls++;
        return 'whatever';
      },
      validate: () => {
        throw new TypeError('unrecoverable schema bug');
      },
      maxRetries: 5,
    }),
    (err: unknown) => err instanceof TypeError,
  );
  // only one produce call: fatal errors are not retried
  assert.equal(calls, 1);
});

test('maxRetries = 0 means exactly one attempt', async () => {
  let calls = 0;
  await assert.rejects(
    runWithStructuredRetry({
      prompt: 'one shot',
      produce: () => {
        calls++;
        return 'bad';
      },
      validate: validateOkJson,
      maxRetries: 0,
    }),
    RetryBudgetExhausted,
  );
  assert.equal(calls, 1);
});

test('buildRetryPrompt never mutates the base prompt and embeds feedback', () => {
  const base = 'BASE';
  const out = buildRetryPrompt(base, [
    { prompt: base, raw: 'xx', feedback: 'bad shape' },
  ]);
  assert.ok(out.startsWith('BASE'));
  assert.match(out, /Attempt 1 produced: xx/);
  assert.match(out, /rejected because: bad shape/);
  // base itself untouched for the no-history case
  assert.equal(buildRetryPrompt(base, []), 'BASE');
});
