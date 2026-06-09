import { useEffect, useMemo, useRef, useState } from "react";
import { ScannerArtifactResult } from "@ri-genshin/artifact-schema";
import { AssistantBubbleSurface } from "./AssistantBubbleSurface";
import { placeAssistantBubble } from "./assistantBubblePlacement";
import { buildAssistantSummary } from "./assistantSummary";
import {
  createFixtureFallbackResult,
  FIXTURE_PLAYGROUND_ENTRIES,
  FixturePlaygroundEntry,
  getFixturePlaygroundEntry
} from "./fixtureCatalog";
import { RoiEditor } from "./RoiEditor";
import { classifyRegionFixture, parseRegionFixture } from "./scanner";
import { saveLatestScannerResult } from "./roi";
import { useSharedWatchState } from "./assistantRuntimeState";
import { COLLAPSED_ASSISTANT_SIZE, EXPANDED_ASSISTANT_DETAILS_SIZE, EXPANDED_ASSISTANT_SIZE } from "./nativeWindows";

export function FixturePlaygroundApp() {
  const initialFixture = getFixturePlaygroundEntry(new URLSearchParams(window.location.search).get("fixture"));
  const [fixture, setFixture] = useState<FixturePlaygroundEntry>(initialFixture);
  const [region, setRegion] = useState(initialFixture.region);
  const [editing, setEditing] = useState(true);
  const [result, setResult] = useState<ScannerArtifactResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [watching, setWatching] = useSharedWatchState();
  const [collapsed, setCollapsed] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [message, setMessage] = useState("Fixture loaded. Click the bubble, adjust area, then Analyze.");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const lastHashRef = useRef<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 1920, height: 1200 });
  const summary = useMemo(() => buildAssistantSummary(result), [result]);
  const bubbleSize = collapsed ? COLLAPSED_ASSISTANT_SIZE : detailsOpen ? EXPANDED_ASSISTANT_DETAILS_SIZE : EXPANDED_ASSISTANT_SIZE;
  const bubblePlacement = placeAssistantBubble(region, stageSize, bubbleSize);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) {
      return undefined;
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
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
    const id = window.setInterval(tick, 1000);
    return () => {
      ignore = true;
      window.clearInterval(id);
    };
  }, [watching, fixture, region]);

  function selectFixture(value: string) {
    const next = getFixturePlaygroundEntry(value);
    setFixture(next);
    setRegion(next.region);
    setResult(null);
    setEditing(true);
    setCollapsed(true);
    setDetailsOpen(false);
    setMessage("Fixture loaded. No analysis has run yet.");
    lastHashRef.current = null;
    window.history.replaceState(null, "", `?window=fixture-playground&fixture=${next.key}`);
  }

  async function analyze() {
    if (busy) {
      return;
    }

    setBusy(true);
    setMessage("Running fixture analysis...");
    try {
      const scan = await parseRegionFixture(fixture.fileName, region);
      setResult(scan);
      saveLatestScannerResult(scan);
      lastHashRef.current = scan.capture.regionHash ?? null;
      setMessage(scan.error ?? "Native fixture OCR complete.");
    } catch {
      const fallback = createFixtureFallbackResult(fixture, region);
      setResult(fallback);
      saveLatestScannerResult(fallback);
      lastHashRef.current = fallback.capture.regionHash ?? null;
      setMessage("Browser preview fallback result loaded. Native Tauri uses scanner OCR.");
    } finally {
      setBusy(false);
    }
  }

  async function watchTick() {
    try {
      const classification = await classifyRegionFixture(fixture.fileName, region);
      const hash = classification.capture.regionHash;
      if (!classification.screenState?.readyForArtifactOcr) {
        setResult(classification);
        setMessage(classification.screenState?.message ?? "Adjust scan area.");
        return;
      }
      if (hash && hash === lastHashRef.current) {
        return;
      }
      lastHashRef.current = hash ?? null;
      await analyze();
    } catch {
      setMessage("Watch fixture mode needs native Tauri scanner IPC.");
    }
  }

  return (
    <main className="fixture-playground">
      <div className="fixture-playground__controls">
        <select value={fixture.key} onChange={(event) => selectFixture(event.target.value)}>
          {FIXTURE_PLAYGROUND_ENTRIES.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}
            </option>
          ))}
        </select>
        <button onClick={() => setEditing((value) => !value)}>{editing ? "Lock ROI" : "Edit ROI"}</button>
        <button onClick={() => setRegion(fixture.region)}>Reset ROI</button>
        <span>{message}</span>
      </div>

      <section ref={stageRef} className={`fixture-stage roi-overlay--visible ${editing ? "roi-overlay--editing" : "roi-overlay--locked"}`}>
        <img className="fixture-stage__image" src={fixture.imageUrl} alt={fixture.label} />
        <RoiEditor region={region} editing={editing} onRegionChange={setRegion} boundsRef={stageRef} />
        <AssistantBubbleSurface
          summary={summary}
          collapsed={collapsed}
          busy={busy}
          watching={watching}
          detailsOpen={detailsOpen}
          hash={result?.capture.regionHash ?? ""}
          style={{
            position: "absolute",
            left: `${bubblePlacement.left}px`,
            top: `${bubblePlacement.top}px`,
            width: `${bubbleSize.width}px`,
            height: `${bubbleSize.height}px`
          }}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          onScan={() => void analyze()}
          onToggleWatch={() => setWatching((value) => !value)}
          onEditRoi={() => setEditing(true)}
          onToggleDetails={() => setDetailsOpen((value) => !value)}
        />
      </section>
    </main>
  );
}
