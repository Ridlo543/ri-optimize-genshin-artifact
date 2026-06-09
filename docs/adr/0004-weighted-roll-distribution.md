# ADR 0004: Weighted Roll Value Distribution in Probability Model

## Status

Accepted 2026-06-09

## Context

The probability core's `enumerateOutcomes()` assigned equal probability to each roll value tier. For a
5-star artifact with four roll-value levels (70%, 80%, 90%, 100% of max), each had a 25% chance.
Community-datamined drop-rate evidence suggests the actual distribution is skewed toward high rolls.

Ignoring this skew produced systematically optimistic recommendations: the model overestimated the
probability of reaching high-roll targets because it assumed low-value rolls were as likely as
high-value ones.

## Decision

Replace uniform probabilities with a weighted distribution derived from community-datamined
drop rates:

| Rarity   | Weights | 100% | 90%  | 80%  | 70%  |
|----------|---------|------|------|------|------|
| 5-star   | [7,5,3,1] | 44% | 31% | 19% | 6%  |
| 4-star   | [7,5,3,1] | 44% | 31% | 19% | 6%  |
| 3-star   | [7,5,3,1] | 44% | 31% | 19% | 6%  |
| 2-star   | [3,2,1]   | 50% | 33% | 17% | —   |

Implementation:

- `ROLL_VALUE_WEIGHTS_BY_RARITY` in `packages/probability-core/src/constants.ts`
- `getRollValueProbabilities(rarity)` in `packages/probability-core/src/distribution.ts`
  normalizes weights to probabilities.
- `enumerateOutcomes()` in `packages/probability-core/src/exact.ts` uses `rollProbs[vi]`
  instead of `1/rollValues.length` for both new-substat and existing-substat upgrade paths.

The model version string is bumped from `"artifact-exact-v2"` to `"artifact-exact-v3"`.

## Consequences

- `probabilityReachProfileTarget` and `expectedFinalUsefulRollValue` now reflect non-uniform
  roll-value probability. High-roll outcomes are scored lower than before; low-roll outcomes
  are scored higher.
- Recommendations for borderline artifacts (need exactly one high roll to reach target) will
  be more conservative than the old v2 model.
- No changes needed in `scoring.ts` (which calls `Math.max(...getRollValues(...))` — unaffected
  by probability distribution).
- Downstream consumers checking `modelVersion === "artifact-exact-v2"` need update to v3.
- Unknown rarities fall back to uniform `[1]` via guard in `getRollValueProbabilities`.

## Alternatives Considered

- **Keep uniform (25% each)**: Produces cheerful but unrealistic probabilities. Rejected because
  the gap between uniform and datamined rates is too large to ignore.
- **Hardcode distributions per-rarity as constants**: Chosen — match `getRollValues()` pattern.
- **Read weights from a config file**: Over-engineering for a model with <10 lines of config.
