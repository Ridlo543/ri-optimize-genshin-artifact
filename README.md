# Genshin Artifact Decision Assistant

Windows desktop-first floating assistant for fast Genshin Impact artifact upgrade decisions.

The app combines:

- Tauri v2 + React/Vite/TypeScript desktop UI.
- A pure TypeScript artifact probability engine.
- A C# .NET Windows scanner sidecar for process detection, ROI screen capture, and OCR parsing.

## Current Status

This is an active MVP implementation:

- Probability core is implemented and covered by unit tests.
- Desktop UI can evaluate fixture/manual scanner JSON and scanner results.
- Tauri command wrappers are wired to the C# sidecar, including multi-window ROI overlay and assistant bubble support.
- The scanner sidecar can detect the Genshin window, crop a user-configured artifact-card ROI, hash the ROI, and OCR supported artifact panels.
- Artifact evaluation supports 2-star, 3-star, 4-star, and 5-star artifacts with rarity-specific level caps and minor roll tables. One-star artifacts remain out of scope for now.
- ROI scanner output includes `capture.scanId` plus per-scan snapshot paths under `logs/scanner/captures/`, while `logs/scanner/region-last.png` remains a convenience pointer.
- If correctable required OCR fields are missing, the scanner returns `artifactDraft` and `missingFields` so the UI can offer targeted correction instead of dropping all artifact context.
- Manual OCR correction currently covers missing level, artifact slot, and main stat.
- Native live ROI scans temporarily hide assistant/main windows during screen capture and mark `capture.occlusionAvoided` so floating UI does not contaminate OCR.
- Fixture coverage includes GOOD import, substat OCR crops, full screenshot parsing, passive screen-state detection, and ROI parsing.
- Native startup shows only a compact assistant bubble. The main panel and ROI editor remain hidden until requested.
- The collapsed launcher and expanded assistant header are draggable. Dragged position is stored relative to the Genshin client and can be reset from Details.
- Dragging suppresses React window-bound syncing until movement settles, avoiding jitter when moving the bubble/menu.
- Bubble, ROI editor, and the passive main panel use Windows no-activate/non-focus-stealing guards so normal mouse interaction does not take foreground focus from Genshin.
- Unknown artifact set names no longer block upgrade-roll evaluation. The scanner prefers the green set-name line and reports optional set warnings separately from required OCR fields.
- Beginner-facing evaluation separates Active Crit Value, Known Crit Value, Expected Crit Value, Useful Roll Value, and exact Chance to Reach Target. Legacy raw score remains diagnostics-only.
- Metric info icons use real hover/focus tooltips, not browser-only title text.
- Offline 1920x1200 bag-card ROI fixtures are verified; live OCR still needs manual passes across more Genshin layouts and resolutions.
- Offline bag-card ROI fixtures include green 2-star, blue 3-star, purple 4-star, and orange 5-star examples.

## Safety

This project must only use screenshot/OCR-based scanning. It must not read game memory, intercept packets, modify game files, or perform hidden automation.

This project is not affiliated with HoYoverse. Artifact probability assumptions are community-derived and not official HoYoverse data.

## Prerequisites

- Node.js and pnpm.
- .NET SDK.
- Rust via `rustup` for Tauri builds. Rust is required for `pnpm tauri:dev`.

## Development

```bash
pnpm install
pnpm --filter @ri-genshin/probability-core test
dotnet build apps/scanner-win/GenshinArtifactScanner.Win.csproj
pnpm --filter @ri-genshin/desktop build
```

Run the desktop web preview:

```bash
pnpm dev:desktop
```

Open the offline fixture playground without Genshin:

```text
http://localhost:5173?window=fixture-playground&fixture=character-plus20
http://localhost:5173?window=fixture-playground&fixture=bag-plus20
http://localhost:5173?window=fixture-playground&fixture=bag-3star
http://localhost:5173?window=fixture-playground&fixture=bag-2star
```

The fixture playground is development-only. It renders sample screenshots, a resizeable ROI box, and the floating assistant bubble. It does not scan on load; click `Analyze` to run one analysis. `Watch` is opt-in.

Run Tauri after Rust is installed:

```bash
pnpm tauri:dev
```

Normal in-game interaction is passive:

- Click or drag the bubble, use `Analyze`, `Watch`, `Edit ROI`, or the passive main panel without moving foreground focus away from Genshin.
- The compact launcher always shows the app logo mark; OCR/review state is shown with ring/dot color.
- If `Analyze` is clicked while ROI edit mode is still open, the app locks/hides the ROI overlay first, then scans.
- If OCR misses only the artifact level, the app shows a `+0..+20` selector and evaluates after manual level correction.
- If OCR misses the artifact slot or main stat, the app shows a targeted selector and evaluates after manual correction.
- The main panel keyboard icon explicitly enables text/keyboard input. Enabling it transfers focus and can minimize Genshin when the game uses exclusive fullscreen.
- Borderless/windowed remains recommended when using keyboard input or other normal desktop applications beside Genshin.
- Exclusive fullscreen can keep Genshin above desktop overlays. Use borderless/windowed if the bubble only appears after minimizing the game.

Run the native window regression check:

```bash
pnpm tauri:smoke
```

The smoke test verifies startup visibility, DPI-aware bubble sizing, topmost state, expand behavior, and foreground-focus preservation when clicking the bubble and passive main panel. When Genshin is running, the test prefers its window as the foreground target.

The root `pnpm tauri:dev` script runs `scripts/tauri-dev.ps1` first. The preflight adds `%USERPROFILE%\.cargo\bin` to `PATH` when needed, stops an old Vite server from this repo on port `5173`, and refuses to kill unrelated processes using that port.

To test only the preflight without launching the Tauri app:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/tauri-dev.ps1 -PreflightOnly
```

Run scanner commands:

```bash
pnpm scanner:status
pnpm scanner:sample
pnpm scanner:scan
pnpm scanner:regions
pnpm scanner:manual-logs
```

Primary live scanning now uses a normalized ROI:

```bash
dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- scan-region-artifact --region-json "{ \"x\": 0.68, \"y\": 0.1, \"width\": 0.27, \"height\": 0.8, \"unit\": \"normalized-client\" }"
```

Offline screenshot ROI smoke:

```bash
dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-region-fixture GenshinImpact_lKJAl1Pymu.jpg "{ \"x\": 0.75625, \"y\": 0.075, \"width\": 0.2427083333, \"height\": 0.8333333333, \"unit\": \"normalized-client\" }"
```

## Workspace

```text
apps/
  desktop/       Tauri + React floating UI
  scanner-win/   C# Windows sidecar
packages/
  artifact-schema/
  probability-core/
docs/
  architecture.md
  scanner-pipeline.md
  methodology.md
  testing.md
```
