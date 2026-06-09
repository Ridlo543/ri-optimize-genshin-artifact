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

Verified on 2026-06-11 (weighted-roll model verified, OCR optimizations completed):

### Tests
- `dotnet test apps/scanner-win.Tests/GenshinArtifactScanner.Win.Tests.csproj --no-restore`
  - Passed: **122/122** (106 original + 12 Dice fuzzy matching + 4 1080p fixture tests)
  - Dice coefficient fuzzy matching for slot (12 tests)
  - IK-style slot preprocessing (last-resort fallback)
  - Dual aspect-ratio profiles (no regression)
  - Conditional yShift fallback (no-shift-first, shifted fallback if missing)
- `pnpm --filter @ri-genshin/probability-core test`
  - Passed: **13/13**
- `pnpm --filter @ri-genshin/desktop test`
  - Passed: **47/47**
- `pnpm --filter @ri-genshin/desktop build`
  - Passed (TypeScript + Vite production build)
- `pnpm tauri:smoke` — passed

### Changes this session (2026-06-11)
- **Promise leak fix** (`apps/desktop/src/scanner.ts:111`): `invokeScanner` previously dropped unhandled promise rejection when `invoke()` lost the race to timeout. Fixed by separating `invokePromise` and adding `.catch(() => {})` to suppress the losing rejection.
- **Magic number extraction** (`apps/scanner-win/ScreenshotArtifactParser.cs:274`): Moved hardcoded bag card height `962` from `CropFields` conditional into `ScreenshotLayoutProfile.FixedPanelHeight` (nullable). Set only in `CreateBagProfile()`. Removes magic number and `profile.Name == "bag-inventory-card"` string coupling from generic crop logic.
- **Weighted-roll model verified**: Compared v2 (uniform `1/N`) vs v3 (weighted `[7,5,3,1]`) across 11 real artifacts from fixture data + 6 crafted scenarios. v3 is systematically lower by 1.7–5.3% for `expectedFinalUsefulRollValue` (correct — low rolls are more common in real game). No edge cases produce wrong estimates. All 13+34 comparison tests pass.
- **Backward-compatible API extension**: `enumerateOutcomes()` now accepts optional third parameter `getRollValueProbs` for injecting custom roll value probability functions (defaults to v3 weight table). Zero breakage to existing callers.
- **OCR Optimization 1**: Skip duplicate Lock + Location OCR in long-title merge. `ReadFields` accepts optional `precomputedLocked`/`precomputedLocation` parameters. Saves ~300ms–1s per character scan. 122/122 scanner tests pass.

### Changes this session (2026-06-10)
- **1080p resolution support**: Added conditional yShift fallback for character detail at non-1200p. First pass uses proportional scaling (no shift); if slot/mainStat missing, retry with yShift. Both 1080p and 1200p fixtures pass.
- **Dual aspect-ratio profiles**: Factory methods `CreateBagProfile()`, `CreateCharacterProfile()`, `CreateCharacterLongTitleProfile()` replace static readonly profiles. Cleaner separation of 16:9 vs 16:10 coordinate handling.
- **Dice coefficient fuzzy matching** (`ArtifactTextParser.ParseSlotKey`): Bigram Dice fallback with threshold 0.35 recovers garbled slot text. 12 dedicated tests.
- **IK-style slot preprocessing** (`ArtifactImagePreprocessor.PreprocessSlot`): Contrast(80) → Grayscale → Invert, no scaling. Last-resort fallback in `ReadSlotKey` with confidence gate ≥ 0.45.
- **Flower/plume mainStat short-circuit**: Returns "hp"/"atk" immediately — no OCR needed.
- **1080p regression fixtures**: 4 new fixture tests (bag inventory + character detail at 1920×1080). All pass.
- **Removed `ApplyShiftedFallback`** — replaced by conditional yShift in `ParseBitmap` that only activates when slot/mainStat missing at non-1200p.
- **OCR optimization (1 of 3 implemented)**: Skip duplicate Lock/Equipped OCR in long-title merge via `precomputedLocked`/`precomputedLocation` parameters. Optimizations 2 (PreprocessSlot color matrix) and 3 (early-exit fallback chains) determined to be either risky-without-gain or already-implemented, respectively.

