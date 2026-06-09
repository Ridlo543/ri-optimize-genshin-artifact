# Completed Work Log

This file preserves the broader completed-work history that should not be lost during cleanup of `docs/todo.md`.

`docs/todo.md` is the operational entry point.
This file is the historical ledger.

## Completed In 2026-06-05 Session

- [x] Normalize GOOD import before mapping into `ArtifactInput`.
  - Placeholder substats with empty `key` or invalid/non-positive values are dropped.
  - A single real `unactivatedSubstats` entry is preserved as inactive known substat.
  - Non-milestone levels `0..20` are supported; levels outside that range are skipped.
- [x] Add GOOD batch evaluation path.
  - Reads GOOD artifact lists from full export `artifacts[]` or fixture `samples[]`.
  - Evaluates supported 2-star, 3-star, 4-star, and 5-star artifacts.
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
  - `scan-region-artifact --region-json <json>` captures Genshin client, crops the normalized ROI, saves `logs/scanner/region-last.png`, writes per-scan snapshots under `logs/scanner/captures/`, and emits `capture.scanId` plus `capture.regionHash`.
  - `classify-region-artifact --region-json <json>` hashes/classifies the ROI before OCR.
  - `parse-region-fixture` and `classify-region-fixture` cover curated screenshot fixtures without relying on a live game.
  - Tauri now has `roi-overlay` and `assistant-bubble` windows in addition to the main panel.
  - ROI edit mode is draggable/resizable; locked mode is click-through via Tauri `setIgnoreCursorEvents(true)`.
  - The assistant bubble shows compact profile-based decision, beginner-facing probability metrics, OCR confidence, and controls for Analyze/Watch/Edit ROI/Details/Open Panel.
  - Expanded bubble has an explicit minimize icon button; the title is no longer the hidden collapse control.
  - The collapsed launcher always shows the app logo mark; OCR/review state is indicated by ring/dot color, not by replacing the logo with a warning icon.
  - Native bubble/ROI windows re-assert topmost/no-activate when bounds are updated, so they stay above normal windowed/borderless Genshin windows.
- [x] Add offline fixture playground and manual Analyze flow.
  - `http://localhost:5173?window=fixture-playground&fixture=character-plus20` renders fixture screenshots from `data/example/picture` with the shared ROI editor and assistant bubble.
  - Fixture catalog includes equipped-character and bag/inventory screenshots with default normalized ROI rectangles.
  - Browser preview never scans on load; the user must click `Analyze`.
  - `Watch` is opt-in and only polls fixture/ROI hashes after the user enables it.
  - Long recommendation explanations and OCR warnings are kept inside the bubble `Details` overflow.
  - Scanner fixture lookup now accepts safe file names from `data/example/picture` as well as `data/fixtures/screenshots`.
- [x] Harden ROI parser coverage for all playground screenshots.
  - `Royal Flora` now maps to `NoblesseOblige`.
  - `Instructor's Feather Accessory` now maps to `Instructor`.
  - Bag-card substat crop now includes the `(unactivated)` line while still letting `SubstatTextParser` stop at set bonus text.
  - `bag-4star` playground fallback now matches the real Instructor plume screenshot.
  - `pnpm scanner:regions` smoke-tests all current fixture playground screenshots.
- [x] Fix Tauri dev startup preflight.
  - `pnpm tauri:dev` now runs `scripts/tauri-dev.ps1`.
  - The script adds `%USERPROFILE%\.cargo\bin` to `PATH` when Cargo is installed there.
  - The script stops stale repo-owned Vite servers on port `5173` and refuses to stop unrelated processes.
- [x] Fix live scanner DPI scaling.
  - Scanner startup enables Windows DPI awareness before reading the Genshin client rectangle.
  - `pnpm scanner:status` now reports the tested fullscreen/windowed client as `1920x1200` instead of DPI-scaled `1280x800`.
- [x] Verify one live ROI scan against Genshin at 1920x1200.
  - A bag-card ROI scan returned a complete `NoblesseOblige` flower result with level, main stat, substats, lock, location, and crop paths.
  - `Exile's Flower` OCR now maps to GOOD set key `TheExile` for 4-star bag-card cases.
  - `Berserker's Bone Goblet` OCR now maps to GOOD set key `Berserker` for lower-rarity bag-card cases.
