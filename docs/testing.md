# Testing

## Core Tests

- Validation rejects duplicate substats and main-stat substat duplication.
- Distribution excludes existing stats and applies minor affix weights.
- Unactivated substats activate at +4 without a weighted substat roll.
- Target roll probabilities match known binomial cases.
- CV and weighted score calculations are deterministic.

## Scanner Tests To Add

- Fixture crops for 1280x720, 1920x1080, and 16:10.
- OCR fixtures with active and unactivated substats.
- Confidence threshold tests.
- Watch mode hash tests so unchanged artifact panels do not re-run OCR.

## Build Checks

- `pnpm --filter @ri-genshin/probability-core test`
- `pnpm --filter @ri-genshin/desktop build`
- `dotnet build apps/scanner-win/GenshinArtifactScanner.Win.csproj`
