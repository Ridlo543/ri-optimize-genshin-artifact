import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ScannerArtifactResult } from "@ri-genshin/artifact-schema";
import { AssistantBubbleSurface } from "./AssistantBubbleSurface";
import { buildAssistantSummary } from "./assistantSummary";
import {
  assistantWindowRect,
  COLLAPSED_ASSISTANT_SIZE,
  EXPANDED_ASSISTANT_DETAILS_SIZE,
  EXPANDED_ASSISTANT_SIZE,
  getAssistantWindowBounds,
  lockRoiEditor,
  openRoiEditor,
  quitApp,
  showMainWindow,
  startAssistantDrag,
  syncAssistantWindowBounds
} from "./nativeWindows";
import { classifyRegionArtifact, scanRegionArtifact, scannerStatus, ScannerStatus } from "./scanner";
import {
  loadLatestScannerResult,
  loadScanRegion,
  saveLatestScannerResult
} from "./roi";
import {
  applyScannerCorrection,
  ArtifactMainStatCorrection,
  ArtifactSlotCorrection,
  getScannerCorrectionState
} from "./scannerCorrection";
import {
  clearAssistantPlacement,
  loadAssistantPlacement,
  placementFromPhysicalPosition,
  saveAssistantPlacement
} from "./assistantPlacement";
import { loadEvaluationProfile } from "./evaluationProfile";
import { useSharedWatchState } from "./assistantRuntimeState";

