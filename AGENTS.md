# Agent Instructions

## Product Shape

This repository is a Windows desktop-first Genshin Impact artifact decision assistant. The MVP is a floating, always-on-top desktop app that evaluates one visible artifact quickly. Future web/mobile support should reuse the TypeScript probability core but should not assume automatic screen capture on mobile.

## Architecture Rules

- Keep probability logic in `packages/probability-core` as pure TypeScript with deterministic tests.
- Keep GOOD-compatible schema and key mappings in `packages/artifact-schema`.
- Keep React/Tauri UI in `apps/desktop`; do not put artifact math inside React components.
- Keep screen capture and OCR work in `apps/scanner-win`; do not run heavy OCR in React.
- Treat scanner output as untrusted input and validate it before evaluation.
- Prefer ROI-first live scanning: the user positions a normalized artifact-card rectangle, the scanner crops only that region, and full-screen parsing remains fallback/debug.
- Use the fixture playground for offline UI/OCR development before live Genshin checks: `http://localhost:5173?window=fixture-playground&fixture=character-plus20`.
- The default assistant flow is manual `Analisis`; `Watch` must remain explicit opt-in and must never start hidden automation.

## Scanner Safety Policy

- Allowed: screenshot capture, image preprocessing, OCR, fixture-based tests, user-triggered hotkeys, and explicit batch automation in future scope.
- Not allowed: memory reading, packet interception, game file modification, bypassing anti-cheat, or hidden automation.
- The scanner must explain when it used fixture/sample data instead of real OCR.
- Preserve third-party license notices if any Inventory Kamera code, model, or traineddata is copied.

## Documentation Tooling

Use Context7 MCP whenever answering or implementing questions involving libraries, frameworks, SDKs, APIs, CLI tools, or cloud services. Resolve the library first, then query docs.

## Resolution Handling

- **ROI-first path (live scanner)**: fully resolution-safe — `ArtifactRegionParser` uses normalized client coordinates (0..1). Always adapts.
- **Screenshot fallback path**: `RectFromScreen()` divides by 1920×1200 for consistent normalized coordinates. `ImageCropper.Scale()` converts back to actual pixel coords using screenshot dimensions. At 16:9, character panel is proportionally positioned — scaling gives correct crops without vertical shift. A conditional yShift fallback retries when OCR fails at non-1200p.
- **Fixture coverage**: 37/43 fixtures at 1920×1200 (16:10), 1 at 1280×800 (16:10). **4 fixtures at 1920×1080 (16:9) — wired as regression tests (122/122 total).** 2 bag fixtures pass via proportional scaling; 2 character fixtures pass via no-shift-first + conditional yShift fallback.
- **`ImageCropper.Scale()`**: resolution-agnostic — `ImageCropperTests.cs` proves correct behavior across 960×600, 1920×1200, 3840×2400, and documents the 16:9 vertical shift.
- **Conditional yShift**: `yShift = (1200 - height) * 7 / 20` applied only when slot/mainStat missing AND height ≠ 1200. Not universal — proportional scaling (no shift) is the primary path. This handles both images that need shift and images that don't (verified with 1080p fixtures).
- **Dice coefficient fuzzy matching** (`ArtifactTextParser.cs:ParseSlotKey`): Bigram Dice fallback with threshold 0.35 recovers garbled slot text (e.g. "pumeordean" → "plume", "Goblet of Eonothem" → "goblet"). 12 dedicated tests.
- **IK-style slot preprocessing** (`ArtifactImagePreprocessor.cs:PreprocessSlot`): Contrast(80) → Grayscale → Invert, no scaling. Last-resort fallback in `ReadSlotKey` at confidence ≥ 0.45.
- **Flower/plume short-circuit** (`ArtifactOcrService.cs:ReadMainStatKey`): Returns "hp"/"atk" immediately when slot is flower/plume. No OCR needed.
- **Dual aspect-ratio profiles**: Factory methods `CreateBagProfile()`, `CreateCharacterProfile()`, `CreateCharacterLongTitleProfile()` replace static readonly profiles. Same 1200p-reference coordinates; yShift passed separately.

## Quality Workflow

For implementation work:

1. Inspect the repo and current diff first.
2. Keep changes scoped.
3. Run relevant tests/builds.
4. Report proof, unverified items, and residual risk.
