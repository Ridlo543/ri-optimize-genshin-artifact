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
- [x] Add fixture full-card OCR assembly.
  - `parse-fixture-card <fixtureFolder>` reads fixture crops for set/name, slot, main stat, level, lock, equipped/location, and substats.
  - Fixture-card output includes `ScanResult`, per-field confidence, raw OCR text diagnostics, and mismatches against `artifact.json`.
  - Tests cover +20 flower, +0 plume with unactivated substat, equipped location, and unlocked lock state.
- [x] Verify native Tauri Rust backend is available.
  - Rust is installed under `%USERPROFILE%\.cargo\bin`; current shell may need PATH prepended before running cargo.
  - `cargo check` passes after publishing the Tauri sidecar binary.
  - Tauri production config now includes scanner `externalBin` and a publish script for the C# sidecar.
- [x] Calibrate full screenshot artifact parsing against sample images.
  - `parse-screenshot-artifact <imagePath>` detects bag/inventory card layout and equipped-character panel layout.
  - Sample screenshot tests cover `bag-inventory-raw-1920x1200.png`, `artifact-inventory-plus20.jpg`, and `artifact-inventory-unactivated.jpg`.
  - `scan-visible-artifact` now attempts the same screenshot OCR assembly after capturing the live Genshin client.
- [x] Add scanner confidence trust gate in the UI path.
  - `packages/artifact-schema` exposes `assessScannerResultTrust`.
  - Severe low-confidence required fields block evaluation instead of showing a recommendation.
  - Medium-confidence fields still allow evaluation but show OCR review warnings.
  - `pnpm scanner:screenshots` smoke-tests all current full screenshot samples.
- [x] Add native UI flow for screenshot fixture OCR.
  - Desktop toolbar includes a screenshot fixture selector and OCR button.
  - The UI calls Tauri command `scanner_parse_screenshot_fixture`, which maps fixture file names inside the scanner sidecar.
  - This avoids relying on browser file inputs for filesystem paths.
- [x] Add passive screen-state detection before OCR.
  - Scanner emits `screenState` with `game-not-found`, `artifact-bag-grid`, `artifact-bag-detail`, `character-artifact-detail`, `paimon-menu`, or `unknown-game-screen`.
  - `bag-grid-live-1280x800.png` is a regression fixture for grid-only Artifact Bag and must not trigger Tesseract OCR.
  - `classify-visible-screen`, `classify-screenshot-artifact`, and `classify-screenshot-fixture` are implemented.
  - Desktop Watch mode polls classification about once per second and only scans when the screen is OCR-ready and the screenshot hash changed.
- [x] Add ROI-first scanner and floating assistant UI.
  - `scan-region-artifact --region-json <json>` captures Genshin client, crops the normalized ROI, saves `logs/scanner/region-last.png`, and emits `capture.regionHash`.
  - `classify-region-artifact --region-json <json>` hashes/classifies the ROI before OCR.
  - `parse-region-fixture` and `classify-region-fixture` cover curated screenshot fixtures without relying on a live game.
  - Tauri now has `roi-overlay` and `assistant-bubble` windows in addition to the main panel.
  - ROI edit mode is draggable/resizable; locked mode is click-through via Tauri `setIgnoreCursorEvents(true)`.
  - The assistant bubble shows compact decision, CV, expected CV/score, `P >= 30`, OCR confidence, and controls for Scan/Watch/Edit ROI/Opacity/Open Panel.

## Next High Priority TODO

- Live ROI calibration with Genshin.
  - Run native Tauri, resize the red ROI around the right artifact card, lock it, and confirm `logs/scanner/region-last.png` contains only the card/panel.
  - Test both Bag artifact card and Character artifact panel layouts.
  - Capture failing `region-last.png` samples before changing panel-relative crop profiles.
  - Preserve the screenshot/OCR-only safety policy.
- Add live manual scanner verification.
  - Run with Genshin visible in windowed or borderless mode.
  - Confirm `logs/scanner/region-last.png` captures the selected ROI.
  - Confirm OCR confidence drops or blocks recommendation when fields are missing.
- Verify native Tauri shell window manually.
  - Rust backend `cargo check` is verified.
  - Native interactive window smoke remains pending because it starts the desktop app UI and requires checking click-through over the game.

## Manual Testing Checklist

- Desktop UI:
  - Run `pnpm dev:desktop`.
  - Open `http://localhost:5173`.
  - Confirm fixture loads and recommendation appears.
  - Edit Scanner JSON and confirm score/recommendation recalculates.
  - In native Tauri mode, select a screenshot fixture and press `OCR`; confirm Scanner JSON updates and recommendation/warnings recalculate.
  - In native Tauri mode, use `Edit ROI`, resize the red box over the artifact card, lock it, and confirm game clicks pass through the overlay.
  - Use the assistant bubble `Scan` button and confirm compact decision/metrics update.
  - Toggle assistant bubble `Watch`; change artifact selection and confirm scan refreshes only after ROI hash changes.
  - Toggle ROI opacity through `hidden`, `faint`, and `visible`.
- Scanner sidecar:
  - Run `pnpm scanner:status`.
  - Run `pnpm scanner:sample`.
  - Run `pnpm scanner:classify`.
  - Run `pnpm scanner:scan` with Genshin closed and confirm structured JSON error.
  - Run `pnpm scanner:scan` with Genshin open and confirm `logs/scanner/visible-artifact-last.png` is created.
  - Run `dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- classify-screenshot-fixture bag-grid-live-1280x800.png`.
  - Run `dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-fixture-card data/fixtures/artifacts/artifact0`.
  - Run `dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-screenshot-artifact data/fixtures/screenshots/bag-inventory-raw-1920x1200.png`.
  - Run `dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-screenshot-artifact data/fixtures/screenshots/artifact-inventory-unactivated.jpg`.
  - Run `dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-screenshot-fixture bag-inventory-raw-1920x1200.png`.
  - Run `dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-region-fixture bag-inventory-raw-1920x1200.png "{ \"x\": 0.68125, \"y\": 0.1, \"width\": 0.2572916667, \"height\": 0.8016666667, \"unit\": \"normalized-client\" }"`.
  - Run `dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-region-fixture artifact-inventory-unactivated.jpg "{ \"x\": 0.75625, \"y\": 0.075, \"width\": 0.2427083333, \"height\": 0.8333333333, \"unit\": \"normalized-client\" }"`.
  - Run `pnpm scanner:screenshots` to smoke-test all current full screenshot fixtures.
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
- `data/fixtures/screenshots/bag-grid-live-1280x800.png`: live grid-only Artifact Bag capture; expected state is `artifact-bag-grid` and not OCR-ready.
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
- [x] Add scanner integration tests that compare cropped OCR output to fixture `artifact.json`.
- [x] Add full screenshot parser tests for bag/inventory and equipped-character sample screenshots.
- [x] Add scanner confidence trust policy tests.
- [x] Add screen-state tests for grid-only 1280x800 screenshots and OCR-ready detail screenshots.
- [x] Add ROI parser tests for bag-card and character-panel screenshot regions.
- [x] Add desktop assistant summary tests for setup, review ROI, and compact metrics.
- [ ] Add Playwright/manual UI proof for loading `artifact-samples.json` through the Import control.
- [ ] Manually verify live `scan-region-artifact` with Genshin open on actual artifact detail panels at 16:9 and 16:10 resolutions.
- [ ] Manually verify Tauri ROI overlay click-through and assistant bubble over Genshin.
