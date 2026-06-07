# TODO

## Current Status

This repo is a desktop-first Genshin artifact assistant with:

- React/Tauri UI in `apps/desktop`
- Windows scanner/OCR sidecar in `apps/scanner-win`
- GOOD schema normalization in `packages/artifact-schema`
- Evaluation logic in `packages/probability-core`

The scanner currently supports:

- Full screenshot parsing for bag detail and character artifact detail
- ROI-first parsing for live/native flows
- Manual correction when a required OCR field is missing
- Real screenshot regressions under `data/log-manual`

## Last Verified State

Verified on 2026-06-07:

- `dotnet test apps/scanner-win.Tests/GenshinArtifactScanner.Win.Tests.csproj --no-restore`
  - Passed: `91/91`
- `pnpm --filter @ri-genshin/desktop build:tauri`
  - Passed
- `pnpm --filter @ri-genshin/desktop tauri build`
  - Passed

Important verified repros:

- `data/log-manual/bug_new_2/GenshinImpact_yY0600CANu.png`
  - Character detail classification fixed
- `data/log-manual/bug_new_2/GenshinImpact_G2ZhtL0vyo.png`
  - Character detail classification fixed
- `data/log-manual/bug_new4/GenshinImpact_d6QhwtaXj4.jpg`
  - Padded ROI bag-detail repro now parses automatically with `level=20`

## Completed Recently

### Scanner and OCR

- Fixed teal/non-red character artifact panel classification.
- Fixed padded ROI level OCR for bag-detail repro `bug_new4`.
- Level OCR now survives slightly oversized live ROI captures.
- Screenshot fixture lookup now supports nested files under `data/log-manual`.
- Manual bag/character regressions are covered by scanner tests.

### Release Path

- Fixed Tauri non-debug runtime so packaged builds prefer the bundled scanner sidecar.
- Removed the main release-parity risk where repo-local debug scanner binaries could be used by mistake on developer machines.

### UX Already Landed

- Manual correction supports missing level, slot, and main stat.
- Bubble/main panel show OCR review states instead of failing silently.
- ROI-first flow and assistant bubble already exist in native Tauri.

## Completed History

Historical completed work is preserved in:

- [completed-work-log.md](./completed-work-log.md)

Use that file when you need:

- the broader implementation history,
- older completed milestones from previous sessions,
- previous fixture/test coverage notes,
- context for why the current architecture and flows look the way they do.

## Real Next TODO

These are the next tasks that an agent can implement directly.

### 1. Fix small-bubble info/details behavior

Problem:

- User reports the info/details button in the compact/small bubble still does not visibly open details in the release app.

Expected result:

- Clicking the info button in the small bubble expands or reveals the details panel reliably in native Tauri release builds.

Likely files:

- `apps/desktop/src/AssistantBubbleApp.tsx`
- `apps/desktop/src/AssistantBubbleSurface.tsx`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/styles.css`
- `apps/desktop/src-tauri/src/lib.rs`

Proof of done:

- Browser path works
- Native Tauri path works
- Details content is visible and not clipped
- Add or update a test if there is a clean seam

### 2. Improve ROI onboarding and failure messaging

Problem:

- User still finds ROI flow confusing.
- Current error wording is too technical when ROI is wrong or misses the artifact panel.

Expected result:

- ROI setup explains what ROI is in plain language.
- When OCR/classification fails because the red box misses the panel, the UI says `Adjust ROI` or equivalent user-facing guidance.
- The ROI-related button/control is visibly highlighted when user action is required.

Likely files:

- `apps/desktop/src/assistantSummary.ts`
- `apps/desktop/src/AssistantBubbleSurface.tsx`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/styles.css`

Proof of done:

- Summary state distinguishes `missing OCR data` vs `ROI likely wrong`
- UI text is non-technical
- ROI action is highlighted in the relevant state
- Add/update unit tests for summary logic if practical

### 3. Retest packaged installer outside repo runtime

Problem:

- The source tree and bundled sidecar are verified, but the final user-facing installer still needs an explicit retest outside the repo environment.

Expected result:

- Installed release app behaves the same as the verified CLI/source repros.

Required steps:

1. Install from:
   - `apps/desktop/src-tauri/target/release/bundle/nsis/`
   - or `apps/desktop/src-tauri/target/release/bundle/msi/`
2. Run the app outside the repo.
3. Re-test live/manual scan flow on the failing scenario.
4. If it still fails, capture:
   - screenshot
   - `logs/scanner/captures/*`
   - exact scan state/message shown in UI

Proof of done:

- New note added to docs with exact installed-app result
- If still broken, add the new artifact to `data/log-manual` and write a repro note

### 4. Expand live ROI verification across real client sizes

Problem:

- Current automated and fixture coverage is good, but live native ROI behavior across more resolutions is still not fully verified.

Expected result:

- Confirm ROI scanning works on more real Genshin client sizes and layouts.

Required focus:

- 16:9 and 16:10
- bag detail
- character detail
- overlay lock/unlock usability
- `capture.occlusionAvoided=true` when assistant windows are hidden during scan

Proof of done:

- Add a short results note to docs
- Preserve any failing screenshots in `data/log-manual`

## Agent Workflow For The Next Person

When picking up one of the tasks above:

1. Reproduce with the exact screenshot or UI path first.
2. Add or reuse the tightest deterministic test seam available.
3. Keep scanner fixes in `apps/scanner-win`.
4. Keep UI/wording fixes in `apps/desktop`.
5. Re-run the smallest relevant test/build commands.
6. Update this file with real outcomes, not intentions.

## Useful Commands

Scanner repro:

```powershell
dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-screenshot-artifact data/log-manual/bug_new4/GenshinImpact_d6QhwtaXj4.jpg --debug
```

ROI repro:

```powershell
dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-region-fixture GenshinImpact_d6QhwtaXj4.jpg "{ \"x\": 0.6802083333333333, \"y\": 0.09833333333333333, \"width\": 0.26875, \"height\": 0.8166666666666667, \"unit\": \"normalized-client\" }" --debug
```

Scanner tests:

```powershell
dotnet test apps/scanner-win.Tests/GenshinArtifactScanner.Win.Tests.csproj --no-restore
```

Desktop release build:

```powershell
pnpm --filter @ri-genshin/desktop build:tauri
pnpm --filter @ri-genshin/desktop tauri build
```

## Regression Fixtures To Keep

- `data/log-manual/bug_new_2/GenshinImpact_yY0600CANu.png`
- `data/log-manual/bug_new_2/GenshinImpact_G2ZhtL0vyo.png`
- `data/log-manual/bug_new4/GenshinImpact_d6QhwtaXj4.jpg`
- `data/log-manual/GenshinImpact_WGHmIpkN58.jpg`
- `data/log-manual/GenshinImpact_zuCNecgQiu.jpg`
- `data/log-manual/iTPXIcUjaV.png`

Do not replace or delete the original user-provided screenshots when adding new regressions.
