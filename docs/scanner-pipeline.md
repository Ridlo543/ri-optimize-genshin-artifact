# Scanner Pipeline

## MVP Pipeline

1. Locate the Genshin process by known executable names.
2. Enable Windows DPI awareness, then read the client rectangle and screen position in physical pixels.
3. Capture only the game client region.
4. Crop the user-configured normalized ROI around the artifact card.
5. Classify the ROI as bag card, character artifact panel, or review-needed.
6. Run artifact OCR only when the ROI contains a supported artifact panel.
7. Emit structured JSON.

## Implemented ROI-First Scanner

- The primary live command is `scan-region-artifact --region-json <json>`.
- Scanner startup calls the Windows DPI-awareness API so a 1920x1200 Genshin client is reported as `1920x1200`, not DPI-scaled logical size such as `1280x800`.
- Region JSON uses normalized client coordinates:

```json
{ "x": 0.68, "y": 0.1, "width": 0.27, "height": 0.8, "unit": "normalized-client" }
```

- `classify-region-artifact --region-json <json>` captures and hashes the ROI without running Tesseract.
- `parse-region-fixture <fixtureFileName> <regionJson>` tests an ROI against curated screenshot fixtures.
- `classify-region-fixture <fixtureFileName> <regionJson>` tests ROI readiness and crop hashing without OCR.
- Region output includes `capture.scanId`, `capture.regionImagePath`, `capture.regionHash`, `capture.region`, and, for native Tauri live scans, `capture.occlusionAvoided`.
- Live region scans write stable `logs/scanner/region-last.png` and per-scan snapshots under `logs/scanner/captures/`. Use `capture.scanId` when comparing logs; `region-last.png` can be overwritten by the next scan.
- If a supported ROI is found but a correctable required OCR field is missing, output includes `artifactDraft` and `missingFields`. The UI uses this for targeted manual correction of missing `level`, `slotKey`, or `mainStatKey`.
- If the ROI does not contain a supported artifact panel, the scanner returns `screenState.code="unknown-game-screen"` with message `Review ROI: artifact panel was not detected inside the selected box.`.
- `pnpm scanner:regions` is the current smoke suite for all offline fixture playground ROI screenshots.
- Offline 1920x1200 bag-card ROI fixtures parse selected `NoblesseOblige` and `CelestialGift` flowers. For live failures, keep the `capture.scanId` snapshot before changing crop profiles.
- Bag-card ROI detection supports green 2-star, blue 3-star, purple 4-star, and orange 5-star card headers. Rarity is estimated from the artifact name/header crop.

## Desktop Overlay Flow

- Tauri creates four windows: `main`, `roi-overlay`, `assistant-bubble`, and the dev-only `fixture-playground`.
- Startup shows only `assistant-bubble`; `main` and `roi-overlay` remain hidden.
- `roi-overlay` is transparent, borderless, always-on-top, and follows the Genshin client rectangle reported by the scanner in physical pixels.
- In edit mode the ROI rectangle is draggable/resizable and persists to `localStorage`. `Lock ROI` hides the overlay and restores click-through behavior.
- `assistant-bubble` is the compact in-game control surface for `Analyze`, `Watch`, `Edit ROI`, details, and opening the full panel.
- `Analyze` auto-locks/hides the ROI overlay before scanning if edit mode is still active.
- Both the collapsed launcher and expanded header are draggable. Position is persisted as normalized Genshin-client coordinates.
- If the only missing OCR field is `level`, the bubble and main panel show a `+0..+20` correction selector; evaluation resumes after the user applies the visible level.
- If `slotKey` or `mainStatKey` is missing, the bubble and main panel show targeted selectors for the visible slot/main stat; evaluation resumes after applying correction.
- Fixture/sample OCR controls are development tools in the main panel, separated from the primary live scan controls.
- `assistant-bubble` uses Windows no-activate and a non-focusable host while still receiving mouse clicks. `roi-overlay` uses no-activate/non-focusable flags and becomes click-through when locked. Mouse interaction must not move foreground focus away from Genshin.
- The main panel opens in passive no-activate mode. Its keyboard icon explicitly enables focusable keyboard/manual-correction mode; this deliberate focus transfer can minimize exclusive fullscreen.
- The default MVP action is manual `Analyze`; loading an overlay or fixture must not start OCR.
- Watch mode is explicit opt-in. It polls `classify-region-artifact` around once per second and only calls `scan-region-artifact` when `capture.regionHash` changes.
- Native Tauri live scans temporarily hide assistant/main windows before `CopyFromScreen`, then restore them after the sidecar returns. This prevents the floating UI from being OCRed as part of the artifact panel.
- Watch enabled/disabled state is shared across the bubble, fixture playground, and main panel so the compact and expanded surfaces agree.

