# ADR 0002: Tauri + React UI With C# Scanner Sidecar

## Decision

Use Tauri v2 + React/Vite/TypeScript for the UI and C# .NET for the Windows scanner sidecar.

## Rationale

Tauri keeps the UI lightweight and desktop-friendly while preserving a future web path. C# is a better fit for scanner work because Inventory Kamera's proven patterns are C# and Windows API access is direct.

## Consequences

The scanner and UI communicate through JSON. Heavy OCR and screen capture must stay outside React.
