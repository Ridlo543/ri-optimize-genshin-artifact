import { useEffect, useMemo, useState } from "react";
import { Activity, Eye, Pin, ScanLine, Square, Zap } from "lucide-react";
import { goodArtifactToArtifactInput, ScannerArtifactResult } from "@ri-genshin/artifact-schema";
import { DEFAULT_PROFILES, evaluateArtifactExact } from "@ri-genshin/probability-core";
import { SAMPLE_SCAN_RESULT } from "./sample";
import { scanVisibleArtifact, scannerStatus, ScannerStatus } from "./scanner";

const confidenceKeys = ["setKey", "slotKey", "mainStatKey", "substats"] as const;

export function App() {
  const [status, setStatus] = useState<ScannerStatus | null>(null);
  const [scanResult, setScanResult] = useState<ScannerArtifactResult>(SAMPLE_SCAN_RESULT);
  const [artifactJson, setArtifactJson] = useState(formatArtifactJson(SAMPLE_SCAN_RESULT));
  const [profileId, setProfileId] = useState(DEFAULT_PROFILES[0].id);
  const [busy, setBusy] = useState(false);
  const [watching, setWatching] = useState(false);
  const [message, setMessage] = useState("Fixture loaded. Press scan when Genshin artifact detail is visible.");

  const profile = DEFAULT_PROFILES.find((item) => item.id === profileId) ?? DEFAULT_PROFILES[0];

  const evaluation = useMemo(() => {
    try {
      const parsed = JSON.parse(artifactJson) as ScannerArtifactResult;
      if (!parsed.artifact) {
        return { error: parsed.error ?? "No artifact data was returned by the scanner." };
      }
      const artifact = goodArtifactToArtifactInput(parsed.artifact);
      return { result: evaluateArtifactExact(artifact, profile), artifact };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to parse artifact JSON." };
    }
  }, [artifactJson, profile]);

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
      setScanResult(result);
      setArtifactJson(formatArtifactJson(result));
      setMessage(result.artifact ? "Scan complete." : result.error ?? "Scanner returned no artifact.");
    } catch {
      setScanResult(SAMPLE_SCAN_RESULT);
      setArtifactJson(formatArtifactJson(SAMPLE_SCAN_RESULT));
      setMessage("Scanner unavailable; fixture result loaded for UI/core development.");
    } finally {
      setBusy(false);
    }
  }

  function loadFixture() {
    setScanResult(SAMPLE_SCAN_RESULT);
    setArtifactJson(formatArtifactJson(SAMPLE_SCAN_RESULT));
    setMessage("Fixture result loaded.");
  }

  const confidenceLow = confidenceKeys.some((key) => (scanResult.confidence[key] ?? 1) < 0.85);

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
        <button onClick={() => void refreshStatus()} title="Refresh scanner status">
          <Pin size={16} />
        </button>
      </section>

      <p className="message">{message}</p>

      <section className="grid">
        <article className="panel result-panel">
          <div className="panel__header">
            <span>Decision</span>
            {confidenceLow ? <small className="warn">review OCR</small> : <small>confidence ok</small>}
          </div>
          {evaluation.result ? (
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
          ) : (
            <p className="error">{evaluation.error}</p>
          )}
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
                <meter min={0} max={1} value={scanResult.confidence[key] ?? 0} />
                <b>{formatPercent(scanResult.confidence[key] ?? 0)}</b>
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
