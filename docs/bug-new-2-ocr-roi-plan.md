# OCR and ROI Handoff

## Scope

This note is only for the remaining OCR/ROI-related work that is still open after the 2026-06-07 fixes.

Use `docs/todo.md` as the main operational entry point. This file is the focused handoff for the ROI/OCR bug cluster reported from real screenshots and release-app usage.

## What Is Already Fixed

### Character detail classification

Fixed and covered:

- `data/log-manual/bug_new_2/GenshinImpact_yY0600CANu.png`
- `data/log-manual/bug_new_2/GenshinImpact_G2ZhtL0vyo.png`

Outcome:

- These no longer fall through to bag-detail classification.
- Character artifact detail parsing works again for the teal/non-red theme cases.

### Padded ROI level OCR

Fixed and covered:

- `data/log-manual/bug_new_4/GenshinImpact_d6QhwtaXj4.jpg`

Outcome:

- ROI path now reads `level=20` correctly.
- The ROI itself was valid; the failure was in level-badge crop/preprocess/OCR.

Key code already changed:

- `apps/scanner-win/ArtifactRegionParser.cs`
- `apps/scanner-win/ArtifactImagePreprocessor.cs`
- `apps/scanner-win/ArtifactOcrService.cs`
- `apps/scanner-win/ArtifactTextParser.cs`
- `apps/scanner-win/ScannerPaths.cs`
- `apps/scanner-win.Tests/ArtifactRegionParserTests.cs`

### Release/runtime parity

Fixed in code:

- `apps/desktop/src-tauri/src/lib.rs`

Outcome:

- Non-debug Tauri runtime now prefers the bundled sidecar.
- This removes the main risk that a packaged app on a repo machine silently uses a stale local debug scanner.

## What Is Still Open

### 1. Small bubble info/details still needs release-path verification

User report:

- The info/details button in the small bubble did not visibly open details in the release app.

Current state:

- Not re-verified end-to-end in the packaged app after the latest scanner/runtime fixes.

Implementation target:

- Make small-bubble info/details reliably visible in native Tauri release builds.

Likely files:

- `apps/desktop/src/AssistantBubbleApp.tsx`
- `apps/desktop/src/AssistantBubbleSurface.tsx`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/styles.css`
- `apps/desktop/src-tauri/src/lib.rs`

Definition of done:

- Clicking info toggles visible details content in native release app
- Window height/bounds update correctly if needed
- Details are not clipped

### 2. ROI onboarding is still confusing

User report:

- User does not know what ROI is at the start.
- `Lock ROI` placement and overall flow are confusing.
- When ROI is wrong, current wording is too technical.

Implementation target:

- Explain ROI in plain language.
- Guide the user toward `Edit ROI` / `Lock ROI` / `Analyze`.
- Highlight the ROI control when the current red box likely misses the artifact panel.

Likely files:

- `apps/desktop/src/assistantSummary.ts`
- `apps/desktop/src/AssistantBubbleSurface.tsx`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/styles.css`

Definition of done:

- Wrong-ROI state says `Adjust ROI` or equivalent plain-language copy
- ROI action is highlighted
- First-run setup explains what ROI is

### 3. Packaged installer still needs final real-world retest

Current state:

- Source path, scanner tests, and Tauri build path are verified.
- Installed app outside repo has not yet been documented after the latest fixes.

Implementation target:

- Retest installer outside repo/runtime and document the result.

Definition of done:

- Installed app result is written back into `docs/todo.md`
- If still broken, add the exact screenshot and scan snapshot as a new regression input

## Exact Repros

### Character detail repros

```powershell
dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-screenshot-artifact data/log-manual/bug_new_2/GenshinImpact_yY0600CANu.png
dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-screenshot-artifact data/log-manual/bug_new_2/GenshinImpact_G2ZhtL0vyo.png
```

### Padded ROI repro

```powershell
dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-region-fixture GenshinImpact_d6QhwtaXj4.jpg "{ \"x\": 0.6802083333333333, \"y\": 0.09833333333333333, \"width\": 0.26875, \"height\": 0.8166666666666667, \"unit\": \"normalized-client\" }" --debug
```

Expected result:

- `missingFields=[]`
- `artifact.level=20`

### Packaged sidecar repro

```powershell
apps/desktop/src-tauri/binaries/GenshinArtifactScanner.Win.exe parse-region-fixture GenshinImpact_d6QhwtaXj4.jpg "{ \"x\": 0.6802083333333333, \"y\": 0.09833333333333333, \"width\": 0.26875, \"height\": 0.8166666666666667, \"unit\": \"normalized-client\" }" --debug
```

Expected result:

- Same successful ROI parse as the source CLI repro

## Recommended Order For The Next Agent

1. Re-test the packaged installer behavior for the small bubble info/details path.
2. Fix ROI onboarding text and highlighting.
3. If installer still behaves differently, capture a new regression screenshot and scan snapshot before changing scanner logic again.

## Verification Commands

```powershell
dotnet test apps/scanner-win.Tests/GenshinArtifactScanner.Win.Tests.csproj --no-restore
pnpm --filter @ri-genshin/desktop build:tauri
pnpm --filter @ri-genshin/desktop tauri build
```