- [x] Fix native floating-window lifecycle and foreground focus.
  - Startup now shows only the circular assistant bubble; main and ROI windows remain hidden.
  - Transparent bubble/ROI routes no longer inherit the dark root background.
  - Rust owns physical-pixel native window bounds and awaited native window operations.
  - Bubble uses Windows no-activate while remaining clickable; ROI editor and passive main panel use no-activate guards so mouse clicks preserve Genshin foreground focus.
  - Main-panel keyboard input is an explicit action because taking keyboard focus can minimize exclusive fullscreen.
  - `pnpm tauri:smoke` verifies native startup visibility, expand behavior, and foreground PID preservation.
  - The native focus smoke was verified with a live `GenshinImpact` process; its foreground PID remained unchanged after clicking the bubble and passive main panel.
  - Playwright verifies transparent root layers, fixture ROI resize/lock, and responsive main-panel overflow.
- [x] Fix 5-star live scan missing-level failure path.
  - ROI results now include `artifactDraft` and `missingFields` when OCR misses a required field, instead of losing all detected artifact context.
  - `Review Level` replaces the misleading `Waiting` state when an OCR-ready ROI only lacks `level`.
  - Bubble and main panel expose a `+0..+20` manual level correction selector; applying it builds a valid scanner result and recalculates the recommendation.
  - `Analyze` auto-locks/hides the ROI overlay before scanning if edit mode is still active.
  - Fixture/dev OCR controls are separated from the main live scan toolbar.
  - Regression tests cover Royal Flora 5-star rarity, level parser normalization, scanner draft output, trust policy, assistant summary, and manual level correction.
- [x] Add low-rarity artifact support.
  - Schema and GOOD normalization now accept 2-star, 3-star, 4-star, and 5-star artifacts.
  - Rarity-specific max levels are enforced: 2-star `+4`, 3-star `+12`, 4-star `+16`, and 5-star `+20`.
  - Probability core uses rarity-specific minor roll tables instead of 5-star-only values.
  - Scanner bag-card detection recognizes green 2-star, blue 3-star, purple 4-star, and orange 5-star panels.
  - Fixture playground and `pnpm scanner:regions` include `GenshinImpact_2star.jpg` and `GenshinImpact_3star.png`.
- [x] Make set OCR optional and resilient.
  - Scanner resolves known set keys from the green set display-name line before falling back to artifact item names.
  - `Disenchantment in Deep Shadow` maps to GOOD key `DisenchantmentInDeepShadow`.
  - Unknown set, lock, equipped, and location readings no longer block otherwise-valid upgrade-roll evaluation.
- [x] Add auditable profile-based evaluation.
  - Primary metrics are Active Crit Value, Known Crit Value, Expected Crit Value, normalized Useful Roll Value, and exact Chance to Reach Target.
  - Results include model version, selected profile context, main-stat fit, and explicit `set fit: not evaluated`.
  - Legacy raw weighted score remains diagnostics-only.
- [x] Add draggable persistent assistant placement.
  - Collapsed launcher distinguishes click from drag with a movement threshold.
  - Expanded assistant header is draggable; placement persists relative to the Genshin client and can be reset from Details.
- [x] Simplify beginner-facing UI.
  - Primary toolbar contains Analyze, Watch, Edit ROI, and evaluation profile.
  - Import, fixtures, raw scanner JSON, and per-field OCR confidence live under Developer Tools.
  - All primary metrics expose keyboard-accessible English explanations.
- [x] Stabilize bubble drag, tooltip, and manual OCR regressions.
  - Bubble drag now suppresses React bounds sync during native drag and persists final placement after movement settles.
  - Native bubble host is non-focusable/no-activate; the launcher fills the host window so DPI 150% clicks do not land on transparent dead space.
  - Expanded bubble no longer draws a visible outer transparent-window border; state is shown through content/dot styling.
  - Live Tauri region scans hide assistant/main windows during `CopyFromScreen` capture and mark `capture.occlusionAvoided`.
  - Watch state is shared between bubble, fixture playground, and main panel.
  - Metric help uses real hover/focus tooltips instead of browser `title`.
  - Manual OCR correction supports missing level, slot, and main stat.
  - `data/log-manual` screenshots are accepted as safe screenshot fixtures and covered by `pnpm scanner:manual-logs`.
  - Character artifact panels with wrapped long names use a merged crop fallback; bag/character manual logs no longer fail only because set OCR is unknown.
