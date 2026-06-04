import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Activity, Eye, FileJson, Pin, ScanLine, Square, Zap } from "lucide-react";
import {
  extractGoodArtifacts,
  GoodArtifact,
  GoodNormalizationWarning,
  goodArtifactToArtifactInput,
  normalizeGoodArtifact,
  ScanConfidence,
  ScannerArtifactResult
} from "@ri-genshin/artifact-schema";
import { BatchEvaluationResult, DEFAULT_PROFILES, evaluateArtifactExact, evaluateGoodArtifactBatch, ProbabilityResult } from "@ri-genshin/probability-core";
import { SAMPLE_SCAN_RESULT } from "./sample";
import { scanVisibleArtifact, scannerStatus, ScannerStatus } from "./scanner";

const confidenceKeys = ["setKey", "slotKey", "mainStatKey", "level", "substats", "lock", "equipped"] as const;

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
  const [busy, setBusy] = useState(false);
  const [watching, setWatching] = useState(false);
  const [message, setMessage] = useState("Fixture loaded. Press scan when Genshin artifact detail is visible.");

  const profile = DEFAULT_PROFILES.find((item) => item.id === profileId) ?? DEFAULT_PROFILES[0];

  const evaluation = useMemo(() => evaluateJsonInput(artifactJson, profile), [artifactJson, profile]);

  useEffect(() => {
    void refreshStatus();
  }, []);

  useEffect(() => {
    if (!watching) {
      return undefined;
    }
    const id = window.setInterval(() => {
      void handleScan(true);
    }, 1000);
    return () => window.clearInterval(id);
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
    setBusy(true);
    if (!silent) {
      setMessage("Scanning visible artifact panel...");
    }
    try {
      const result = await scanVisibleArtifact();
      setArtifactJson(formatArtifactJson(result));
      setMessage(result.artifact ? "Scan complete." : result.error ?? "Scanner returned no artifact.");
    } catch {
      setArtifactJson(formatArtifactJson(SAMPLE_SCAN_RESULT));
      setMessage("Scanner unavailable; fixture result loaded for UI/core development.");
    } finally {
      setBusy(false);
    }
  }

  function loadFixture() {
    setArtifactJson(formatArtifactJson(SAMPLE_SCAN_RESULT));
    setMessage("Fixture result loaded.");
  }

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setArtifactJson(await file.text());
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
        <button onClick={loadFixture}>
          <Activity size={16} />
          Fixture
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

function evaluateJsonInput(json: string, profile: (typeof DEFAULT_PROFILES)[number]): InputEvaluation {
  try {
    const parsed = JSON.parse(json);
    const scannerResult = isScannerArtifactResult(parsed) ? parsed : null;
    const confidence = scannerResult?.confidence ?? {};

    if (scannerResult) {
      if (!scannerResult.artifact) {
        return {
          kind: "error",
          error: scannerResult.error ?? "No artifact data was returned by the scanner.",
          confidence,
          warnings: []
        };
      }

      return evaluateSingleGoodArtifact(scannerResult.artifact, confidence, profile);
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

function evaluateSingleGoodArtifact(good: GoodArtifact, confidence: ScanConfidence, profile: (typeof DEFAULT_PROFILES)[number]): InputEvaluation {
  const normalized = normalizeGoodArtifact(good);
  if (!normalized.artifact) {
    return {
      kind: "error",
      error: normalized.skipReason ?? "GOOD artifact could not be normalized.",
      confidence,
      warnings: normalized.warnings
    };
  }

  try {
    const artifact = goodArtifactToArtifactInput(normalized.artifact);
    return {
      kind: "single",
      result: evaluateArtifactExact(artifact, profile),
      confidence,
      warnings: normalized.warnings
    };
  } catch (error) {
    return {
      kind: "error",
      error: error instanceof Error ? error.message : "Artifact could not be evaluated.",
      confidence,
      warnings: normalized.warnings
    };
  }
}

function isScannerArtifactResult(value: unknown): value is ScannerArtifactResult {
  return isRecord(value) && value.mode === "visible-artifact" && isRecord(value.capture) && isRecord(value.confidence);
}

function isBatchPayload(value: unknown): boolean {
  return isRecord(value) && (Array.isArray(value.artifacts) || Array.isArray(value.samples)) || Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
