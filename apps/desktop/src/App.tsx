import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { Activity, Eye, FileJson, Image as ImageIcon, Keyboard, Pin, ScanLine, SlidersHorizontal, Square } from "lucide-react";
import {
  extractGoodArtifacts,
  GoodArtifact,
  GoodNormalizationWarning,
  goodArtifactToArtifactInput,
  normalizeGoodArtifact,
  ScanConfidence,
  assessScannerResultTrust,
  ScannerArtifactResult,
  ScannerScreenState
} from "@ri-genshin/artifact-schema";
import { BatchEvaluationResult, DEFAULT_PROFILES, evaluateArtifactExact, evaluateGoodArtifactBatch, ProbabilityResult } from "@ri-genshin/probability-core";
import { enableMainInput, lockRoiEditor, openRoiEditor } from "./nativeWindows";
import { loadLatestScannerResult, loadScanRegion, saveLatestScannerResult } from "./roi";
import { IDLE_SCAN_RESULT, SAMPLE_SCAN_RESULT } from "./sample";
import { classifyRegionArtifact, parseScreenshotFixture, scanRegionArtifact, scannerStatus, ScannerStatus } from "./scanner";
import {
  applyScannerCorrection,
  ARTIFACT_LEVEL_OPTIONS,
  ARTIFACT_MAIN_STAT_OPTIONS,
  ARTIFACT_SLOT_OPTIONS,
  ArtifactMainStatCorrection,
  ArtifactSlotCorrection,
  getScannerCorrectionState
} from "./scannerCorrection";
import { loadEvaluationProfile, saveEvaluationProfile } from "./evaluationProfile";
import { InfoTooltip } from "./InfoTooltip";
import { useSharedWatchState } from "./assistantRuntimeState";

const confidenceKeys = ["setKey", "slotKey", "mainStatKey", "level", "substats", "lock", "equipped"] as const;
const requiredConfidenceKeys = ["slotKey", "mainStatKey", "level", "substats"] as const;
const screenshotFixtures = [
  { label: "Bag +20", value: "bag-inventory-raw-1920x1200.png" },
  { label: "Equipped +20", value: "artifact-inventory-plus20.jpg" },
  { label: "Unactivated", value: "artifact-inventory-unactivated.jpg" },
  { label: "Grid 1280", value: "bag-grid-live-1280x800.png" }
] as const;
type ScreenshotFixtureName = (typeof screenshotFixtures)[number]["value"];

function toScreenshotFixtureName(value: string): ScreenshotFixtureName {
  return screenshotFixtures.find((fixture) => fixture.value === value)?.value ?? screenshotFixtures[0].value;
}

type InputEvaluation =
  | {
      kind: "single";
      result: ProbabilityResult;
      confidence: ScanConfidence;
      warnings: GoodNormalizationWarning[];
    }
  | {
      kind: "batch";
      batch: BatchEvaluationResult;
      confidence: ScanConfidence;
      warnings: GoodNormalizationWarning[];
    }
  | {
      kind: "error";
      error: string;
      confidence: ScanConfidence;
      warnings: GoodNormalizationWarning[];
    };