### Prior work still valid
- Installers at `bundle/nsis/` and `bundle/msi/`
- ROI lock flow (red box lock badge, status bar), failure messaging (field-specific titles), details sizing all verified
- Genshin teleport waypoint icon design

### Remaining gaps
- Human GUI test needed for installer + live character-detail flow
- Weighted-roll model accuracy: user lives to verify against real recommendations

Current user-reported production gap on 2026-06-08:

- Bag detail is now mostly auto-parsing correctly in live/release usage.
- Character detail has been improved: when the ROI-based scan detects a character panel
  but critical fields are missing, the scanner now falls back to the full-screenshot parser
  which uses absolute crop coordinates designed for character panels.
- ROI lock flow is still confusing in the live overlay because the `Lock ROI` action sits
  at the top-left and users do not realize they must lock before other controls become usable.

Important verified repros:

- `data/log-manual/bug_new_2/GenshinImpact_yY0600CANu.png`
  - Character detail classification fixed
- `data/log-manual/bug_new_2/GenshinImpact_G2ZhtL0vyo.png`
  - Character detail classification fixed
- `data/log-manual/bug_new_4/GenshinImpact_d6QhwtaXj4.jpg`
  - Padded ROI bag-detail repro now parses automatically with `level=20`
- `data/log-manual/bug_new_3/GenshinImpact_YoOztRYUjI.jpg`
  - Character detail character-detail CelestialGift sands atk_ +0 with 3+1 substats
  - ROI with default region (0.68, 0.1, 0.27, 0.8) now falls back to full-screenshot parser
  - Correct ROI region (0.75625, 0.075, 0.2427, 0.8333) parses directly