- [x] Close the second manual OCR regression batch.
  - Character panel classification now combines red-panel and beige-card evidence so borderline red panels do not fall into the bag profile.
  - Long-title character panels use corrected level/substat crops; star-count OCR is no longer accepted as an artifact level unless a visible `+` is present.
  - Short `Af`/`Hf`/`Df` OCR tokens can recover percentage main stats for Sands/Circlet, while Goblet remains strict to avoid elemental-stat ambiguity.
  - Flower and Plume main stats are safely inferred as flat HP and flat ATK when their labels are unreadable.
  - Manual correction only offers main stats valid for the selected slot and rejects impossible slot/main-stat combinations.
  - `pnpm scanner:manual-logs` covers twelve real screenshots, including `error_artifact_character_detail_2/3/4.png`, `error_artifact_bag_detail_2.png`, the manual bag screenshots `GenshinImpact_WGHmIpkN58.jpg` / `GenshinImpact_zuCNecgQiu.jpg`, and `iTPXIcUjaV.png`.
  - Manual correction dropdowns no longer default to `Flower / HP`; missing slot/main-stat correction starts with explicit placeholder choices to avoid accidental wrong Apply actions.
  - Scanner logs are rooted at repo `logs/scanner` even when invoked by Tauri from `apps/desktop/src-tauri`.
  - Tauri debug builds run the scanner via `dotnet run --project apps/scanner-win` so `pnpm tauri:dev` does not use a stale Debug or bundled scanner executable.

## Completed In 2026-06-07 Session

- [x] Fix teal/non-red character artifact panel classification.
  - `DetectProfile` in `ArtifactRegionParser` now uses a dark-background + white-title fallback (`beige < 0.25 && titleLight > 0.015`) for artifact panels whose theme uses teal/green instead of red or gold, so the ROI classifier no longer falls through to `IsBagArtifactPanel`.
  - `IsBagArtifactPanel` now requires `Beige > 0.15` before accepting any color-based match, preventing teal or blue/purple character panels from being classified as bag cards due to rarity accent colors.
  - `ScreenStateDetector.Detect` adds a `rightTitleLight > 0.06` fallback for full-screenshot detection; the bright multi-line white title text in the character artifact panel reliably exceeds the threshold while gold bag-card text does not.
  - Regression tests: `GenshinImpact_yY0600CANu.png` and `GenshinImpact_G2ZhtL0vyo.png` now classify as `CharacterArtifactDetail` and parse correctly.
- [x] Fix padded ROI level OCR for manual bag-detail repro `bug_new_4`.
  - `ArtifactRegionParser` now uses a wider ROI bag-card level crop so slightly padded live ROIs still include the `+20` badge.
  - `ArtifactImagePreprocessor.PreprocessLevel` now isolates the top-left dark level badge component instead of merging unrelated dark text below it.
  - `ArtifactOcrService.ReadLevel` adds an extra thresholded single-word fallback pass, and `ArtifactTextParser.ParseLevel` now accepts clean digit-only level reads such as `20`.
  - Regression test `ParseFile_LockedBagRoiWithPaddingStillReadsArtifact` covers `data/log-manual/bug_new_4/GenshinImpact_d6QhwtaXj4.jpg`.
- [x] Fix Tauri release/runtime scanner parity on repo machines.
  - `apps/desktop/src-tauri/src/lib.rs` now prefers the bundled scanner sidecar in non-debug builds instead of silently running `apps/scanner-win/bin/Debug/net10.0-windows/GenshinArtifactScanner.Win.exe` when that file exists.
  - `pnpm --filter @ri-genshin/desktop build:tauri` republishes the current scanner sidecar, and `pnpm --filter @ri-genshin/desktop tauri build` completes with the updated scanner binary.
- [x] Verify scanner and release paths against the current manual repro.
  - `dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-region-fixture GenshinImpact_d6QhwtaXj4.jpg "{ ... }" --debug` returns a complete artifact with `level=20`.
  - The published sidecar `apps/desktop/src-tauri/binaries/GenshinArtifactScanner.Win.exe` returns the same successful ROI result for the same repro.
  - `dotnet test apps/scanner-win.Tests/GenshinArtifactScanner.Win.Tests.csproj --no-restore` passes with 91 tests.

