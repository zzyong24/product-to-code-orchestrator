// portable-slice.mjs
// Zero-dependency three-state circuit breaker (Closed / Open / HalfOpen).
//
// Rewritten (NOT copied) from the Rust `CircuitBreaker` in cc-switch
// (src-tauri/src/proxy/circuit_breaker.rs). The original uses
// tokio::sync::RwLock + AtomicU32; this is a single-threaded synchronous
// JS port that preserves the *state-machine semantics* only:
//
//   - Closed: pass requests; open on (consecutive failures >= failureThreshold)
//             OR (totalRequests >= minRequests AND errorRate >= errorRateThreshold).
//   - Open:   reject until `timeoutMs` elapses since it opened, then admit a
//             single probe and move to HalfOpen.
//   - HalfOpen: admit at most `halfOpenMaxProbes` concurrent probes; on
//             `successThreshold` consecutive probe successes -> Closed; any
//             probe failure -> Open (reset the open clock).
//
// The "neutral" release mirrors cc-switch's `release_permit_neutral`: a request
// that should NOT count toward provider health (e.g. a rectifier/body-repair
// retry) still returns its half-open permit so the breaker cannot deadlock.
//
// `now` is injectable so the example test can drive time deterministically
// without real timers — no third-party fake-timer dependency.

export const CircuitState = Object.freeze({
  Closed: "Closed",
  Open: "Open",
  HalfOpen: "HalfOpen",
});

/** @typedef {"allowed"|"rejected"} AllowKind */

export function defaultConfig() {
  return {
    failureThreshold: 4, // consecutive failures -> Open
    successThreshold: 2, // consecutive half-open successes -> Closed
    timeoutMs: 60_000, // Open dwell before a probe is admitted
    errorRateThreshold: 0.6, // >= 60% errors (with enough samples) -> Open
    minRequests: 10, // min samples before error-rate rule applies
    halfOpenMaxProbes: 1, // concurrent probes admitted while HalfOpen
  };
}

export class CircuitBreaker {
  /**
   * @param {Partial<ReturnType<typeof defaultConfig>>} [config]
   * @param {() => number} [now] monotonic clock in ms (injectable for tests)
   */
  constructor(config = {}, now = () => Date.now()) {
    this._config = { ...defaultConfig(), ...config };
    this._now = now;

    this._state = CircuitState.Closed;
    this._consecutiveFailures = 0;
    this._consecutiveSuccesses = 0;
    this._totalRequests = 0;
    this._failedRequests = 0;
    this._lastOpenedAt = null;
    this._halfOpenInFlight = 0;
  }

  get state() {
    // Lazily promote Open -> HalfOpen window readiness is decided in allow().
    return this._state;
  }

  /** Hot-reload config without losing counters (mirrors update_config). */
  updateConfig(partial) {
    this._config = { ...this._config, ...partial };
  }

  /**
   * Decide whether a request may proceed. Returns a result object describing
   * the decision and whether a half-open probe permit was consumed — the
   * caller MUST pass `usedHalfOpenPermit` back into record* so the permit is
   * accounted for exactly once.
   * @returns {{ allowed: boolean, usedHalfOpenPermit: boolean, state: string }}
   */
  allow() {
    const cfg = this._config;
    switch (this._state) {
      case CircuitState.Closed:
        return { allowed: true, usedHalfOpenPermit: false, state: this._state };

      case CircuitState.Open: {
        const elapsed =
          this._lastOpenedAt == null ? Infinity : this._now() - this._lastOpenedAt;
        if (elapsed >= cfg.timeoutMs) {
          // Admit a single probe and enter HalfOpen.
          this._state = CircuitState.HalfOpen;
          this._consecutiveSuccesses = 0;
          this._halfOpenInFlight = 1;
          return { allowed: true, usedHalfOpenPermit: true, state: this._state };
        }
        return { allowed: false, usedHalfOpenPermit: false, state: this._state };
      }

      case CircuitState.HalfOpen: {
        if (this._halfOpenInFlight < cfg.halfOpenMaxProbes) {
          this._halfOpenInFlight += 1;
          return { allowed: true, usedHalfOpenPermit: true, state: this._state };
        }
        return { allowed: false, usedHalfOpenPermit: false, state: this._state };
      }

      default:
        return { allowed: false, usedHalfOpenPermit: false, state: this._state };
    }
  }

  /** Record a successful request outcome. */
  recordSuccess(usedHalfOpenPermit = false) {
    if (usedHalfOpenPermit) this._releaseHalfOpenPermit();

    this._consecutiveFailures = 0;
    this._totalRequests += 1;

    if (this._state === CircuitState.HalfOpen) {
      this._consecutiveSuccesses += 1;
      if (this._consecutiveSuccesses >= this._config.successThreshold) {
        this._transitionToClosed();
      }
    }
  }

  /** Record a failed request outcome. */
  recordFailure(usedHalfOpenPermit = false) {
    if (usedHalfOpenPermit) this._releaseHalfOpenPermit();

    if (this._state === CircuitState.HalfOpen) {
      // A probe failed: snap back to Open and restart the dwell clock.
      this._transitionToOpen();
      return;
    }

    this._totalRequests += 1;
    this._failedRequests += 1;
    this._consecutiveFailures += 1;

    const cfg = this._config;

    // Error-rate rule (needs enough samples to avoid small-sample noise).
    if (this._totalRequests >= cfg.minRequests) {
      const errorRate = this._failedRequests / this._totalRequests;
      if (errorRate >= cfg.errorRateThreshold) {
        this._transitionToOpen();
        return;
      }
    }

    // Consecutive-failure rule.
    if (this._consecutiveFailures >= cfg.failureThreshold) {
      this._transitionToOpen();
    }
  }

  /**
   * Return a half-open permit WITHOUT counting the request toward health.
   * Mirrors cc-switch `release_permit_neutral`: used when an outcome is not a
   * genuine provider failure (e.g. a request-body rectifier retry) so the
   * breaker neither pollutes its health stats nor deadlocks in HalfOpen.
   */
  releaseNeutral(usedHalfOpenPermit = false) {
    if (usedHalfOpenPermit) this._releaseHalfOpenPermit();
  }

  /** Snapshot for UI / diagnostics. */
  stats() {
    return {
      state: this._state,
      consecutiveFailures: this._consecutiveFailures,
      consecutiveSuccesses: this._consecutiveSuccesses,
      totalRequests: this._totalRequests,
      failedRequests: this._failedRequests,
      halfOpenInFlight: this._halfOpenInFlight,
    };
  }

  /** Force back to a clean Closed state. */
  reset() {
    this._state = CircuitState.Closed;
    this._consecutiveFailures = 0;
    this._consecutiveSuccesses = 0;
    this._totalRequests = 0;
    this._failedRequests = 0;
    this._lastOpenedAt = null;
    this._halfOpenInFlight = 0;
  }

  // --- internal transitions ------------------------------------------------

  _releaseHalfOpenPermit() {
    if (this._halfOpenInFlight > 0) this._halfOpenInFlight -= 1;
  }

  _transitionToOpen() {
    this._state = CircuitState.Open;
    this._lastOpenedAt = this._now();
    this._consecutiveSuccesses = 0;
    this._halfOpenInFlight = 0;
  }

  _transitionToClosed() {
    this._state = CircuitState.Closed;
    this._consecutiveFailures = 0;
    this._consecutiveSuccesses = 0;
    this._failedRequests = 0;
    this._totalRequests = 0;
    this._halfOpenInFlight = 0;
  }
}
