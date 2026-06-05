import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Eye, Maximize2, Move, ScanLine, SlidersHorizontal, Square } from "lucide-react";
import { ScannerArtifactResult } from "@ri-genshin/artifact-schema";
import { buildAssistantSummary } from "./assistantSummary";
import { classifyRegionArtifact, scanRegionArtifact } from "./scanner";
import {
  loadLatestScannerResult,
  loadRoiOpacity,
  loadScanRegion,
  nextRoiOpacity,
  RoiOpacity,
  saveLatestScannerResult,
  saveRoiEditMode,
  saveRoiOpacity
} from "./roi";

export function AssistantBubbleApp() {
  const [result, setResult] = useState<ScannerArtifactResult | null>(loadLatestScannerResult);
  const [region, setRegion] = useState(loadScanRegion);
  const [opacity, setOpacity] = useState<RoiOpacity>(loadRoiOpacity);
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const pollingRef = useRef(false);
  const lastHashRef = useRef<string | null>(result?.capture.regionHash ?? null);
  const summary = useMemo(() => buildAssistantSummary(result), [result]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const storedRegion = loadScanRegion();
      setRegion((current) => (sameRegion(current, storedRegion) ? current : storedRegion));
      setOpacity(loadRoiOpacity());
      const stored = loadLatestScannerResult();
      setResult((current) => (sameResult(current, stored) ? current : stored));
    }, 500);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!watching) {
      return undefined;
    }

    let ignore = false;
    const tick = () => {
      if (!ignore) {
        void watchTick();
      }
    };

    tick();
    const id = window.setInterval(tick, 900);
    return () => {
      ignore = true;
      window.clearInterval(id);
    };
  }, [watching, region]);

  async function scanNow(silent = false) {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    if (!silent) {
      setError("");
    }

    try {
      const scan = await scanRegionArtifact(region);
      lastHashRef.current = scan.capture.regionHash ?? null;
      setResult(scan);
      saveLatestScannerResult(scan);
      setError("");
    } catch {
      setError("Scanner unavailable");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function watchTick() {
    if (pollingRef.current || busyRef.current) {
      return;
    }

    pollingRef.current = true;
    try {
      const classification = await classifyRegionArtifact(region);
      const hash = classification.capture.regionHash;
      if (!classification.screenState?.readyForArtifactOcr) {
        lastHashRef.current = hash ?? null;
        setResult(classification);
        saveLatestScannerResult(classification);
        return;
      }
      if (hash && hash === lastHashRef.current) {
        return;
      }

      lastHashRef.current = hash ?? null;
      await scanNow(true);
    } catch {
      setError("Watch needs native scanner");
    } finally {
      pollingRef.current = false;
    }
  }

  function editRoi() {
    saveRoiEditMode(true);
    saveRoiOpacity("visible");
    setOpacity("visible");
  }

  function cycleOpacity() {
    const next = nextRoiOpacity(opacity);
    saveRoiOpacity(next);
    setOpacity(next);
  }

  async function openPanel() {
    try {
      await invoke("show_main_window");
    } catch {
      setError("Main panel unavailable");
    }
  }

  async function dragBubble() {
    try {
      await getCurrentWindow().startDragging();
    } catch {
      // Browser preview has no native window handle.
    }
  }

  return (
    <main className={`assistant-bubble assistant-bubble--${summary.state}`}>
      <header className="assistant-bubble__header">
        <button className="icon-button" title="Move" onPointerDown={() => void dragBubble()}>
          <Move size={15} />
        </button>
        <div>
          <b>{summary.title}</b>
          <span>{error || summary.detail}</span>
        </div>
      </header>

      {summary.metrics.length > 0 ? (
        <div className="assistant-metrics">
          {summary.metrics.map((metric) => (
            <div key={metric.label}>
              <span>{metric.label}</span>
              <b>{metric.value}</b>
            </div>
          ))}
        </div>
      ) : null}

      <footer className="assistant-actions">
        <button className="primary" onClick={() => void scanNow()} disabled={busy}>
          <ScanLine size={15} />
          {busy ? "OCR" : "Scan"}
        </button>
        <button onClick={() => setWatching((value) => !value)}>
          {watching ? <Square size={15} /> : <Eye size={15} />}
          {watching ? "Stop" : "Watch"}
        </button>
        <button onClick={editRoi}>
          <SlidersHorizontal size={15} />
          ROI
        </button>
        <button onClick={cycleOpacity}>{opacity}</button>
        <button className="icon-button" title="Open Panel" onClick={() => void openPanel()}>
          <Maximize2 size={15} />
        </button>
      </footer>

      <div className="assistant-footnote">
        <span>Conf {summary.confidence}</span>
        <span>{result?.capture.regionHash ? result.capture.regionHash.slice(0, 8) : "no hash"}</span>
      </div>
    </main>
  );
}

function sameResult(left: ScannerArtifactResult | null, right: ScannerArtifactResult | null): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameRegion(left: ReturnType<typeof loadScanRegion>, right: ReturnType<typeof loadScanRegion>): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height && left.unit === right.unit;
}
