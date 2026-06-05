# Scanner Pipeline

## MVP Pipeline

1. Locate the Genshin process by known executable names.
2. Read the client rectangle and screen position.
3. Capture only the game client region.
4. Crop the user-configured normalized ROI around the artifact card.
5. Classify the ROI as bag card, character artifact panel, or review-needed.
6. Run artifact OCR only when the ROI contains a supported artifact panel.
7. Emit structured JSON.

## Implemented ROI-First Scanner

- The primary live command is `scan-region-artifact --region-json <json>`.
- Region JSON uses normalized client coordinates:

```json
{ "x": 0.68, "y": 0.1, "width": 0.27, "height": 0.8, "unit": "normalized-client" }
```

- `classify-region-artifact --region-json <json>` captures and hashes the ROI without running Tesseract.
- `parse-region-fixture <fixtureFileName> <regionJson>` tests an ROI against curated screenshot fixtures.
- `classify-region-fixture <fixtureFileName> <regionJson>` tests ROI readiness and crop hashing without OCR.
- Region output includes `capture.regionImagePath`, `capture.regionHash`, and `capture.region`.
- If the ROI does not contain a supported artifact panel, the scanner returns `screenState.code="unknown-game-screen"` with message `Review ROI: artifact panel was not detected inside the selected box.`.

## Desktop Overlay Flow

- Tauri creates three windows: `main`, `roi-overlay`, and `assistant-bubble`.
- `roi-overlay` is transparent, borderless, always-on-top, and follows the Genshin client rectangle reported by the scanner.
- In locked mode the ROI window calls `setIgnoreCursorEvents(true)`, so game clicks pass through the overlay.
- In edit mode the ROI rectangle is draggable/resizable and persists to `localStorage`.
- `assistant-bubble` is the compact in-game control surface for `Scan`, `Watch`, `Edit ROI`, opacity, and opening the full panel.
- Watch mode polls `classify-region-artifact` around once per second and only calls `scan-region-artifact` when `capture.regionHash` changes.

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
- The parser classifies two current layouts:
  - `bag-inventory-card`: artifact card on the right side of bag/inventory.
  - `equipped-character-panel`: character visible in the middle, artifact detail text on the right.
- Current automated coverage uses:
  - `data/fixtures/screenshots/bag-inventory-raw-1920x1200.png`
  - `data/fixtures/screenshots/artifact-inventory-plus20.jpg`
  - `data/fixtures/screenshots/artifact-inventory-unactivated.jpg`
- `data/fixtures/screenshots/bag-grid-live-1280x800.png` is a regression fixture for grid-only Artifact Bag at 1280x800; it must classify as non-ready and must not run OCR.
- `scan-visible-artifact` now captures the live Genshin client and runs the same screenshot parser only after the screen-state gate passes. If the screen is not ready, the scanner returns a structured JSON guide message and low confidence values.
- The desktop UI uses `parse-screenshot-fixture` for native sample testing because browser file inputs do not reliably expose filesystem paths to the sidecar.

## Confidence Gate

- Scanner JSON is treated as untrusted input in the desktop UI.
- `packages/artifact-schema` owns the shared trust policy in `assessScannerResultTrust`.
- Any scanner result with `screenState.readyForArtifactOcr=false` blocks evaluation.
- Severe low confidence blocks evaluation for required OCR fields:
  - `setKey` below 45%
  - `slotKey` below 50%
  - `mainStatKey` below 40%
  - `substats` below 50%
- Confidence below 85% still shows a review warning even when evaluation is allowed. This keeps correct sample screenshots usable while making live OCR uncertainty visible.

## OCR Pipeline To Implement Next

- Manually verify ROI scans at common 16:9 and 16:10 resolutions.
- Add additional ROI panel-relative crop profiles only after a failing live ROI image is saved to `logs/scanner/region-last.png`.
- Keep recommendation blocked in the UI when scanner field confidence is low.
- Save diagnostic crops only when debug logging is enabled.

## Passive Watch Mode

- The desktop Watch button polls ROI classification roughly once per second.
- The UI only calls `scan-region-artifact` when `screenState.readyForArtifactOcr=true` and `capture.regionHash` changed.
- The full-screen `classify-visible-screen` and `scan-visible-artifact` commands remain available for debugging.
- Watch mode must not send keyboard input, mouse input, memory reads, packet reads, or hidden automation.

## Tauri Sidecar Notes

- Production Tauri builds use `bundle.externalBin` for `GenshinArtifactScanner.Win`.
- Run `pnpm scanner:publish:tauri` before native Tauri checks that evaluate `externalBin`.
- The publish script names the sidecar with Rust's host tuple, for example `GenshinArtifactScanner.Win-x86_64-pc-windows-msvc.exe`.

## Safety Boundary

The scanner must only use screenshots and explicit user-triggered actions. Batch inventory navigation is future scope and must be opt-in because it uses mouse/keyboard automation.
