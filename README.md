# Genshin Artifact Decision Assistant

Windows desktop-first floating assistant for fast Genshin Impact artifact upgrade decisions.

The app combines:

- Tauri v2 + React/Vite/TypeScript desktop UI.
- A pure TypeScript artifact probability engine.
- A C# .NET Windows scanner sidecar for process detection, screen capture, and future OCR parsing.

## Current Status

This is the initial MVP scaffold:

- Probability core is implemented and covered by unit tests.
- Desktop UI can evaluate fixture/manual scanner JSON.
- Tauri command wrappers are wired to the C# sidecar.
- The scanner sidecar can detect the Genshin window and capture the visible artifact panel.
- OCR parsing is intentionally staged for the next iteration and should be developed with fixture crops first.

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
