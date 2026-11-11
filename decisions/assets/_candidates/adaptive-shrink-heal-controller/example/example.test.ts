// example.test.ts
// Run: node --test --experimental-strip-types example/example.test.ts  (node v22)
//
// Asserts the core control law of the adaptive shrink/heal controller:
//   - shrink halves the factor on a miss, floored
//   - successes below the heal threshold do not move the factor
//   - the factor heals (×healRatio) only after `healAfter` consecutive wins
//   - a miss resets the win streak
//   - per-key isolation
//   - successes at/above the default are no-ops (just reset the counter)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShrinkHealController } from './portable-slice.mjs';

test('starts at declared default factor', () => {
  const c = createShrinkHealController({ defaultFactor: 0.8 });
  assert.equal(c.factorFor('r1'), 0.8);
  assert.equal(c.peek('r1'), undefined);
});

test('a miss multiplicatively shrinks the factor', () => {
  const c = createShrinkHealController({ defaultFactor: 0.8, shrinkRatio: 0.5 });
  assert.equal(c.recordMiss('r1'), 0.4);
  assert.equal(c.recordMiss('r1'), 0.2);
  assert.equal(c.factorFor('r1'), 0.2);
});

test('shrink is floored and never collapses to zero', () => {
  const c = createShrinkHealController({ defaultFactor: 0.8, floor: 0.05, shrinkRatio: 0.5 });
  for (let i = 0; i < 20; i++) c.recordMiss('r1');
  assert.equal(c.factorFor('r1'), 0.05);
});

test('successes below heal threshold do not move the factor', () => {
  const c = createShrinkHealController({ defaultFactor: 0.8, healAfter: 10 });
  c.recordMiss('r1'); // factor -> 0.4
  for (let i = 0; i < 9; i++) c.recordSuccess('r1');
  assert.equal(c.factorFor('r1'), 0.4);
  assert.equal(c.peek('r1')?.consecutiveSuccesses, 9);
});

test('factor heals after exactly healAfter consecutive successes', () => {
  const c = createShrinkHealController({ defaultFactor: 0.8, healAfter: 10, healRatio: 1.5 });
  c.recordMiss('r1'); // 0.4
  let f = 0.4;
  for (let i = 0; i < 10; i++) f = c.recordSuccess('r1');
  // 0.4 * 1.5 = 0.6 (IEEE-754: 0.6000000000000001), counter reset
  assert.ok(Math.abs(f - 0.6) < 1e-9, `expected ~0.6, got ${f}`);
  assert.equal(c.peek('r1')?.consecutiveSuccesses, 0);
});

test('heal never overshoots the declared default (clamped)', () => {
  const c = createShrinkHealController({ defaultFactor: 0.8, healAfter: 1, healRatio: 1.5 });
  c.recordMiss('r1'); // 0.4
  c.recordSuccess('r1'); // 0.4*1.5 = ~0.6
  assert.ok(Math.abs(c.factorFor('r1') - 0.6) < 1e-9, `expected ~0.6, got ${c.factorFor('r1')}`);
  c.recordSuccess('r1'); // 0.6*1.5 = 0.9 -> clamped to 0.8
  assert.equal(c.factorFor('r1'), 0.8);
});

test('a miss resets the win streak', () => {
  const c = createShrinkHealController({ defaultFactor: 0.8, healAfter: 10 });
  c.recordMiss('r1'); // 0.4
  for (let i = 0; i < 9; i++) c.recordSuccess('r1');
  assert.equal(c.peek('r1')?.consecutiveSuccesses, 9);
  c.recordMiss('r1'); // 0.2, counter reset
  assert.equal(c.factorFor('r1'), 0.2);
  assert.equal(c.peek('r1')?.consecutiveSuccesses, 0);
});

test('success at/above default is a no-op that just resets the counter', () => {
  const c = createShrinkHealController({ defaultFactor: 0.8 });
  // no shrink active -> factorFor stays default, no entry created
  assert.equal(c.recordSuccess('r1'), 0.8);
  assert.equal(c.peek('r1'), undefined);
});

test('keys are isolated from each other', () => {
  const c = createShrinkHealController({ defaultFactor: 0.8 });
  c.recordMiss('r1'); // r1 -> 0.4
  assert.equal(c.factorFor('r1'), 0.4);
  assert.equal(c.factorFor('r2'), 0.8); // untouched
});

test('reset clears all state', () => {
  const c = createShrinkHealController({ defaultFactor: 0.8 });
  c.recordMiss('r1');
  c.reset();
  assert.equal(c.factorFor('r1'), 0.8);
  assert.equal(c.peek('r1'), undefined);
});

test('rejects invalid config', () => {
  assert.throws(() => createShrinkHealController({ floor: 0 }), /floor must be > 0/);
  assert.throws(() => createShrinkHealController({ shrinkRatio: 1 }), /shrinkRatio/);
  assert.throws(() => createShrinkHealController({ healRatio: 1 }), /healRatio/);
  assert.throws(() => createShrinkHealController({ healAfter: 0 }), /healAfter/);
});
