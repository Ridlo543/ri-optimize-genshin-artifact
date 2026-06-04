# Methodology

The app uses a community-derived Genshin artifact probability model. It is not official HoYoverse data.

## Core Rules

- Substats cannot duplicate the main stat or each other.
- Minor affix generation uses weighted probabilities.
- Once an artifact has four active substats, each upgrade milestone chooses one slot uniformly.
- 5-star roll values use four tiers: 70%, 80%, 90%, and 100% of max.
- A known unactivated substat activates at +4 with probability 100% and does not require a weighted new-substat roll.

## Scoring

- CV is `CRIT Rate * 2 + CRIT DMG`.
- Weighted score is the sum of stat values multiplied by the selected scoring profile weights.
- Recommendations are heuristics over current score, expected final score, and threshold probabilities.