export function AssistantBubbleApp() {
  const [result, setResult] = useState<ScannerArtifactResult | null>(loadLatestScannerResult);
  const [region, setRegion] = useState(loadScanRegion);
  const [status, setStatus] = useState<ScannerStatus | null>(null);
  const [watching, setWatching] = useSharedWatchState();
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState("");
  const [manualLevel, setManualLevel] = useState(0);
  const [manualSlotKey, setManualSlotKey] = useState<ArtifactSlotCorrection>("flower");
  const [manualMainStatKey, setManualMainStatKey] = useState<ArtifactMainStatCorrection>("hp");
  const [placement, setPlacement] = useState(loadAssistantPlacement);
  const [profile, setProfile] = useState(loadEvaluationProfile);
  const busyRef = useRef(false);
  const pollingRef = useRef(false);
  const lastHashRef = useRef<string | null>(result?.capture.regionHash ?? null);
  const summary = useMemo(() => buildAssistantSummary(result, profile), [profile, result]);
  const correction = useMemo(() => getScannerCorrectionState(result), [result]);
  const surfaceStyle = useMemo(() => browserAssistantSurfaceStyle(collapsed, detailsOpen), [collapsed, detailsOpen]);
  const statusRef = useRef(status);
  const draggingRef = useRef(false);
  const dragSettledTimerRef = useRef<number | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const storedRegion = loadScanRegion();
      setRegion((current) => (sameRegion(current, storedRegion) ? current : storedRegion));
      const stored = loadLatestScannerResult();
      setResult((current) => (sameResult(current, stored) ? current : stored));
      const storedProfile = loadEvaluationProfile();
      setProfile((current) => (current.id === storedProfile.id ? current : storedProfile));
    }, 500);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      return undefined;
    }

    let unlisten: (() => void) | undefined;
    void getCurrentWindow()
      .onMoved(() => {
        if (!draggingRef.current) {
          return;
        }
        schedulePersistAssistantPosition();
      })
      .then((dispose) => {
        unlisten = dispose;
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to track assistant position."));

    return () => {
      unlisten?.();
      clearDragSettledTimer();
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      return undefined;
    }

    let ignore = false;
    async function refreshStatus() {
      try {
        const next = await scannerStatus();
        if (!ignore) {
          setStatus((current) => (sameStatus(current, next) ? current : next));
        }
      } catch (caught) {
        if (!ignore) {
          setError(caught instanceof Error ? caught.message : "Scanner status unavailable.");
        }
      }
    }

    void refreshStatus();
    const id = window.setInterval(() => void refreshStatus(), 1500);
    return () => {
      ignore = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }
    if (draggingRef.current) {
      return;
    }

    void syncAssistantWindowBounds(assistantWindowRect(status, region, collapsed, detailsOpen, window.devicePixelRatio, placement)).catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Unable to resize assistant.");
    });
  }, [collapsed, detailsOpen, placement, region, status]);

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
      await lockRoiEditor().catch(() => undefined);
      const scan = await scanRegionArtifact(region, { occlusionAvoided: true });
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

  async function editRoi() {
    try {
      const next = status?.available ? status : await scannerStatus();
      setStatus(next);
      await openRoiEditor(next);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open ROI editor.");
    }
  }

  async function openPanel() {
    try {
      await showMainWindow();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Main panel unavailable");
    }
  }

  async function dragBubble() {
    if (draggingRef.current) {
      return;
    }
    try {
      draggingRef.current = true;
      clearDragSettledTimer();
      await startAssistantDrag();
      window.setTimeout(() => {
        if (draggingRef.current) {
          void persistAssistantPositionAfterDrag();
        }
      }, 900);
    } catch (caught) {
      draggingRef.current = false;
      setError(caught instanceof Error ? caught.message : "Unable to move assistant.");
    }
  }

  function schedulePersistAssistantPosition() {
    clearDragSettledTimer();
    dragSettledTimerRef.current = window.setTimeout(() => {
      void persistAssistantPositionAfterDrag();
    }, 180);
  }

  function clearDragSettledTimer() {
    if (dragSettledTimerRef.current !== null) {
      window.clearTimeout(dragSettledTimerRef.current);
      dragSettledTimerRef.current = null;
    }
  }

  async function persistAssistantPositionAfterDrag() {
    clearDragSettledTimer();
    const currentStatus = statusRef.current;
    if (!currentStatus?.available) {
      draggingRef.current = false;
      return;
    }

    try {
      const bounds = await getAssistantWindowBounds();
      const next = placementFromPhysicalPosition(bounds, currentStatus);
      if (next) {
        saveAssistantPlacement(next);
        setPlacement(next);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save assistant position.");
    } finally {
      draggingRef.current = false;
    }
  }

  async function handleQuit() {
    try {
      await quitApp();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to quit app.");
    }
  }

  function resetPosition() {
    clearAssistantPlacement();
    setPlacement(null);
  }

  function applyManualCorrection() {
    if (!result || !correction.available) {
      return;
    }

    const corrected = applyScannerCorrection(result, {
      level: manualLevel,
      slotKey: manualSlotKey,
      mainStatKey: manualMainStatKey
    });
    setResult(corrected);
    saveLatestScannerResult(corrected);
    setError("");
  }

  return (
    <AssistantBubbleSurface
      summary={summary}
      collapsed={collapsed}
      busy={busy}
      watching={watching}
      detailsOpen={detailsOpen}
      error={error}
      hash={result?.capture.regionHash ?? ""}
      style={surfaceStyle}
      levelCorrection={
        correction.available
          ? {
              available: true,
              level: manualLevel,
              slotKey: manualSlotKey,
              mainStatKey: manualMainStatKey,
              reason: correction.reason,
              needsLevel: correction.needsLevel,
              needsSlotKey: correction.needsSlotKey,
              needsMainStatKey: correction.needsMainStatKey,
              onLevelChange: setManualLevel,
              onSlotKeyChange: setManualSlotKey,
              onMainStatKeyChange: setManualMainStatKey,
              onApply: applyManualCorrection
            }
          : undefined
      }
      onToggleCollapsed={() => setCollapsed((value) => !value)}
      onScan={() => void scanNow()}
      onToggleWatch={() => setWatching((value) => !value)}
      onEditRoi={() => void editRoi()}
      onToggleDetails={() => setDetailsOpen((value) => !value)}
      onOpenPanel={() => void openPanel()}
      onMove={() => void dragBubble()}
      onResetPosition={resetPosition}
      onQuit={() => void handleQuit()}
    />
  );
}

function browserAssistantSurfaceStyle(collapsed: boolean, detailsOpen: boolean): CSSProperties | undefined {
  if (isTauri()) {
    return undefined;
  }

  const size = collapsed ? COLLAPSED_ASSISTANT_SIZE : detailsOpen ? EXPANDED_ASSISTANT_DETAILS_SIZE : EXPANDED_ASSISTANT_SIZE;
  return {
    width: `min(${size.width}px, 100vw)`,
    height: `min(${size.height}px, 100vh)`
  };
}

function sameResult(left: ScannerArtifactResult | null, right: ScannerArtifactResult | null): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameRegion(left: ReturnType<typeof loadScanRegion>, right: ReturnType<typeof loadScanRegion>): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height && left.unit === right.unit;
}

function sameStatus(left: ScannerStatus | null, right: ScannerStatus): boolean {
  return (
    left?.available === right.available &&
    left?.screenX === right.screenX &&
    left?.screenY === right.screenY &&
    left?.clientWidth === right.clientWidth &&
    left?.clientHeight === right.clientHeight &&
    left?.error === right.error
  );
}
