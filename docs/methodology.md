# Methodology

The app uses a community-derived Genshin artifact probability model. It is not official HoYoverse data.

## Core Rules

- Substats cannot duplicate the main stat or each other.
- Minor affix generation uses weighted probabilities.
- Once an artifact has four active substats, each upgrade milestone chooses one slot uniformly.
- 5-star roll values use four tiers: 70%, 80%, 90%, and 100% of max.
- Roll value tier probabilities are non-uniform, based on community-datamined drop rates:
  - 5-star/4-star/3-star: 44% (100%), 31% (90%), 19% (80%), 6% (70% of max)
  - 2-star: 50% (100%), 33% (90%), 17% (80% of max)
  - Previous uniform 25% assumption was removed in model v3.
- A known unactivated substat activates at +4 with probability 100% and does not require a weighted new-substat roll.

## Scoring

- CV is `CRIT Rate * 2 + CRIT DMG`.
- Active Crit Value includes only currently active substats. Known Crit Value also includes a visible unactivated substat because that stat is guaranteed to activate at the next unlock milestone.
- Useful Roll Value normalizes each useful substat by that rarity's maximum roll value, then applies the selected profile's utility weight.
- Chance to Reach Target is the exact probability that the final Useful Roll Value reaches the selected profile's explicit target.
- Recommendations are profile-based heuristics over exact outcome probabilities. They do not claim that an artifact is universally good for every character.
- Set fit is not evaluated in the MVP. Legacy raw weighted score remains available only for advanced diagnostics and compatibility.
