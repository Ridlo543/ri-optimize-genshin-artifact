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
- Fixture coverage includes GOOD import, substat OCR crops, full screenshot parsing, passive screen-state detection, and ROI parsing.
- Live Genshin ROI calibration remains the main manual verification step.

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

Run Tauri after Rust is installed:

```bash
pnpm tauri:dev
```

Run scanner commands:

```bash
pnpm scanner:status
pnpm scanner:sample
pnpm scanner:scan
```

Primary live scanning now uses a normalized ROI:

```bash
dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- scan-region-artifact --region-json "{ \"x\": 0.68, \"y\": 0.1, \"width\": 0.27, \"height\": 0.8, \"unit\": \"normalized-client\" }"
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
