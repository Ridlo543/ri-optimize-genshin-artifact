# GOOD Export Summary

Source: `data/example/Database_1_2026-06-04_18-43-27.json`

Observed on 2026-06-05 local workspace inspection:

- Format: `GOOD`
- `dbVersion`: `25`
- Source: `Genshin Optimizer`
- Characters: `90`
- Weapons: `192`
- Artifacts: `1886`
- Artifact logging folders in symlink target: `1783`
- GOOD entries with non-empty `unactivatedSubstats` array: `884`
- Logging artifact JSON files with non-empty `unactivatedSubstats`: `741`

## Important Shape Notes

- Top-level GOOD export includes artifacts plus many non-artifact sections such as characters, weapons, builds, teams, and display settings.
- Artifact keys include `setKey`, `slotKey`, `rarity`, `level`, `mainStatKey`, `substats`, `unactivatedSubstats`, `location`, `lock`, and `id`.
- The GOOD export can include placeholder substats such as `{ "key": "", "value": 0 }`.
- `unactivatedSubstats` can include placeholder entries, not only the one real known unactivated stat.
- Some artifact levels are not upgrade milestones, for example `17`, `10`, `9`, and `6`.

## Fixture JSON

`artifact-samples.json` contains selected artifacts from the full GOOD export:

- `plus20-normal`
- `placeholder-unactivated`
- `elemental-goblet-active`
- `elemental-goblet-unactivated`
- `crit-circlet`
- `er-sands-unactivated`
- `four-star-edge`
- `unlocked-artifact`
- `equipped-unactivated`
- `odd-level`