- `data/log-manual/bug_new_3/GenshinImpact_B79dTeO1B3.jpg`
  - Bag detail DEF% goblet +20 (Moonlit Offering's Libation, unrecognized set, non-blocking)
- `data/log-manual/bug_new_3/GenshinImpact_S6f5iqBq6i.jpg`
  - Bag detail CelestialGift ATK% sands +20
- `data/log-manual/bug_new_3/GenshinImpact_It8PONhJGN.jpg`
  - Bag detail Instructor plume +10
- `data/log-manual/bug_new_5/1780836859247.png`
  - Bag detail CelestialGift flower +20
- `data/log-manual/bug_new_1/sucess1.png`
  - Bag detail ObsidianCodex ATK% sands +20 (equipped on Fischl)
- `data/log-manual/bug_new_1/GenshinImpact_T3mXtQSZzq.png`
  - Non-artifact screen (character showcase): correctly returns missing fields (no crash)

## Completed Recently

### Probability & Data Architecture

- **Weighted roll values**: Community-datamined non-uniform distribution (44%/31%/19%/6% for 5-star, 50%/33%/17% for 2-star). `getRollValueProbabilities()` in distribution.ts; `enumerateOutcomes()` in exact.ts uses per-tier weights.
- **Data deduplication**: `ARTIFACT_MAX_LEVEL_BY_RARITY` removed from probability-core (duplicate of artifact-schema `ArtifactLevel`). Added `STAT_TYPE_TO_LABEL` and `STAT_TYPE_IS_PERCENT` to `good.ts`.
- **Model version**: Bumped `"artifact-exact-v2"` → `"artifact-exact-v3"`.

### Scanner and OCR

- **Otsu thresholding for level badge**: Replaced fixed brightness=150 with Otsu's method (`ComputeOtsuThreshold()`). Computes optimal binary threshold from pixel histogram via between-class variance maximization. Adapts to varying screenshot brightness automatically.
- **Substat scaling tested and reverted**: 2x bicubic scaling caused regression on unactivated (grayed-out) substat text by blurring already-low-contrast pixels. Color-matrix-only approach retained.
- Fixed teal/non-red character artifact panel classification.
- Fixed padded ROI level OCR for bag-detail repro `bug_new4`.
- Level OCR now survives slightly oversized live ROI captures.
- Screenshot fixture lookup now supports nested files under `data/log-manual`.
- Manual bag/character regressions are covered by scanner tests.

### UX

- **ROI→Set Area rename**: All user-facing "ROI" text replaced with "scan area"/"red box"/"artifact detail panel". Gold pulse animation draws attention to Set Area button when area not configured.
- **Shadow artifacts removed**: Outer box-shadow stripped from launcher (base + `--ready`, `--review`, `--waiting`, `--error`) and bubble. Bubble gets `overflow: hidden`.
- **Icon fills bubble**: Logo mark `width:100%; height:100%`. Double-ring (SVG icon + CSS inset border) eliminated.

### Release Path

- Fixed Tauri non-debug runtime so packaged builds use the bundled scanner publish folder from app resources.
- Removed the broken single-file scanner publish path that could classify screens but crashed on OCR with `Value cannot be null. (Parameter 'path1')`.
- `scripts/publish-scanner-sidecar.ps1` now publishes a self-contained non-single-file scanner folder.
- `apps/desktop/src-tauri/src/lib.rs` now resolves `binaries/scanner-publish/GenshinArtifactScanner.Win.exe` from `BaseDirectory::Resource` at runtime.

### UX Already Landed

- Manual correction supports missing level, slot, and main stat.
- Bubble/main panel show OCR review states instead of failing silently.
- ROI-first flow and assistant bubble already exist in native Tauri.
- Launcher bubble now expands again in native smoke after adding a click fallback to the collapsed launcher gesture.
- Launcher bubble was further hardened to stay passive in Tauri by using a non-button launcher surface and non-focusable bubble controls.
- Native smoke now stops at reliable window-manager assertions: startup visibility, topmost state, expansion, hidden main/overlay windows, and foreground-focus preservation.
- Manual correction inputs now reset from the current scanner draft instead of keeping stale values from a previous scan.
- ROI overlay copy now explains that the red box is the OCR capture area, and the edit-mode exit action is now labeled `Use This Area`.

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

### 1. ✅ Weighted-roll model verified against 11 real artifacts + distribution analysis

**Status: Verified — all results are consistent with expected community-datamined behavior.**

Comparison of v2 (uniform `1/N`) vs v3 (weighted `[7,5,3,1]` / `[3,2,1]`):

| Finding | Detail |
|---|---|
| **Per-roll expected value** | v3 is ~5.9% (2-star) / ~7.4% (3-5-star) lower than v2 per individual roll — correct: low rolls are weighted 7× higher than high rolls |
| **`expectedFinalUsefulRollValue`** | v3 is **1.7–5.3% lower** for artifacts with remaining upgrade events (typical ~3.5%); **identical for +20** artifacts (no roll events) |
| **`probabilityReachProfileTarget`** | v3 is **2–92% lower** — biggest impact on marginal artifacts (DEF goblet: -34%, 4-star: -92%); high-quality artifacts (feather with 3 crit subs) only -2.3% |
| **`probabilityByTargetRollCount`** | **Identical** between v2 and v3 — roll value probability is independent of which stat gets selected |
| **Recommendation labels** | **Unchanged** for all tested artifacts — differences are in quantitative metrics, not qualitative categories |

Key insight: v3 is **more conservative but more realistic**. The uniform model (v2) systematically overestimated how good an artifact could become by assuming all roll values are equally likely. v3 correctly biases toward the low rolls that dominate real Genshin artifact upgrading.

No edge cases found where v3 produces clearly wrong estimates. The model passes all 13+34 tests and the monotonicity property holds.

### 2. 🔲 Target low-confidence OCR fields

**Status: Awaiting user feedback**

User confirmed auto OCR works but "some fields have low confidence". Need specifics:
- Which fields: unactivated substats? set name? level? main stat?
- Which screen: character detail? bag detail? both?
- Share failing screenshot + scan log for targeted preprocessing improvement.

Potential improvements depending on the specific field:
- **Unactivated substats**: Already at color-matrix-only (no scaling). Could try adaptive contrast enhancement.
- **Set name**: Uses 3x scaling + color matrix. Could try higher contrast or different PSM.
- **Level**: Now uses Otsu threshold (improved). If still low, check `CropDarkPill` fixed RGB thresholds.
- **Main stat (character detail)**: The text sits inside a colored rarity circle — different preprocessing might be needed.

### 3. 🔲 Build and test packaged installer

- Build latest: `pnpm --filter @ri-genshin/desktop build:tauri && pnpm --filter @ri-genshin/desktop tauri build`
- Install from NSIS or MSI on a clean machine
- Live-test: Set Area → Analyze → see recommendation → verify weighted-roll model feels correct

### 4. ✅ Add 1920×1080 (16:9) resolution fixtures

- 4 fixtures added (`bag_inventory_1920x1080_1.jpg`, `_2.jpg`, `character_details_1920x1080_1.jpg`, `_2.jpg`)
- Wired as regression tests in `ScreenshotArtifactParserTests.cs`
- All pass: bag fixtures via proportional scaling, character fixtures via no-shift-first + conditional yShift fallback
- See `data/fixtures/screenshots/` (formerly in `new/` subdirectory)

## Completed Tasks (moved to historical log)

The following completed items are preserved in [completed-work-log.md](./completed-work-log.md):

| # | Task | Date |
|---|---|---|
| 1 | Fix character-detail auto OCR — character panel fallback | 2026-06-08 |
| 2 | Move ROI lock flow into the red box | 2026-06-08 |
| 3 | Field-specific failure messaging instead of generic "Review OCR" | 2026-06-08 |
| 4 | Fix small-bubble info/details not resizing in native release | 2026-06-08 |
| 5 | Retest packaged installer — scanner sidecar rebuilt | 2026-06-08 |
| 6 | Resolution coverage analysis — 16:9 gap documented | 2026-06-08 |
| 7 | Custom Genshin-themed icons — waypoint portal design | 2026-06-08 |
| 8 | Keep native smoke split from inner bubble control coverage | 2026-06-08 |
| — | Data refactoring (STAT_TYPE_TO_LABEL, dedup) | 2026-06-09 |
| — | Weighted roll value distribution (model v3) | 2026-06-09 |
| — | Otsu thresholding for level badge OCR | 2026-06-09 |
| — | ROI→Set Area rename, shadow fixes, icon fill | 2026-06-09 |
| — | 1080p resolution support + OCR improvements (Dice, IK, dual profiles) | 2026-06-10 |
| — | Weighted-roll model v3 verification (11 artifacts + distro analysis) | 2026-06-11 |
| — | OCR optimizations (1/3: skip duplicate Lock/Location in long-title merge) | 2026-06-11 |

## Agent Workflow For The Next Person

When picking up one of the tasks above:

1. Reproduce with the exact screenshot or UI path first.
2. Add or reuse the tightest deterministic test seam available.
3. Keep scanner fixes in `apps/scanner-win`.
4. Keep UI/wording fixes in `apps/desktop`.
5. Re-run the smallest relevant test/build commands.
6. Update this file with real outcomes, not intentions.

If the task is about live character-detail OCR:

7. Ask for failing release-app screenshots and scan artifacts early instead of assuming the old bag-detail regressions are enough.

## Useful Commands

Scanner repro:

```powershell
dotnet run --project apps/scanner-win/GenshinArtifactScanner.Win.csproj -- parse-screenshot-artifact data/log-manual/bug_new_4/GenshinImpact_d6QhwtaXj4.jpg --debug
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

Installer and release notes:

- See [testing.md](./testing.md#desktop-release-build)

## Regression Fixtures To Keep

- `data/log-manual/bug_new_2/GenshinImpact_yY0600CANu.png`
- `data/log-manual/bug_new_2/GenshinImpact_G2ZhtL0vyo.png`
- `data/log-manual/bug_new_4/GenshinImpact_d6QhwtaXj4.jpg`
- `data/log-manual/GenshinImpact_WGHmIpkN58.jpg`
- `data/log-manual/GenshinImpact_zuCNecgQiu.jpg`
- `data/log-manual/iTPXIcUjaV.png`

Do not replace or delete the original user-provided screenshots when adding new regressions.
