// example.test.ts
// Run: node --test --experimental-strip-types example/example.test.ts   (node v22)
//
// Behavioral spec for the zero-dep three-state circuit breaker. Time is driven
// by a controllable fake clock so the Open -> HalfOpen transition is
// deterministic without real timers or any third-party fake-timer library.

import { test } from "node:test";
import assert from "node:assert/strict";
import { CircuitBreaker, CircuitState } from "./portable-slice.mjs";

function fakeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

test("starts Closed and admits requests", () => {
  const cb = new CircuitBreaker();
  const d = cb.allow();
  assert.equal(cb.state, CircuitState.Closed);
  assert.equal(d.allowed, true);
  assert.equal(d.usedHalfOpenPermit, false);
});

test("opens after failureThreshold consecutive failures", () => {
  const clock = fakeClock();
  const cb = new CircuitBreaker({ failureThreshold: 4, minRequests: 100 }, clock.now);

  for (let i = 0; i < 3; i++) {
    assert.equal(cb.allow().allowed, true);
    cb.recordFailure();
  }
  // 3 failures: still Closed.
  assert.equal(cb.state, CircuitState.Closed);

  assert.equal(cb.allow().allowed, true);
  cb.recordFailure(); // 4th consecutive -> Open
  assert.equal(cb.state, CircuitState.Open);

  // While Open, requests are rejected.
  const d = cb.allow();
  assert.equal(d.allowed, false);
  assert.equal(cb.state, CircuitState.Open);
});

test("a single success resets the consecutive-failure streak", () => {
  const cb = new CircuitBreaker({ failureThreshold: 4, minRequests: 100 });
  cb.recordFailure();
  cb.recordFailure();
  cb.recordFailure();
  cb.recordSuccess(); // streak reset
  cb.recordFailure();
  cb.recordFailure();
  cb.recordFailure();
  assert.equal(cb.state, CircuitState.Closed, "3 fails after reset must not open");
});

test("error-rate rule opens once minRequests samples are reached", () => {
  // failureThreshold high so only the error-rate rule can fire.
  const cb = new CircuitBreaker({
    failureThreshold: 1000,
    minRequests: 10,
    errorRateThreshold: 0.6,
  });

  // 6 failures + 4 successes interleaved so no 'consecutive' rule fires and
  // every recordSuccess resets the streak. 6/10 = 0.6 >= threshold.
  const pattern = ["f", "s", "f", "s", "f", "s", "f", "s", "f", "f"];
  for (const x of pattern) {
    if (x === "f") cb.recordFailure();
    else cb.recordSuccess();
  }
  // total=10, failed=6, rate=0.6 -> Open.
  assert.equal(cb.state, CircuitState.Open);
});

test("error-rate rule does NOT fire below minRequests", () => {
  const cb = new CircuitBreaker({
    failureThreshold: 1000,
    minRequests: 10,
    errorRateThreshold: 0.5,
  });
  // 4 failures only (total < minRequests) at 100% error rate.
  for (let i = 0; i < 4; i++) cb.recordFailure();
  assert.equal(cb.state, CircuitState.Closed, "small sample must not open");
});

test("Open -> HalfOpen after timeout, then probe success closes it", () => {
  const clock = fakeClock();
  const cb = new CircuitBreaker(
    { failureThreshold: 1, timeoutMs: 60_000, successThreshold: 2, minRequests: 100 },
    clock.now,
  );

  // Open it.
  cb.recordFailure();
  assert.equal(cb.state, CircuitState.Open);

  // Before timeout: still rejected.
  clock.advance(59_999);
  assert.equal(cb.allow().allowed, false);
  assert.equal(cb.state, CircuitState.Open);

  // After timeout: a single probe is admitted -> HalfOpen.
  clock.advance(1);
  const probe1 = cb.allow();
  assert.equal(probe1.allowed, true);
  assert.equal(probe1.usedHalfOpenPermit, true);
  assert.equal(cb.state, CircuitState.HalfOpen);

  cb.recordSuccess(probe1.usedHalfOpenPermit); // 1/2
  assert.equal(cb.state, CircuitState.HalfOpen);

  const probe2 = cb.allow();
  assert.equal(probe2.allowed, true);
  cb.recordSuccess(probe2.usedHalfOpenPermit); // 2/2 -> Closed
  assert.equal(cb.state, CircuitState.Closed);
});

test("HalfOpen probe failure snaps back to Open and restarts the clock", () => {
  const clock = fakeClock();
  const cb = new CircuitBreaker(
    { failureThreshold: 1, timeoutMs: 1000, minRequests: 100 },
    clock.now,
  );
  cb.recordFailure(); // Open
  clock.advance(1000);
  const probe = cb.allow(); // HalfOpen
  assert.equal(cb.state, CircuitState.HalfOpen);
  cb.recordFailure(probe.usedHalfOpenPermit); // probe fails -> Open
  assert.equal(cb.state, CircuitState.Open);
  // Immediately after, before new timeout, rejected again.
  assert.equal(cb.allow().allowed, false);
});

test("HalfOpen limits concurrent probes to halfOpenMaxProbes", () => {
  const clock = fakeClock();
  const cb = new CircuitBreaker(
    { failureThreshold: 1, timeoutMs: 1000, halfOpenMaxProbes: 1, minRequests: 100 },
    clock.now,
  );
  cb.recordFailure();
  clock.advance(1000);
  const first = cb.allow();
  assert.equal(first.allowed, true); // probe slot taken
  const second = cb.allow();
  assert.equal(second.allowed, false, "second concurrent probe must be rejected");
});

test("releaseNeutral returns a half-open permit without affecting health", () => {
  const clock = fakeClock();
  const cb = new CircuitBreaker(
    { failureThreshold: 1, timeoutMs: 1000, halfOpenMaxProbes: 1, minRequests: 100 },
    clock.now,
  );
  cb.recordFailure();
  clock.advance(1000);
  const probe = cb.allow(); // HalfOpen, permit consumed
  assert.equal(cb.stats().halfOpenInFlight, 1);

  // Neutral release: not a real failure, returns the permit, stays HalfOpen.
  cb.releaseNeutral(probe.usedHalfOpenPermit);
  assert.equal(cb.state, CircuitState.HalfOpen, "neutral must not change state");
  assert.equal(cb.stats().halfOpenInFlight, 0, "permit returned");
  assert.equal(cb.stats().consecutiveSuccesses, 0, "neutral counts no success");

  // A fresh probe can now be admitted (no deadlock).
  assert.equal(cb.allow().allowed, true);
});

test("updateConfig hot-reloads thresholds without losing counters", () => {
  const cb = new CircuitBreaker({ failureThreshold: 4, minRequests: 100 });
  cb.recordFailure();
  cb.recordFailure(); // 2 consecutive, still Closed
  assert.equal(cb.state, CircuitState.Closed);

  cb.updateConfig({ failureThreshold: 3 });
  cb.recordFailure(); // now 3 >= 3 -> Open
  assert.equal(cb.state, CircuitState.Open);
});
