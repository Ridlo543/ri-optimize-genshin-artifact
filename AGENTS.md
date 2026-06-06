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

## Quality Workflow

For implementation work:

1. Inspect the repo and current diff first.
2. Keep changes scoped.
3. Run relevant tests/builds.
4. Report proof, unverified items, and residual risk.
