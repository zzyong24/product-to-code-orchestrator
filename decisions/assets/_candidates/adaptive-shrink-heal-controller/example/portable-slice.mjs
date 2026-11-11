// portable-slice.mjs
// Zero-dependency adaptive shrink/heal controller.
//
// Rewritten from gbrain's per-recipe embedding `safety_factor` shrink-on-miss
// state (src/core/ai/gateway.ts). The original tightens an LLM batch-sizing
// safety factor when a provider rejects a batch for being too large, then
// heals it back toward the declared default after a streak of successes.
//
// This slice strips out all SDK / recipe / token-budget coupling and keeps the
// pure control law: a multiplicative-decrease-on-miss, multiplicative-heal-
// after-N-wins factor, floored to avoid collapse and ceilinged at the declared
// default. It is a small deterministic state machine — no imports.
//
// Control law (per key):
//   miss      -> factor = max(floor, factor * shrinkRatio); wins := 0
//   success   -> wins++ ; if factor < default and wins >= healAfter:
//                  factor = min(default, factor * healRatio); wins := 0
//   (success when already at/above default just resets the win counter)

/**
 * @typedef {Object} ShrinkEntry
 * @property {number} factor                  current effective factor
 * @property {number} consecutiveSuccesses    wins since last shrink/heal
 */

/**
 * @typedef {Object} ControllerConfig
 * @property {number} [defaultFactor]  declared ceiling the factor heals toward (default 0.8)
 * @property {number} [floor]          lower bound; factor never shrinks below it (default 0.05)
 * @property {number} [shrinkRatio]    multiplier applied on a miss (default 0.5)
 * @property {number} [healRatio]      multiplier applied per heal step (default 1.5)
 * @property {number} [healAfter]      consecutive successes required before a heal (default 10)
 */

const DEFAULTS = Object.freeze({
  defaultFactor: 0.8,
  floor: 0.05,
  shrinkRatio: 0.5,
  healRatio: 1.5,
  healAfter: 10,
});

/**
 * Create an adaptive shrink/heal controller. State is held per string key so a
 * single controller can govern many independent flows (e.g. one per recipe id).
 *
 * @param {ControllerConfig} [config]
 */
export function createShrinkHealController(config = {}) {
  const cfg = { ...DEFAULTS, ...config };

  if (!(cfg.floor > 0))            throw new Error('floor must be > 0');
  if (!(cfg.defaultFactor >= cfg.floor)) throw new Error('defaultFactor must be >= floor');
  if (!(cfg.shrinkRatio > 0 && cfg.shrinkRatio < 1)) throw new Error('shrinkRatio must be in (0,1)');
  if (!(cfg.healRatio > 1))        throw new Error('healRatio must be > 1');
  if (!(Number.isInteger(cfg.healAfter) && cfg.healAfter >= 1)) throw new Error('healAfter must be a positive integer');

  /** @type {Map<string, ShrinkEntry>} */
  const state = new Map();

  /** Effective factor for a key: shrunk value if active, else the declared default. */
  function factorFor(key) {
    const entry = state.get(key);
    return entry ? entry.factor : cfg.defaultFactor;
  }

  /** Tighten the key's factor on a miss (batch too large / rate hit). */
  function recordMiss(key) {
    const current = state.get(key)?.factor ?? cfg.defaultFactor;
    const next = Math.max(cfg.floor, current * cfg.shrinkRatio);
    state.set(key, { factor: next, consecutiveSuccesses: 0 });
    return next;
  }

  /** Record a success; heal toward the default after `healAfter` consecutive wins. */
  function recordSuccess(key) {
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

  /** Read a snapshot of the internal entry for a key (or undefined). Test seam. */
  function peek(key) {
    const entry = state.get(key);
    return entry ? { ...entry } : undefined;
  }

  /** Clear all state (mirrors the original gateway reset path). */
  function reset() {
    state.clear();
  }

  return { factorFor, recordMiss, recordSuccess, peek, reset, config: cfg };
}
