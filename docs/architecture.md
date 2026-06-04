# Architecture

## Overview

The app is split into four workspaces:

- `apps/desktop`: Tauri v2 + React/Vite UI for the floating desktop assistant.
- `apps/scanner-win`: C# Windows sidecar for process detection, screen capture, and future OCR.
- `packages/artifact-schema`: GOOD-compatible types and stat key mapping.
- `packages/probability-core`: deterministic artifact validation, scoring, exact outcome enumeration, and recommendation logic.

## Data Flow

1. User opens an artifact detail or enhance screen in Genshin.
2. The desktop UI triggers `scanner_scan_visible_artifact`.
3. Tauri runs the Windows scanner sidecar.
4. The scanner returns JSON with artifact data and confidence.
5. The UI validates and maps GOOD keys into internal stat types.
6. The probability core computes exact results and recommendations.
7. The UI shows confidence, score, probability, and stop/continue guidance.

## Current Scanner State

The sidecar currently implements status detection, sample output, and artifact panel capture plumbing. OCR parsing is intentionally isolated for the next iteration so tests can be built around fixtures before relying on live game screenshots.