## Offline Fixture Playground

- `http://localhost:5173?window=fixture-playground&fixture=character-plus20` renders screenshot fixtures without launching Genshin.
- Fixture images are served from `data/example/picture` by the Vite dev server for development testing only.
- The playground reuses the same ROI editor and assistant bubble components used by the live overlay.
- The fixture catalog stores default normalized ROI rectangles for equipped-character and bag/inventory layouts.
- `Analyze` tries the native scanner fixture command in Tauri mode and falls back to fixture sample data in browser preview.
- Set identity is optional for upgrade-roll evaluation. The scanner prefers the green set display-name line, falls back to known artifact item names, and emits a non-blocking warning when neither matches.
- `Watch` is available only as a user-triggered mode and polls fixture/ROI hashes.
- Long recommendation explanations and OCR warnings live in the bubble `Details` overflow so the compact bubble does not cover artifact text.

## Implemented Screen-State Detection

- `classify-visible-screen` captures the current Genshin client and returns `screenState` without running OCR.
- `classify-screenshot-artifact <imagePath>` and `classify-screenshot-fixture <fixtureFileName>` classify saved screenshots.
- Supported screen states are `game-not-found`, `artifact-bag-grid`, `artifact-bag-detail`, `character-artifact-detail`, `paimon-menu`, and `unknown-game-screen`.
- `artifact-bag-grid` is a supported non-ready state: the artifact grid is open, but no detail panel is visible yet.
- `scan-visible-artifact` now stops before Tesseract when `screenState.readyForArtifactOcr` is `false`.
- Full-screen detection is now a fallback/debug path. The UI's primary live Watch path uses ROI classification to avoid resolution/layout overfitting.

## Implemented Substat OCR

- `apps/scanner-win` uses Tesseract with `apps/scanner-win/tessdata/genshin_fast_09_04_21.traineddata`.
- `ocr-substats <imagePath>` reads one substat crop and returns active substats, unactivated substats, raw OCR text, and confidence.
- `parse-fixture-artifact <fixtureFolder>` compares `substats/substats.png` OCR output against the fixture `artifact.json`.
- Current fixture coverage includes `artifact0` and `artifact1000`.

## Implemented Fixture Card OCR

- `parse-fixture-card <fixtureFolder>` assembles a full fixture artifact from existing crop folders.
- The command reads set/name, slot, main stat, level, lock, equipped/location, and substats.
- Output includes a nested `ScanResult`, per-field confidence, raw OCR text diagnostics, and mismatches against fixture `artifact.json`.
- Current automated coverage includes `artifact0`, `artifact1000`, `artifact1042`, and `artifact1082`.

## Implemented Full Screenshot OCR

- `parse-screenshot-artifact <imagePath>` reads a full screenshot and returns a scanner `ScanResult`.
- `parse-screenshot-fixture <fixtureFileName>` reads a curated screenshot from `data/fixtures/screenshots` by file name.
- `parse-region-fixture <fixtureFileName> <regionJson>` can read safe file names from `data/fixtures/screenshots`, `data/example/picture`, and `data/log-manual`.
- The parser classifies two current layouts:
  - `bag-inventory-card`: artifact card on the right side of bag/inventory.
  - `equipped-character-panel`: character visible in the middle, artifact detail text on the right.
- ROI layout classification combines character-panel red evidence with bag-card beige evidence. Borderline red character panels must not fall into the bag profile only because their red ratio is near a threshold.
- Long-title character panels use a dedicated level/substat crop profile. Artifact level parsing requires a visible `+` so OCR noise from rarity stars cannot become a false level.
- Flower and Plume have mechanically fixed flat HP/ATK main stats. The scanner may infer those values from a trusted slot when the main-stat label is unreadable; other slots remain OCR-driven.
- Current automated coverage uses:
  - `data/fixtures/screenshots/bag-inventory-raw-1920x1200.png`
  - `data/fixtures/screenshots/artifact-inventory-plus20.jpg`
  - `data/fixtures/screenshots/artifact-inventory-unactivated.jpg`
- Current ROI fixture coverage uses:
  - `data/example/picture/GenshinImpact_lKJAl1Pymu.jpg`
  - `data/example/picture/GenshinImpact_oXNqhIZyXT.jpg`
  - `data/example/picture/ArtifactsInventory1_8x5 - weight 0.png`
  - `data/example/picture/ArtifactsInventory40_8x5 - weight 0.png`
  - `data/example/picture/ArtifactsInventory45_8x5 - weight 0.png`
  - `data/example/picture/GenshinImpact_3star.png`
  - `data/example/picture/GenshinImpact_2star.jpg`
