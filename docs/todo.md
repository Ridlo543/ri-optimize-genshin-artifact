# TODO

## Current Context

- The repo has a desktop-first scaffold: React/Tauri UI, TypeScript probability core, and a C# scanner sidecar.
- Current implemented importer/evaluator status:
  - GOOD artifacts normalize through `packages/artifact-schema`.
  - Probability core accepts levels `0..20`; future roll events still use milestones `+4/+8/+12/+16/+20`.
  - Desktop UI can load/paste scanner JSON, a single GOOD artifact, fixture `samples[]`, or full GOOD `artifacts[]`.
  - Scanner sidecar has Tesseract-based substat crop OCR for fixture images, plus OCR-like text parser tests.
- `data/example/Database_1_2026-06-04_18-43-27.json` is a GOOD export with `1886` artifacts. It also contains characters, weapons, builds, teams, and display settings; future import work should focus on `artifacts`.
- `data/example/picture/` has full screenshot examples for two layouts:
  - Equipped-character artifact view: character visible in the center; right panel has artifact details/actions.
  - Bag/inventory artifact view: grid fills the left/middle; right panel has artifact card; diagnostic screenshots include green item-cell rectangles from Inventory Kamera.
- `data/example/artifacts` is a symlink to local Inventory Kamera logging output with `1783` artifact folders. Each folder has `artifact.json`, `card.png`, and region crops such as `substats/substats.png`.
- `data/fixtures/` now contains a small copied subset for fast OCR/import/manual testing.

## Completed In 2026-06-05 Session

- [x] Normalize GOOD import before mapping into `ArtifactInput`.
  - Placeholder substats with empty `key` or invalid/non-positive values are dropped.
  - A single real `unactivatedSubstats` entry is preserved as inactive known substat.
  - Non-milestone levels `0..20` are supported; levels outside that range are skipped.
- [x] Add GOOD batch evaluation path.
  - Reads GOOD artifact lists from full export `artifacts[]` or fixture `samples[]`.
  - Evaluates supported 5-star artifacts.
  - Reports skipped artifacts with reason and normalization warnings.
- [x] Improve UI manual correction/import.
  - Supports pasted JSON and file import.
  - Recalculates after valid JSON edits.
  - Shows validation errors/warnings before trusting the recommendation.
- [x] Add expanded scanner confidence output.
  - Fields now include set, slot, main stat, level, substats, lock, equipped, and location.
  - UI flags low-confidence scanner fields for review.
- [x] Add scanner OCR-like text parser tests.
  - `artifact0` active substats are covered with expected OCR-like text.
  - `artifact1000` unactivated suffix is covered with expected OCR-like text.
- [x] Add true substat image OCR for fixture crops.
  - `ocr-substats <imagePath>` reads `substats.png` through Tesseract.
  - `parse-fixture-artifact <fixtureFolder>` compares OCR output with fixture `artifact.json`.
  - `artifact0` and `artifact1000` fixture tests pass.

## Next High Priority TODO

- Wire full artifact OCR assembly for visible/card crops.
  - Add OCR for set name, slot, main stat, level, lock, and equipped/location.
  - Use the existing substat OCR as one field inside the full `ScanResult`.
  - Keep low-confidence full artifacts blocked for manual review in the UI.
- Improve scanner crop/layout classification.
  - Calibrate equipped-character screenshots separately from bag/inventory screenshots.
  - Keep diagnostic grid screenshots for item-cell detection only.
  - Preserve the screenshot/OCR-only safety policy.
- Add live manual scanner verification.
  - Run with Genshin visible in windowed or borderless mode.
  - Confirm `logs/scanner/visible-artifact-last.png` captures the correct right panel.
  - Confirm OCR confidence drops or blocks recommendation when fields are missing.
- Verify native Tauri shell after Rust is installed.
  - Browser/Vite build is verified.
  - Tauri native build remains pending until `rustc`/`cargo` are available.

## Manual Testing Checklist

- Desktop UI:
  - Run `pnpm dev:desktop`.
  - Open `http://localhost:5173`.
  - Confirm fixture loads and recommendation appears.
  - Edit Scanner JSON and confirm score/recommendation recalculates.
- Scanner sidecar:
  - Run `pnpm scanner:status`.
  - Run `pnpm scanner:sample`.
  - Run `pnpm scanner:scan` with Genshin closed and confirm structured JSON error.
  - Run `pnpm scanner:scan` with Genshin open and confirm `logs/scanner/visible-artifact-last.png` is created.
