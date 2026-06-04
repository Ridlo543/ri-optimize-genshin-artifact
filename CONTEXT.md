# Domain Context

## Vocabulary

- Artifact: Genshin Impact equipment item with one main stat and up to four substats.
- Main stat: The primary artifact stat. It cannot also appear as a substat.
- Active substat: A substat currently active in-game.
- Unactivated substat: The visible fourth substat shown on a 5-star 3-liner artifact before +4. It is known and becomes active at +4.
- CV: Crit Value, computed as `CRIT Rate * 2 + CRIT DMG`.
- RV: Roll Value, a normalized view of substat roll quality relative to maximum rolls.
- GOOD: Genshin Open Object Description, a JSON artifact/character/weapon format used by community tools.
- Visible artifact scan: Capture and parse the artifact detail panel currently visible on screen.
- Watch mode: Poll screen changes and re-scan only when the visible artifact panel changes.

## Product Invariant

The app helps users decide whether to upgrade, stop, keep, or fodder an artifact. It does not claim official HoYoverse probabilities. The probability model is community-derived and must stay transparent.
