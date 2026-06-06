# Testing

## Core Tests

- Validation rejects duplicate substats and main-stat substat duplication.
- Distribution excludes existing stats and applies minor affix weights.
- Unactivated substats activate at +4 without a weighted substat roll.
- Target roll probabilities match known binomial cases.
- Active/Known/Expected Crit Value and Useful Roll Value calculations are deterministic.
- Exact outcome probabilities sum to `1`, and Chance to Reach Target remains within `0..1`.

## Scanner Tests To Add

- Live artifact detail captures for 1280x800, 1280x720, 1920x1080, and 1920x1200.
- OCR fixtures with active and unactivated substats.
- Confidence threshold tests for UI trust gating.
- Browser/native UI proof that Watch does not scan unchanged screenshot hashes.

## Implemented Scanner Checks

- `dotnet test apps/scanner-win.Tests/GenshinArtifactScanner.Win.Tests.csproj` covers artifact crop OCR, full screenshot OCR, and screen-state detection.
- ROI fixture tests cover bag-card and character-panel regions through `ArtifactRegionParserTests`.
- Region parser regression tests cover Royal Flora 5-star rarity, level OCR normalization, and the `artifactDraft`/`missingFields` path when only level is missing.
- Set resolver tests cover `Disenchantment in Deep Shadow`, artifact-item-name fallback, and unknown-set non-blocking warnings.
- Manual-log regression tests cover real user screenshots in `data/log-manual`, including wrapped character artifact names, unknown set names, bag detail +0/+20 cases, and partial green set-name OCR.
- `parse-region-fixture <fixtureFileName> <regionJson>` verifies a normalized ROI against curated screenshot fixtures.
- `parse-region-fixture` accepts safe fixture file names from `data/fixtures/screenshots`, `data/example/picture`, and `data/log-manual`.
- `pnpm scanner:regions` parses the seven fixture playground ROI examples: character +20, character unactivated, bag +20, Royal Flora unactivated, Instructor 4-star, Traveling Doctor 3-star, and Adventurer 2-star.
- `pnpm scanner:manual-logs` parses the current real manual screenshots captured during live app testing.
- Low-rarity scanner coverage verifies green 2-star and blue 3-star bag-card panels from `data/example/picture`.
- `pnpm scanner:screenshots` parses OCR-ready full screenshot fixtures and classifies the 1280x800 grid-only fixture as non-ready.
- `pnpm scanner:classify` classifies the current live Genshin screen without running OCR.
- `scan-region-artifact --region-json <json>` is the primary live scanner command for the overlay UI.
- `pnpm --filter @ri-genshin/artifact-schema test` covers GOOD normalization and scanner confidence trust policy.
- `pnpm --filter @ri-genshin/desktop test` covers compact assistant summary formatting, trust blocking, manual level correction, fixture catalog ROI validation, and bubble placement.
- `pnpm --filter @ri-genshin/desktop test` covers compact assistant summary formatting, trust blocking, manual OCR correction for level/slot/main stat, fixture catalog ROI validation, and bubble placement.
- `pnpm --filter @ri-genshin/desktop test:e2e` covers root transparency, launcher shape, expanded bubble no-border CSS, fixture ROI resize/lock, real metric tooltips, and main-panel horizontal overflow.
- `pnpm --filter @ri-genshin/desktop test:e2e -- e2e/window-flow.spec.ts` also covers collapsed click-versus-drag behavior, expanded bubble minimize, accessible metric explanations, the collapsed logo mark, and Import loading of `artifact-samples.json`.
- `pnpm tauri:smoke` covers native startup visibility, DPI-aware bubble sizing, topmost state, expansion, and foreground-focus preservation for bubble/passive-main clicks. If Genshin is running, it explicitly brings Genshin forward and verifies its PID remains foreground.
- Native Tauri UI can run the same fixture OCR from the toolbar screenshot selector.

## Offline Fixture Playground