export function App() {
  const [status, setStatus] = useState<ScannerStatus | null>(null);
  const [artifactJson, setArtifactJson] = useState(formatArtifactJson(IDLE_SCAN_RESULT));
  const [profileId, setProfileId] = useState(() => loadEvaluationProfile().id);
  const [screenshotFixture, setScreenshotFixture] = useState<ScreenshotFixtureName>(screenshotFixtures[0].value);
  const [busy, setBusy] = useState(false);
  const [watching, setWatching] = useSharedWatchState();
  const [debugToolsOpen, setDebugToolsOpen] = useState(false);
  const [manualLevel, setManualLevel] = useState(0);
  const [manualSlotKey, setManualSlotKey] = useState<ArtifactSlotCorrection>("flower");
  const [manualMainStatKey, setManualMainStatKey] = useState<ArtifactMainStatCorrection>("hp");
  const [message, setMessage] = useState("No analysis has run yet. Open Genshin, set the ROI, then click Analyze.");
  const busyRef = useRef(false);
  const watchPollingRef = useRef(false);
  const lastScannedHashRef = useRef<string | null>(null);

  const profile = DEFAULT_PROFILES.find((item) => item.id === profileId) ?? DEFAULT_PROFILES[0];

  const evaluation = useMemo(() => evaluateJsonInput(artifactJson, profile), [artifactJson, profile]);
  const scannerResult = useMemo(() => parseScannerResult(artifactJson), [artifactJson]);
  const screenState = scannerResult?.screenState;
  const correction = useMemo(() => getScannerCorrectionState(scannerResult), [scannerResult]);

  useEffect(() => {
    void refreshStatus();
  }, []);

  useEffect(() => {
    if (!watching) {
      return undefined;
    }
    if (isTauri()) {
      const id = window.setInterval(() => {
        const latest = loadLatestScannerResult();
        if (latest) {
          setArtifactJson(formatArtifactJson(latest));
          setMessage(formatScannerMessage(latest, "Watch updated."));
        }
      }, 700);
      return () => window.clearInterval(id);
    }
    let ignore = false;
    const tick = () => {
      if (!ignore) {
        void handleWatchTick();
      }
    };
    tick();
    const id = window.setInterval(() => {
      tick();
    }, 1000);
    return () => {
      ignore = true;
      window.clearInterval(id);
    };
  }, [watching]);

  async function refreshStatus() {
    try {
      const next = await scannerStatus();
      setStatus(next);
    } catch {
      setStatus({ available: false, error: "Tauri scanner command is unavailable in browser preview." });
    }
  }

  async function openFixturePlayground() {
    try {
      await invoke("show_fixture_playground");
    } catch {
      window.open("?window=fixture-playground&fixture=character-plus20", "_blank", "noopener,noreferrer");
    }
  }

  async function handleEnableInput() {
    try {
      await enableMainInput();
      setMessage("Keyboard input enabled.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to enable keyboard input.");
    }
  }

  async function handleScan(silent = false) {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    if (!silent) {
      setMessage("Scanning artifact ROI...");
    }
    try {
      await lockRoiEditor().catch(() => undefined);
      const result = await scanRegionArtifact(loadScanRegion(), { occlusionAvoided: true });
      if (result.capture.regionHash) {
        lastScannedHashRef.current = result.capture.regionHash;
      }
      setArtifactJson(formatArtifactJson(result));
      saveLatestScannerResult(result);
      setMessage(formatScannerMessage(result, "Scan complete."));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Scanner unavailable.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleWatchTick() {
    if (watchPollingRef.current || busyRef.current) {
      return;
    }

    watchPollingRef.current = true;
    try {
      const classification = await classifyRegionArtifact(loadScanRegion());
      if (!classification.screenState?.readyForArtifactOcr) {
        setArtifactJson(formatArtifactJson(classification));
        saveLatestScannerResult(classification);
        setMessage(formatScannerMessage(classification, "Watching ROI..."));
        return;
      }

      const hash = classification.capture.regionHash;
      if (hash && hash === lastScannedHashRef.current) {
        return;
      }

      lastScannedHashRef.current = hash ?? null;
      await handleScan(true);
    } catch {
      setMessage("Watch requires the native Tauri scanner sidecar.");
    } finally {
      watchPollingRef.current = false;
    }
  }

  function loadFixture() {
    setArtifactJson(formatArtifactJson(SAMPLE_SCAN_RESULT));
    saveLatestScannerResult(SAMPLE_SCAN_RESULT);
    setMessage("Fixture result loaded.");
  }

  function applyManualCorrection() {
    if (!scannerResult || !correction.available) {
      return;
    }

    const corrected = applyScannerCorrection(scannerResult, {
      level: manualLevel,
      slotKey: manualSlotKey,
      mainStatKey: manualMainStatKey
    });
    setArtifactJson(formatArtifactJson(corrected));
    saveLatestScannerResult(corrected);
    setMessage("Manual OCR correction applied.");
  }

  async function handleEditRoi() {
    try {
      const next = status?.available ? status : await scannerStatus();
      setStatus(next);
      await openRoiEditor(next);
      setMessage("ROI edit mode enabled. Move or resize the red box, then lock it.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to open ROI editor.");
    }
  }

  async function handleScreenshotFixture() {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setMessage("Running OCR on screenshot fixture...");
    try {
      const result = await parseScreenshotFixture(screenshotFixture);
      setArtifactJson(formatArtifactJson(result));
      saveLatestScannerResult(result);
      setMessage(formatScannerMessage(result, `Screenshot OCR complete: ${result.capture.layout ?? "unknown layout"}.`));
    } catch {
      setMessage("Screenshot OCR requires the native Tauri scanner sidecar.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setArtifactJson(text);
    const importedScannerResult = parseScannerResult(text);
    if (importedScannerResult) {
      saveLatestScannerResult(importedScannerResult);
    }
    setMessage(`Loaded ${file.name}.`);
    event.target.value = "";
  }

  const confidenceLow = requiredConfidenceKeys.some((key) => {
    const value = evaluation.confidence[key];
    return value !== undefined && value < 0.85;
  });

  return (
    <main className="shell">
      <section className="toolbar">
        <button className="primary" onClick={() => void handleScan()} disabled={busy}>
          <ScanLine size={16} />
          {busy ? "Analyzing" : "Analyze"}
        </button>
        <button onClick={() => setWatching((value) => !value)}>
          {watching ? <Square size={16} /> : <Eye size={16} />}
          {watching ? "Stop" : "Watch"}
        </button>
        <button onClick={() => void handleEditRoi()}>
          <SlidersHorizontal size={16} />
          Edit ROI
        </button>
        <label className="profile-control" title={profile.description}>
          <span>Evaluation profile</span>
          <select
            value={profileId}
            onChange={(event) => {
              setProfileId(event.target.value);
              saveEvaluationProfile(event.target.value);
            }}
          >
            {DEFAULT_PROFILES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button className="icon-button" onClick={() => setDebugToolsOpen((value) => !value)} aria-expanded={debugToolsOpen} title="Developer tools" aria-label="Developer tools">
          <Activity size={16} />
        </button>
        <span className="toolbar__status" title={status?.error ?? status?.windowTitle ?? "Scanner status"}>
          <span className={status?.available ? "dot dot--ok" : "dot"} />
          {status?.available ? status.resolution : "scanner idle"}
        </span>
      </section>

      {debugToolsOpen ? (
        <section className="toolbar toolbar--debug" aria-label="Fixture and OCR debug tools">
          <button onClick={loadFixture}>
            <Activity size={16} />
            Fixture
          </button>
          <select className="fixture-select" value={screenshotFixture} onChange={(event) => setScreenshotFixture(toScreenshotFixtureName(event.target.value))} disabled={busy}>
            {screenshotFixtures.map((fixture) => (
              <option key={fixture.value} value={fixture.value}>
                {fixture.label}
              </option>
            ))}
          </select>
          <button onClick={() => void handleScreenshotFixture()} disabled={busy}>
            <ImageIcon size={16} />
            OCR
          </button>
          <button onClick={() => void openFixturePlayground()}>
            <ImageIcon size={16} />
            Playground
          </button>
          <label className="file-button">
            <FileJson size={16} />
            Import JSON
            <input type="file" accept=".json,application/json" onChange={(event) => void handleFileImport(event)} />
          </label>
          <button onClick={() => void refreshStatus()} title="Refresh scanner status">
            <Pin size={16} />
            Refresh status
          </button>
          <button onClick={() => void handleEnableInput()} title="Enable keyboard input. Exclusive fullscreen may minimize.">
            <Keyboard size={16} />
            Enable input
          </button>
        </section>
      ) : null}

      <p className="message">{message}</p>
      {screenState ? (
        <section className={`screen-state screen-state--${screenState.readyForArtifactOcr ? "ready" : "wait"}`}>
          <div>
            <b>{screenStateLabel(screenState)}</b>
            <span>{screenState.message}</span>
          </div>
          {scannerResult?.capture.regionHash ?? scannerResult?.capture.screenshotHash ? (
            <small>{(scannerResult.capture.regionHash ?? scannerResult.capture.screenshotHash)?.slice(0, 10)}</small>
          ) : null}
        </section>
      ) : null}

      <section className={`grid ${debugToolsOpen ? "" : "grid--single"}`}>
        <article className="panel result-panel">
          <div className="panel__header">
            <span>Decision</span>
            {confidenceLow ? (
              <small className="warn">review OCR</small>
            ) : (
              <small>{evaluation.kind === "batch" ? "batch" : evaluation.kind === "error" ? "waiting" : "ready"}</small>
            )}
          </div>
          {evaluation.kind === "single" ? (
            <>
              {scannerResult?.artifact ? <p className="artifact-facts">{formatArtifactFacts(scannerResult.artifact)}</p> : null}
              <h1>{evaluation.result.recommendation.title}</h1>
              <div className="metrics">
                <Metric label="Active Crit Value" value={evaluation.result.activeCritValue.toFixed(1)} help="CRIT Rate x 2 + CRIT DMG currently active." />
                <Metric label="Known Crit Value" value={evaluation.result.knownCritValue.toFixed(1)} help="Includes a visible unactivated stat because it is guaranteed to unlock." />
                <Metric label="Expected Crit Value at Max" value={evaluation.result.expectedFinalCritValue.toFixed(1)} help="Probability-weighted average Crit Value at this artifact rarity's maximum level." />
                <Metric label="Useful Roll Value" value={evaluation.result.usefulRollValue.toFixed(1)} help={`Normalized useful rolls for the ${evaluation.result.profileContext.name} profile.`} />
                <Metric
                  label="Chance to Reach Target"
                  value={formatPercent(evaluation.result.probabilityReachProfileTarget)}
                  help={`Exact chance to reach ${evaluation.result.profileContext.targetUsefulRollValue.toFixed(1)} Useful Roll Value for ${evaluation.result.profileContext.name}.`}
                />
                <Metric label="OCR Confidence" value={formatRequiredConfidence(evaluation.confidence)} help="How confidently the scanner read required fields. This is not artifact quality." />
              </div>
              <p className="profile-note">
                Evaluated for <b>{evaluation.result.profileContext.name}</b>. Main stat fit: {evaluation.result.profileContext.mainStatFit.replaceAll("-", " ")}. Set fit: not evaluated.
              </p>
              <div className="probability">
                {Object.entries(evaluation.result.probabilityByTargetRollCount).map(([rolls, probability]) => (
                  <div key={rolls}>
                    <span>{rolls} target</span>
                    <b>{formatPercent(probability)}</b>
                  </div>
                ))}
              </div>
              <ul className="explain">
                {evaluation.result.recommendation.explanation.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          ) : evaluation.kind === "batch" ? (
            <>
              <h1>Batch import ready</h1>
              <div className="metrics">
                <Metric label="Total" value={evaluation.batch.summary.total.toString()} />
                <Metric label="Evaluated" value={evaluation.batch.summary.evaluated.toString()} />
                <Metric label="Skipped" value={evaluation.batch.summary.skipped.toString()} />
                <Metric label="Warnings" value={evaluation.batch.summary.warningCount.toString()} />
              </div>
              <div className="batch-list">
                {evaluation.batch.evaluated.slice(0, 6).map((item) => (
                  <div key={`${item.index}-${item.id ?? "artifact"}`}>
                    <span>{item.id ?? `#${item.index + 1}`}</span>
                    <b>{item.result.recommendation.label}</b>
                  </div>
                ))}
              </div>
              {evaluation.batch.skipped.length > 0 ? (
                <ul className="explain">
                  {evaluation.batch.skipped.slice(0, 3).map((item) => (
                    <li key={`${item.index}-${item.id ?? "skipped"}`}>
                      {item.id ?? `#${item.index + 1}`}: {item.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <>
              {correction.available ? (
                <div className="level-correction">
                  <div>
                    <b>{correctionTitle(correction.missingFields)}</b>
                    <span>{correction.reason}</span>
                  </div>
                  {correction.needsSlotKey ? (
                    <label>
                      Slot
                      <select value={manualSlotKey} onChange={(event) => setManualSlotKey(event.target.value as ArtifactSlotCorrection)}>
                        {ARTIFACT_SLOT_OPTIONS.map((slot) => (
                          <option key={slot} value={slot}>
                            {friendlySlot(slot)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {correction.needsMainStatKey ? (
                    <label>
                      Main
                      <select value={manualMainStatKey} onChange={(event) => setManualMainStatKey(event.target.value as ArtifactMainStatCorrection)}>
                        {ARTIFACT_MAIN_STAT_OPTIONS.map((stat) => (
                          <option key={stat} value={stat}>
                            {friendlyStat(stat)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {correction.needsLevel ? (
                    <label>
                      Level
                      <select value={manualLevel} onChange={(event) => setManualLevel(Number(event.target.value))}>
                        {ARTIFACT_LEVEL_OPTIONS.map((level) => (
                          <option key={level} value={level}>
                            +{level}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <button className="primary" onClick={applyManualCorrection}>
                    Apply
                  </button>
                </div>
              ) : null}
              <p className="error">{evaluation.error}</p>
            </>
          )}
          {evaluation.warnings.length > 0 ? (
            <ul className="warnings">
              {evaluation.warnings.slice(0, 4).map((warning, index) => (
                <li key={`${warning.code}-${index}`}>{warning.message}</li>
              ))}
            </ul>
          ) : null}
        </article>

        {debugToolsOpen ? (
          <article className="panel">
            <div className="panel__header">
              <span>OCR Diagnostics</span>
              <small>not artifact quality</small>
            </div>
          <div className="confidence">
            {confidenceKeys.map((key) => (
              <div key={key}>
                <span>{key}</span>
                <meter min={0} max={1} value={evaluation.confidence[key] ?? 0} />
                <b>{evaluation.confidence[key] === undefined ? "n/a" : formatPercent(evaluation.confidence[key])}</b>
              </div>
            ))}
          </div>
          </article>
        ) : null}
      </section>

      {debugToolsOpen ? <section className="panel json-panel">
        <div className="panel__header">
          <span>Scanner JSON</span>
          <small>manual correction is live</small>
        </div>
        <textarea value={artifactJson} onChange={(event) => setArtifactJson(event.target.value)} spellCheck={false} />
      </section> : null}
    </main>
  );
}

function Metric({ label, value, help = label }: { label: string; value: string; help?: string }) {
  return (
    <div className="metric">
      <span>
        {label}
        <InfoTooltip label={label} content={help} />
      </span>
      <b>{value}</b>
    </div>
  );
}

function formatRequiredConfidence(confidence: ScanConfidence): string {
  const values = requiredConfidenceKeys
    .map((key) => confidence[key])
    .filter((value): value is number => typeof value === "number");
  return values.length === 0 ? "n/a" : formatPercent(Math.min(...values));
}

function formatArtifactFacts(artifact: GoodArtifact): string {
  const guaranteed = artifact.unactivatedSubstats?.length ?? 0;
  return `${artifact.rarity}-star ${friendlySlot(artifact.slotKey)} · ${friendlyStat(artifact.mainStatKey)} · +${artifact.level} · ${artifact.substats.length} active${guaranteed ? ` + ${guaranteed} guaranteed` : ""}`;
}

function friendlySlot(value: string): string {
  return ({ flower: "Flower", plume: "Plume", sands: "Sands", goblet: "Goblet", circlet: "Circlet" } as Record<string, string>)[value] ?? value;
}

function friendlyStat(value: string): string {
  return (
    {
      hp: "HP",
      atk: "ATK",
      hp_: "HP%",
      atk_: "ATK%",
      def_: "DEF%",
      eleMas: "Elemental Mastery",
      enerRech_: "Energy Recharge",
      critRate_: "CRIT Rate",
      critDMG_: "CRIT DMG"
    } as Record<string, string>
  )[value] ?? value;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatArtifactJson(result: ScannerArtifactResult): string {
  return JSON.stringify(result, null, 2);
}

function parseScannerResult(json: string): ScannerArtifactResult | null {
  try {
    const parsed = JSON.parse(json);
    return isScannerArtifactResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function formatScannerMessage(result: ScannerArtifactResult, readyMessage: string): string {
  if (result.screenState && !result.screenState.readyForArtifactOcr) {
    return result.screenState.message;
  }
  if (result.artifact) {
    return readyMessage;
  }
  return result.error ?? result.screenState?.message ?? "Scanner returned no artifact.";
}

function screenStateLabel(screenState: ScannerScreenState): string {
  switch (screenState.code) {
    case "game-not-found":
      return "Waiting";
    case "artifact-bag-grid":
      return "Artifact Grid";
    case "artifact-bag-detail":
      return "Bag Detail";
    case "character-artifact-detail":
      return "Character Detail";
    case "paimon-menu":
      return "Paimon Menu";
    case "unknown-game-screen":
      return "Open Details";
    default:
      return "Screen State";
  }
}

function correctionTitle(missingFields: string[]): string {
  if (missingFields.length === 1 && missingFields[0] === "level") {
    return "Review Level";
  }
  if (missingFields.length === 1 && missingFields[0] === "slotKey") {
    return "Review Slot";
  }
  if (missingFields.length === 1 && missingFields[0] === "mainStatKey") {
    return "Review Main Stat";
  }
  return "Review OCR";
}

function evaluateJsonInput(json: string, profile: (typeof DEFAULT_PROFILES)[number]): InputEvaluation {
  try {
    const parsed = JSON.parse(json);
    const scannerResult = isScannerArtifactResult(parsed) ? parsed : null;
    const confidence = scannerResult?.confidence ?? {};

    if (scannerResult) {
      const trust = assessScannerResultTrust(scannerResult);
      const scanWarnings = trust.warningMessages.map((message) => ({
        code: "review-ocr-confidence",
        message
      }));

      if (!trust.canEvaluate || !scannerResult.artifact) {
        return {
          kind: "error",
          error: trust.blockingReasons.join(" ") || scannerResult.error || "No artifact data was returned by the scanner.",
          confidence,
          warnings: scanWarnings
        };
      }

      return evaluateSingleGoodArtifact(scannerResult.artifact, confidence, profile, scanWarnings);
    }

    const artifacts = extractGoodArtifacts(parsed);
    if (artifacts.length === 0) {
      return {
        kind: "error",
        error: "JSON does not contain a scanner result, GOOD artifact, GOOD artifacts[], or fixture samples[].",
        confidence,
        warnings: []
      };
    }

    if (isBatchPayload(parsed)) {
      const batch = evaluateGoodArtifactBatch(artifacts, profile);
      return {
        kind: "batch",
        batch,
        confidence,
        warnings: batch.skipped.flatMap((item) => item.warnings).slice(0, 8)
      };
    }

    return evaluateSingleGoodArtifact(artifacts[0]!, confidence, profile);
  } catch (error) {
    return {
      kind: "error",
      error: error instanceof Error ? error.message : "Unable to parse artifact JSON.",
      confidence: {},
      warnings: []
    };
  }
}

function evaluateSingleGoodArtifact(
  good: GoodArtifact,
  confidence: ScanConfidence,
  profile: (typeof DEFAULT_PROFILES)[number],
  warnings: GoodNormalizationWarning[] = []
): InputEvaluation {
  const normalized = normalizeGoodArtifact(good);
  if (!normalized.artifact) {
    return {
      kind: "error",
      error: normalized.skipReason ?? "GOOD artifact could not be normalized.",
      confidence,
      warnings: [...warnings, ...normalized.warnings]
    };
  }

  try {
    const artifact = goodArtifactToArtifactInput(normalized.artifact);
    return {
      kind: "single",
      result: evaluateArtifactExact(artifact, profile),
      confidence,
      warnings: [...warnings, ...normalized.warnings]
    };
  } catch (error) {
    return {
      kind: "error",
      error: error instanceof Error ? error.message : "Artifact could not be evaluated.",
      confidence,
      warnings: [...warnings, ...normalized.warnings]
    };
  }
}

function isScannerArtifactResult(value: unknown): value is ScannerArtifactResult {
  return (
    isRecord(value) &&
    typeof value.mode === "string" &&
    ["visible-artifact", "fixture-card", "screenshot-artifact", "screen-classification", "region-artifact", "region-classification"].includes(value.mode) &&
    isRecord(value.capture) &&
    isRecord(value.confidence)
  );
}

function isBatchPayload(value: unknown): boolean {
  return (isRecord(value) && (Array.isArray(value.artifacts) || Array.isArray(value.samples))) || Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