- Manual regression ROI coverage uses:
  - `data/log-manual/success_artifact_character_detail_1.png`
  - `data/log-manual/error_artifact_character_detail_1.png`
  - `data/log-manual/error_artifact_bag_detail_1.png`
  - `data/log-manual/success_artifact_bag_detail_1_level0.png`
  - `data/log-manual/success_artifact_bag_detail_2_level20.png`
  - `data/log-manual/error_artifact_character_detail_2.png`
  - `data/log-manual/error_artifact_character_detail_3.png`
  - `data/log-manual/error_artifact_character_detail_4.png`
  - `data/log-manual/error_artifact_bag_detail_2.png`
  - `data/log-manual/GenshinImpact_WGHmIpkN58.jpg`
  - `data/log-manual/GenshinImpact_zuCNecgQiu.jpg`
  - `data/log-manual/iTPXIcUjaV.png`
- `data/fixtures/screenshots/bag-grid-live-1280x800.png` is a regression fixture for grid-only Artifact Bag at 1280x800; it must classify as non-ready and must not run OCR.
- `scan-visible-artifact` now captures the live Genshin client and runs the same screenshot parser only after the screen-state gate passes. If the screen is not ready, the scanner returns a structured JSON guide message and low confidence values.
- The desktop UI uses `parse-screenshot-fixture` for native sample testing because browser file inputs do not reliably expose filesystem paths to the sidecar.

## Confidence Gate

- Scanner JSON is treated as untrusted input in the desktop UI.
- `packages/artifact-schema` owns the shared trust policy in `assessScannerResultTrust`.
- Any scanner result with `screenState.readyForArtifactOcr=false` blocks evaluation.
- Severe low confidence blocks evaluation for required OCR fields:
  - `slotKey` below 50%
  - `mainStatKey` below 40%
  - `substats` below 50%
- `setKey`, lock, equipped, and location are optional for upgrade-roll mechanics. Unknown or low-confidence set identity is shown as a warning only.
- A 2-star `+0` artifact is allowed to have no visible substats; this case does not block evaluation on substat confidence alone.
- Confidence below 85% still shows a review warning even when evaluation is allowed. This keeps correct sample screenshots usable while making live OCR uncertainty visible.
- `screenState.readyForArtifactOcr=true` with missing fields is shown as `Review OCR`, `Review Level`, `Review Slot`, or `Review Main Stat`, not as a waiting/game-not-found state.

## OCR Pipeline To Implement Next

- Manually verify ROI scans at common 16:9 and 16:10 resolutions.
- Add additional ROI panel-relative crop profiles only after a failing live ROI snapshot is saved under `logs/scanner/captures/` and referenced by `capture.scanId`.
- Keep recommendation blocked in the UI when scanner field confidence is low.
- Save diagnostic crops only when debug logging is enabled.

## Passive Watch Mode

- The desktop Watch button polls ROI classification roughly once per second.
- The UI only calls `scan-region-artifact` when `screenState.readyForArtifactOcr=true` and `capture.regionHash` changed.
- The full-screen `classify-visible-screen` and `scan-visible-artifact` commands remain available for debugging.
- Watch mode must not send keyboard input, mouse input, memory reads, packet reads, or hidden automation.

## Tauri Sidecar Notes

- Root `pnpm tauri:dev` uses `scripts/tauri-dev.ps1` to clear stale repo-owned Vite listeners on port `5173` and to add `%USERPROFILE%\.cargo\bin` to `PATH` if Cargo is installed there.
- Production Tauri builds use `bundle.externalBin` for `GenshinArtifactScanner.Win`.
- Run `pnpm scanner:publish:tauri` before native Tauri checks that evaluate `externalBin`.
- The publish script names the sidecar with Rust's host tuple, for example `GenshinArtifactScanner.Win-x86_64-pc-windows-msvc.exe`.
- Window bounds coming from scanner status are physical pixels. Rust owns native `set_position`, `set_size`, click-through, focusability, and no-activate orchestration.
- `pnpm tauri:smoke` launches the native app and asserts that only the bubble is visible at startup, the main/ROI windows are hidden, the bubble expands, and bubble/passive-main clicks preserve the prior foreground PID.
- In debug Tauri runs, Rust invokes the scanner through `dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj` instead of a prebuilt scanner exe. This keeps `pnpm tauri:dev` aligned with current C# OCR code.
- Scanner log paths are resolved through `ScannerPaths.FindRepoRoot()`, so live Tauri scans and CLI scans both update repo-root `logs/scanner/region-last.png`.

## Safety Boundary

The scanner must only use screenshots and explicit user-triggered actions. Batch inventory navigation is future scope and must be opt-in because it uses mouse/keyboard automation.