## Completed In 2026-06-10 Session

- [x] **1080p resolution support for character detail OCR** (`apps/scanner-win/ScreenshotArtifactParser.cs`):
  - Discovered that yShift=42px is **required for some** 1080p character panels and **harmful for others** (text at proportionally scaled positions vs shifted).
  - Implemented conditional yShift fallback: first pass uses proportional scaling (no shift); if slot/mainStat missing AND height ≠ 1200, retry with yShift and merge results.
  - Both 1080p character detail fixtures pass: one via no-shift, one via shifted fallback.
  - Removed universal yShift from `ParseBitmap` (was breaking one of two 1080p images).
  - Restored `ApplyShiftedFallback` as conditional (no-shift-first), not universal.

- [x] **Dual aspect-ratio profiles** (`apps/scanner-win/ScreenshotArtifactParser.cs`):
  - Replaced static readonly profiles `BagInventoryProfile`, `EquippedCharacterProfile`, `EquippedCharacterLongTitleProfile` with factory methods `CreateBagProfile()`, `CreateCharacterProfile()`, `CreateCharacterLongTitleProfile()`.
  - Removed yShift from `CropFields` and `ReadFields` parameters (now passed separately by `ParseBitmap`).
  - Same 1200p-reference coordinates; yShift applied only as conditional fallback.

- [x] **Dice coefficient fuzzy matching for slot OCR** (`apps/scanner-win/ArtifactTextParser.cs`):
  - `DiceCoefficient(s1, s2)` — bigram Dice similarity for fuzzy text matching.
  - `FuzzyMatchSlotKey(raw, threshold=0.35)` — fallback in `ParseSlotKey` when exact substring fails.
  - Recovers garbled slot text: "pumeordean" → "plume" (Dice 0.5), "Goblet of Eonothem" → "goblet" (Dice 0.385).
  - 12 dedicated unit tests covering match and rejection cases.
  - NOT applied to mainStat (false positive risk with short 2-4 char tokens).

- [x] **IK-style slot preprocessing** (`apps/scanner-win/ArtifactImagePreprocessor.cs` + `ArtifactOcrService.cs`):
  - `PreprocessSlot(bitmap)` → Contrast(80) → Grayscale → Invert (no scaling). Adapted from Inventory_Kamera.
  - Added as last-resort fallback in `ReadSlotKey` with confidence gate ≥ 0.45.
  - MainStat IK preprocessing NOT added (caused false positive "heal_" → "def_" on goblet).

- [x] **Flower/plume mainStat short-circuit** (`apps/scanner-win/ArtifactOcrService.cs`):
  - `ReadMainStatKey` returns "hp" when slot is flower, "atk" when slot is plume — no OCR needed.
  - Follows Inventory_Kamera pattern at `ArtifactScraper.cs:454-462`.

- [x] **1080p regression fixtures** (`apps/scanner-win.Tests/ScreenshotArtifactParserTests.cs`):
  - `ParseFile_BagInventory1080p1_ReadsArtifact` — bag inventory at 1920×1080, passes via proportional scaling.
  - `ParseFile_BagInventory1080p2_ReadsArtifact` — second bag inventory at 1080p, passes.
  - `ParseFile_CharacterDetail1080p1_ReadsArtifact` — character detail at 1080p, passes via no-shift.
  - `ParseFile_CharacterDetail1080p2_ReadsArtifact` — character detail at 1080p, passes via shifted fallback.

- [x] **Documentation updated**:
  - `AGENTS.md` — Resolution Handling section updated with Dice, IK, short-circuit, dual profiles.
  - `docs/todo.md` — test count 106→122, new changes listed, TODO #4 marked done.
  - `docs/completed-work-log.md` — this entry.

- [x] **122/122 scanner tests pass** (was 106).
  - 106 original + 12 Dice fuzzy matching + 4 1080p fixture tests.

## Completed In 2026-06-09 Session

