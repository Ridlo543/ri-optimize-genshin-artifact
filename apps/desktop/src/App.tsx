import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Eye, FileJson, Image as ImageIcon, Pin, ScanLine, SlidersHorizontal, Square, Zap } from "lucide-react";
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
import { loadScanRegion, saveLatestScannerResult, saveRoiEditMode, saveRoiOpacity } from "./roi";
import { SAMPLE_SCAN_RESULT } from "./sample";
import { classifyRegionArtifact, parseScreenshotFixture, scanRegionArtifact, scannerStatus, ScannerStatus } from "./scanner";

const confidenceKeys = ["setKey", "slotKey", "mainStatKey", "level", "substats", "lock", "equipped"] as const;
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
  const [artifactJson, setArtifactJson] = useState(formatArtifactJson(SAMPLE_SCAN_RESULT));
  const [profileId, setProfileId] = useState(DEFAULT_PROFILES[0].id);
  const [screenshotFixture, setScreenshotFixture] = useState<ScreenshotFixtureName>(screenshotFixtures[0].value);
  const [busy, setBusy] = useState(false);
  const [watching, setWatching] = useState(false);
  const [message, setMessage] = useState("Fixture loaded. Set ROI on the artifact card, then scan.");
  const busyRef = useRef(false);
  const watchPollingRef = useRef(false);
  const lastScannedHashRef = useRef<string | null>(null);

  const profile = DEFAULT_PROFILES.find((item) => item.id === profileId) ?? DEFAULT_PROFILES[0];

  const evaluation = useMemo(() => evaluateJsonInput(artifactJson, profile), [artifactJson, profile]);
  const scannerResult = useMemo(() => parseScannerResult(artifactJson), [artifactJson]);
  const screenState = scannerResult?.screenState;

  useEffect(() => {
    void refreshStatus();
  }, []);

  useEffect(() => {
    if (!watching) {
      return undefined;
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
      const result = await scanRegionArtifact(loadScanRegion());
      if (result.capture.regionHash) {
        lastScannedHashRef.current = result.capture.regionHash;
      }
      setArtifactJson(formatArtifactJson(result));
      saveLatestScannerResult(result);
      setMessage(formatScannerMessage(result, "Scan complete."));
    } catch {
      setArtifactJson(formatArtifactJson(SAMPLE_SCAN_RESULT));
      setMessage("Scanner unavailable; fixture result loaded for UI/core development.");
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

  function handleEditRoi() {
    saveRoiEditMode(true);
    saveRoiOpacity("visible");
    setMessage("ROI edit mode enabled. Move or resize the red box, then lock it.");
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

  const confidenceLow = confidenceKeys.some((key) => {
    const value = evaluation.confidence[key];
    return value !== undefined && value < 0.85;
  });

  return (
    <main className="shell">
      <header className="titlebar" data-tauri-drag-region>
        <div className="titlebar__brand" data-tauri-drag-region>
          <Zap size={16} />
          <span>Artifact Assistant</span>
        </div>
        <div className="titlebar__status" title={status?.error ?? status?.windowTitle ?? "Scanner status"}>
          <span className={status?.available ? "dot dot--ok" : "dot"} />
          {status?.available ? status.resolution : "scanner idle"}
        </div>
      </header>

      <section className="toolbar">
        <button className="primary" onClick={() => void handleScan()} disabled={busy}>
          <ScanLine size={16} />
          {busy ? "Scanning" : "Scan"}
        </button>
        <button onClick={() => setWatching((value) => !value)}>
          {watching ? <Square size={16} /> : <Eye size={16} />}
          {watching ? "Stop" : "Watch"}
        </button>
        <button onClick={handleEditRoi}>
          <SlidersHorizontal size={16} />
          Edit ROI
        </button>
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
        <label className="file-button">
          <FileJson size={16} />
          Import
          <input type="file" accept=".json,application/json" onChange={(event) => void handleFileImport(event)} />
        </label>
        <button onClick={() => void refreshStatus()} title="Refresh scanner status">
          <Pin size={16} />
        </button>
      </section>

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

      <section className="grid">
        <article className="panel result-panel">
          <div className="panel__header">
            <span>Decision</span>
            {confidenceLow ? <small className="warn">review OCR</small> : <small>{evaluation.kind === "batch" ? "batch" : "ready"}</small>}
          </div>
          {evaluation.kind === "single" ? (
            <>
              <h1>{evaluation.result.recommendation.title}</h1>
              <div className="metrics">
                <Metric label="Current CV" value={evaluation.result.currentCV.toFixed(1)} />
                <Metric label="Expected CV" value={evaluation.result.expectedFinalCV.toFixed(1)} />
                <Metric label="Expected score" value={evaluation.result.expectedFinalScore.toFixed(1)} />
                <Metric label="P >= 30 score" value={formatPercent(evaluation.result.probabilityReachScoreThreshold[30] ?? 0)} />
              </div>
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
            <p className="error">{evaluation.error}</p>
          )}
          {evaluation.warnings.length > 0 ? (
            <ul className="warnings">
              {evaluation.warnings.slice(0, 4).map((warning, index) => (
                <li key={`${warning.code}-${index}`}>{warning.message}</li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="panel">
          <div className="panel__header">
            <span>Profile</span>
          </div>
          <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
            {DEFAULT_PROFILES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

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
      </section>

      <section className="panel json-panel">
        <div className="panel__header">
          <span>Scanner JSON</span>
          <small>manual correction is live</small>
        </div>
        <textarea value={artifactJson} onChange={(event) => setArtifactJson(event.target.value)} spellCheck={false} />
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
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
