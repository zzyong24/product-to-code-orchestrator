// shrink-heal-controller.ts
// Blueprint: adaptive shrink/heal factor controller.
//
// L2 reference (origin, do NOT run the origin repo to use this):
//   gbrain src/core/ai/gateway.ts
//     - interface ShrinkEntry           (:118)
//     - const _shrinkState = new Map    (:122)  per-recipe state
//     - const SHRINK_FLOOR = 0.05       (:125)
//     - const SHRINK_HEAL_AFTER = 10    (:127)
//     - effectiveSafetyFactor(recipe)   (:849)  -> factorFor()
//     - shrinkOnMiss(recipe)            (:856)  -> recordMiss()
//     - recordSubBatchSuccess(recipe)   (:864)  -> recordSuccess()
//
// What it is
// ----------
// A tiny per-key controller that governs a "safety factor" (0..1) used to
// pre-size a risky operation (LLM embedding batch size, a request fan-out, a
// concurrency limit, a polling window). When the operation MISSES (provider
// says the batch is too large / rate-limited), the factor multiplicatively
// shrinks so the next attempt is more conservative. After a streak of
// successes it multiplicatively heals back toward the declared default.
//
// This is AIMD's cousin: multiplicative-decrease on failure, but the increase
// is also multiplicative and gated behind a success streak rather than applied
// every round. The streak gate keeps the factor from oscillating after a
// single lucky success.
//
// Why pull it to a factor instead of mutating the batch size directly
// -------------------------------------------------------------------
// The factor is dimensionless and stateless-per-call: callers recompute the
// concrete budget (batchSize = floor(maxBudget * factor)) each time, so the
// same controller drives heterogeneous flows and the "current safe size" is
// always derived, never drifting.

export interface ShrinkEntry {
  factor: number;
  consecutiveSuccesses: number;
}

export interface ControllerConfig {
  /** Declared ceiling the factor heals toward. */
  defaultFactor?: number; // origin DEFAULT_SAFETY_FACTOR = 0.8
  /** Lower bound; factor never shrinks below it (prevents collapse to 0). */
  floor?: number;         // origin SHRINK_FLOOR = 0.05
  /** Multiplier applied on a miss; must be in (0,1). */
  shrinkRatio?: number;   // origin hard-coded 0.5
  /** Multiplier applied per heal step; must be > 1. */
  healRatio?: number;     // origin hard-coded 1.5
  /** Consecutive successes required before a heal step. */
  healAfter?: number;     // origin SHRINK_HEAL_AFTER = 10
}

const DEFAULTS: Required<ControllerConfig> = {
  defaultFactor: 0.8,
  floor: 0.05,
  shrinkRatio: 0.5,
  healRatio: 1.5,
  healAfter: 10,
};

export function createShrinkHealController(config: ControllerConfig = {}) {
  const cfg: Required<ControllerConfig> = { ...DEFAULTS, ...config };

  if (!(cfg.floor > 0)) throw new Error('floor must be > 0');
  if (!(cfg.defaultFactor >= cfg.floor)) throw new Error('defaultFactor must be >= floor');
  if (!(cfg.shrinkRatio > 0 && cfg.shrinkRatio < 1)) throw new Error('shrinkRatio must be in (0,1)');
  if (!(cfg.healRatio > 1)) throw new Error('healRatio must be > 1');
  if (!(Number.isInteger(cfg.healAfter) && cfg.healAfter >= 1)) throw new Error('healAfter must be a positive integer');

  const state = new Map<string, ShrinkEntry>();

  /** Effective factor for a key: shrunk value if active, else the declared default. */
  function factorFor(key: string): number {
    return state.get(key)?.factor ?? cfg.defaultFactor;
  }

  /** Tighten the key's factor on a miss. Returns the new factor. */
  function recordMiss(key: string): number {
    const current = state.get(key)?.factor ?? cfg.defaultFactor;
    const next = Math.max(cfg.floor, current * cfg.shrinkRatio);
    state.set(key, { factor: next, consecutiveSuccesses: 0 });
    return next;
  }

  /** Record a success; heal toward the default after `healAfter` consecutive wins. */
  function recordSuccess(key: string): number {
    const entry = state.get(key);
    // No shrink active, or already at/above the ceiling: nothing to heal.
    if (!entry || entry.factor >= cfg.defaultFactor) {
      if (entry) state.set(key, { factor: entry.factor, consecutiveSuccesses: 0 });
      return factorFor(key);
    }
    const wins = entry.consecutiveSuccesses + 1;
    if (wins >= cfg.healAfter) {
      const healed = Math.min(cfg.defaultFactor, entry.factor * cfg.healRatio);
      state.set(key, { factor: healed, consecutiveSuccesses: 0 });
    } else {
      state.set(key, { factor: entry.factor, consecutiveSuccesses: wins });
    }
    return factorFor(key);
  }

  /** Snapshot the internal entry for a key (or undefined). Test seam. */
  function peek(key: string): ShrinkEntry | undefined {
    const entry = state.get(key);
    return entry ? { ...entry } : undefined;
  }

  /** Clear all state (mirrors the gateway reset path). */
  function reset(): void {
    state.clear();
  }

  return { factorFor, recordMiss, recordSuccess, peek, reset, config: cfg };
}

// ---------------------------------------------------------------------------
// Usage sketch (caller derives the concrete budget each round):
//
//   const ctl = createShrinkHealController();           // factor starts at 0.8
//   const factor = ctl.factorFor(recipeId);
//   const batchSize = Math.max(1, Math.floor(maxBatch * factor));
//   try {
//     await embed(texts.slice(0, batchSize));
//     ctl.recordSuccess(recipeId);
//   } catch (e) {
//     if (isTokenLimitError(e)) { ctl.recordMiss(recipeId); /* retry smaller */ }
//     else throw e;
//   }
// ---------------------------------------------------------------------------