- [x] **Data refactoring for maintainability** (`packages/artifact-schema` + `packages/probability-core`):
  - Added `STAT_TYPE_TO_LABEL: Record<StatType, string>` in `good.ts` — human-readable names for every stat type.
  - Added `STAT_TYPE_IS_PERCENT: ReadonlySet<StatType>` — identifies which stats are percent-based for UI formatting.
  - Removed duplicate `ARTIFACT_MAX_LEVEL_BY_RARITY` from `packages/probability-core/src/constants.ts`. Now imports `ArtifactLevel` from `@ri-genshin/artifact-schema`.
  - All 13 probability-core tests pass.

- [x] **Probability model: weighted roll value distribution** (`packages/probability-core`):
  - Added `ROLL_VALUE_WEIGHTS_BY_RARITY: Record<number, number[]>` with community-datamined distribution:
    - 5-star/4-star/3-star: weights `[7,5,3,1]` → 44%/31%/19%/6% probabilities
    - 2-star: weights `[3,2,1]` → 50%/33%/17% probabilities
  - Added `getRollValueProbabilities(rarity)` in `distribution.ts` — returns normalized probability per roll-value tier.
  - Updated `enumerateOutcomes()` in `exact.ts` to use `rollProbs[vi]` instead of `1/rollValues.length`.
  - Bumped `PROBABILITY_MODEL_VERSION` from `"artifact-exact-v2"` to `"artifact-exact-v3"`.
  - Previously used uniform 25% chance per tier — this systematically overestimated low-value rolls and underestimated high-value rolls.
  - All 13 probability-core tests pass; `probabilityByTargetRollCount` tests unchanged (depends on stat-selection probability, not roll-value weighting).

- [x] **OCR improvement: Otsu thresholding for level badge** (`apps/scanner-win/ArtifactImagePreprocessor.cs`):
  - `ComputeOtsuThreshold()` — computes optimal binarization threshold from pixel intensity histogram by maximizing between-class variance. Standard Otsu's method (Nobuyuki Otsu, 1979).
  - `ThresholdLightText()` — now uses Otsu threshold instead of hardcoded brightness=150.
  - Adapts automatically to varying screenshot brightness/contrast without hardcoded cutoffs.
  - Tested 2x substat scaling but reverted: bicubic interpolation blurred unactivated (grayed-out) text edges, causing OCR regression.
  - 106/106 scanner tests pass (no regression from fixed threshold).

- [x] **ROI flow UX improvements** (`apps/desktop`):
  - "Edit ROI" → "Set Area" everywhere (main toolbar, bubble, assistant summary). Tooltip explains action.
  - Gold pulse animation (`@keyframes roi-pulse`) on Set Area button when no scan area configured — draws user's attention to the right button.
  - Initial message replaced with numbered steps: "1. Click Set Area → 2. Place box over artifact → 3. Click Use This Area → 4. Click Analyze".
  - All user-facing "ROI" text → "scan area" / "red box" / "artifact detail panel".
  - 2 test expectations updated in `assistantSummary.test.ts`.

- [x] **UI polish: shadow artifacts and icon sizing** (`apps/desktop/src/styles.css`):
  - Removed all outer `box-shadow` from `.assistant-launcher` (base + `--ready`, `--review`, `--waiting`, `--error`) and `.assistant-bubble`. Only `inset 0 0 0 4px rgba(0,0,0,0.35)` kept for inner depth.
  - Added `overflow: hidden` to `.assistant-bubble` to clip any remaining visual overflow.
  - Removed `padding: 3px` from `.assistant-logo-mark`, set `width:100%; height:100%` to fill 72×72 host.
  - Removed `inset` gold border from launcher base to eliminate double-ring (SVG icon ring + CSS border ring).
  - Enlarged SVG ring to r=29/64 (stroke 3.5) — ring outer edge at ~99% of viewBox.

## Historical Regression Fixtures

- `data/log-manual/bug_new_2/GenshinImpact_yY0600CANu.png`
- `data/log-manual/bug_new_2/GenshinImpact_G2ZhtL0vyo.png`
- `data/log-manual/bug_new_4/GenshinImpact_d6QhwtaXj4.jpg`
- `data/log-manual/GenshinImpact_WGHmIpkN58.jpg`
- `data/log-manual/GenshinImpact_zuCNecgQiu.jpg`
- `data/log-manual/iTPXIcUjaV.png`
