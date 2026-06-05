# Testing

## Core Tests

- Validation rejects duplicate substats and main-stat substat duplication.
- Distribution excludes existing stats and applies minor affix weights.
- Unactivated substats activate at +4 without a weighted substat roll.
- Target roll probabilities match known binomial cases.
- CV and weighted score calculations are deterministic.

## Scanner Tests To Add

- Live artifact detail captures for 1280x800, 1280x720, 1920x1080, and 1920x1200.
- OCR fixtures with active and unactivated substats.
- Confidence threshold tests for UI trust gating.
- Browser/native UI proof that Watch does not scan unchanged screenshot hashes.

## Implemented Scanner Checks

- `dotnet test apps/scanner-win.Tests/GenshinArtifactScanner.Win.Tests.csproj` covers artifact crop OCR, full screenshot OCR, and screen-state detection.
- ROI fixture tests cover bag-card and character-panel regions through `ArtifactRegionParserTests`.
- `parse-region-fixture <fixtureFileName> <regionJson>` verifies a normalized ROI against curated screenshot fixtures.
- `pnpm scanner:screenshots` parses OCR-ready full screenshot fixtures and classifies the 1280x800 grid-only fixture as non-ready.
- `pnpm scanner:classify` classifies the current live Genshin screen without running OCR.
- `scan-region-artifact --region-json <json>` is the primary live scanner command for the overlay UI.
- `pnpm --filter @ri-genshin/artifact-schema test` covers GOOD normalization and scanner confidence trust policy.
- `pnpm --filter @ri-genshin/desktop test` covers compact assistant summary formatting and trust blocking.
- Native Tauri UI can run the same fixture OCR from the toolbar screenshot selector.

## ROI Manual Checks

- Run `pnpm tauri:dev`.
- Click `ROI` or `Edit ROI` and place the red rectangle around the artifact card on the right.
- Lock ROI and verify clicks pass through to Genshin.
- Click `Scan` in the assistant bubble and confirm `logs/scanner/region-last.png` matches the artifact panel.
- Toggle `Watch`, change selected artifact in game, and confirm OCR only refreshes when `capture.regionHash` changes.
- Test opacity modes: `hidden`, `faint`, and `visible`.

## Build Checks

- `pnpm --filter @ri-genshin/probability-core test`
- `pnpm --filter @ri-genshin/desktop build`
- `dotnet build apps/scanner-win/GenshinArtifactScanner.Win.csproj`
- `cargo check` from `apps/desktop/src-tauri` after `pnpm scanner:publish:tauri`