- Run `pnpm dev:desktop`.
- Open `http://localhost:5173?window=fixture-playground&fixture=character-plus20`.
- Also test `character-unactivated`, `bag-plus20`, `bag-royal-unactivated`, and `bag-4star`.
- Also test `bag-3star` and `bag-2star`.
- Run `pnpm scanner:regions` after changing ROI profiles or artifact text parsing.
- The playground renders a screenshot from `data/example/picture`, the shared ROI editor, and the shared assistant bubble.
- The default flow is manual: loading the page must not start OCR. Click the circular bubble, then click `Analyze`.
- `Watch` is opt-in. It polls fixture/ROI hash only after the user explicitly enables it.
- Toggle `Details` and confirm long explanations or OCR warnings remain inside the scrollable bubble area.
- Click the minimize icon and confirm the expanded assistant returns to the compact circular logo launcher.
- In browser preview, fixture analysis may use fallback data if native Tauri IPC is unavailable. In `pnpm tauri:dev`, `Analyze` should call the C# sidecar.

## ROI Manual Checks

- Run `pnpm tauri:dev`.
- If `5173` is already used by an old Vite process from this repo, the root command stops it before Tauri starts. If another app owns `5173`, stop that app or change the dev port.
- To test only port/Cargo readiness, run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/tauri-dev.ps1 -PreflightOnly`.
- Click `ROI` or `Edit ROI` and place the red rectangle around the artifact card on the right.
- Lock ROI and verify clicks pass through to Genshin.
- Click `Analyze` in the assistant bubble. If ROI edit mode is still open, the app should lock/hide it before scanning.
- Drag both the collapsed launcher and expanded assistant header. Confirm the menu does not open from a drag and the position survives collapse/expand.
- Confirm dragging no longer jitters: while dragging, the assistant should move with the OS window, then settle once without snapping back.
- Confirm the expanded assistant has no visible transparent-window border like `data/log-manual/border_transparent.png`.
- If the bubble only appears after minimizing Genshin, confirm Genshin is not using exclusive fullscreen. Use borderless/windowed for overlay visibility.
- Confirm `logs/scanner/region-last.png` matches the artifact panel and `capture.scanId` points to a non-overwritten snapshot under `logs/scanner/captures/`.
- If OCR misses only `level`, confirm the bubble/main panel shows `Review Level`, choose `+0..+20`, and verify the recommendation appears after applying correction.
- If OCR misses `slotKey` or `mainStatKey`, confirm the bubble/main panel shows `Review Slot`, `Review Main Stat`, or `Review OCR`, then choose the visible value and verify the recommendation appears after applying correction.
- Confirm metric info icons show a tooltip on mouse hover and keyboard focus.
- Confirm `capture.occlusionAvoided=true` for native live scans from Tauri; this means assistant/main windows were hidden before screen capture.
- Toggle `Watch`, change selected artifact in game, and confirm OCR only refreshes when `capture.regionHash` changes.
- Confirm clicking the bubble, editing ROI, and clicking the passive main panel do not minimize Genshin or move foreground focus.
- Click the main-panel keyboard icon only when manual text input is needed. Confirm it deliberately focuses the panel; exclusive fullscreen may minimize at that point.

## Live Scanner Notes

- `pnpm scanner:status` should report the physical Genshin client size. On a 1920x1200 fullscreen/windowed client it should show `resolution: "1920x1200"`; `1280x800` usually means the scanner process is not DPI-aware.
- A verified live ROI scan at 1920x1200 parsed a bag artifact card as a valid scanner result. Full-screen screen-state classification remains a debug fallback; the in-game assistant should prefer ROI scanning.
- If a scan succeeds only after moving the bubble away from the panel, treat it as an occlusion bug. Native Tauri live scans should hide assistant/main windows during capture.

## Build Checks

- `pnpm --filter @ri-genshin/probability-core test`
- `pnpm --filter @ri-genshin/desktop build`
- `dotnet build apps/scanner-win/GenshinArtifactScanner.Win.csproj`
- `cargo check` from `apps/desktop/src-tauri` after `pnpm scanner:publish:tauri`
- `cargo clippy --all-targets --all-features -- -D warnings` from `apps/desktop/src-tauri`
- `pnpm test:ui`
- `pnpm tauri:smoke`
- `pnpm scanner:manual-logs`