- GOOD import:
  - Load `data/fixtures/good/artifact-samples.json`.
  - Confirm placeholder entries are filtered before mapping.
  - Confirm 4-star and odd-level artifacts are skipped or handled intentionally.
- OCR crop validation:
  - Open `data/fixtures/artifacts/artifact0/substats/substats.png`; expected four active substats.
  - Open `data/fixtures/artifacts/artifact1000/substats/substats.png`; expected three active substats and one unactivated `atk_`.
  - Compare OCR result against each fixture folder's `artifact.json`.
- Full screenshot layout validation:
  - Use `data/fixtures/screenshots/artifact-inventory-plus20.jpg` and `artifact-inventory-unactivated.jpg` for equipped-character layout calibration.
  - Use `data/fixtures/screenshots/bag-inventory-raw-1920x1200.png` for bag/inventory layout calibration.
  - Use `data/fixtures/screenshots/bag-grid-diagnostic-*.png` as expected grid-detection visual references.

## Known Data Pitfalls

- GOOD placeholder entries exist:
  - `substats` may contain `{ "key": "", "value": 0 }`.
  - `unactivatedSubstats` may contain one real stat plus blank placeholders.
- Export shapes differ:
  - Full GOOD export uses string IDs such as `artifact_2087`.
  - Inventory Kamera logging fixture files use numeric IDs such as `1000`.
- MVP probability core currently targets 5-star artifacts. Artifact levels `0..20` are accepted, and future roll events are derived from milestones greater than the current level.
- The artifact detail card includes long set bonus text below substats. OCR crop boundaries must stop before set description text.
- Equipped-character screenshots and bag/inventory screenshots have different right-panel positioning and surrounding UI. The scanner should classify or calibrate both instead of assuming one crop profile.
- Full screenshots are useful for layout/crop calibration; diagnostic grid screenshots are useful for item-cell detection; per-folder `substats.png` crops are better for OCR parser unit tests.

## Fixture Index

- `data/fixtures/screenshots/artifact-inventory-plus20.jpg`: full inventory screenshot with +20 selected artifact.
- `data/fixtures/screenshots/artifact-inventory-unactivated.jpg`: full inventory screenshot with visible `(unactivated)` substat text.
- `data/fixtures/screenshots/bag-inventory-raw-1920x1200.png`: raw bag/inventory layout at 1920x1200.
- `data/fixtures/screenshots/bag-grid-diagnostic-plus20-8x5.png`: 8x5 grid detection overlay for +20 page.
- `data/fixtures/screenshots/bag-grid-diagnostic-unactivated-8x5.png`: 8x5 grid detection overlay for unactivated page.
- `data/fixtures/screenshots/bag-grid-diagnostic-4star-8x5.png`: 8x5 grid detection overlay for 4-star page.
- `data/fixtures/screenshots/bag-item-count.png`: crop for artifact count OCR, expected `1783/2400`.
- `data/fixtures/artifacts/artifact0`: +20 5-star flower with four active substats.
- `data/fixtures/artifacts/artifact1000`: +0 5-star plume with unactivated `atk_`.
- `data/fixtures/artifacts/artifact1021`: elemental goblet with four active substats.
- `data/fixtures/artifacts/artifact1027`: elemental goblet with unactivated CRIT DMG.
- `data/fixtures/artifacts/artifact1035`: crit main-stat circlet.
- `data/fixtures/artifacts/artifact1066`: ER sands with unactivated CRIT Rate.
- `data/fixtures/artifacts/artifact1743`: 4-star electro goblet edge case.
- `data/fixtures/artifacts/artifact1082`: unlocked 5-star artifact.
- `data/fixtures/artifacts/artifact1042`: equipped artifact with unactivated substat.
- `data/fixtures/artifacts/artifact513`: odd level +17 import edge case.
- `data/fixtures/good/artifact-samples.json`: selected GOOD export artifacts for importer tests.
- `data/fixtures/good/database-summary.md`: compact GOOD export observations for future agents.

## Automated Follow-Up Tests

- [x] Add GOOD normalization tests for blank placeholder substats.
- [x] Add GOOD import tests for non-milestone levels.
- [x] Add batch evaluation tests using selected GOOD fixture samples.
- [x] Add OCR-like parser tests for `artifact0` and `artifact1000` expected text.
- [x] Add schema tests for fixture `artifact.json` files.
- [x] Add true image OCR tests for `artifact0/substats.png` and `artifact1000/substats.png`.
- [ ] Add scanner integration tests that compare cropped OCR output to fixture `artifact.json`.
- [ ] Add Playwright/manual UI proof for loading `artifact-samples.json` through the Import control.
