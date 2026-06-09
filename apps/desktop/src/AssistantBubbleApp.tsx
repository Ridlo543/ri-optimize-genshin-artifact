import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ScannerArtifactResult } from "@ri-genshin/artifact-schema";
import { AssistantBubbleSurface } from "./AssistantBubbleSurface";
import { buildAssistantSummary } from "./assistantSummary";
import {
  assistantWindowRect,
  assistantWindowRectFromCurrentWindow,
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
  loadLatestScannerResultRevision,
  saveRoiEditingState,
  loadScanRegion,
  saveLatestScannerResult,
  subscribeLatestScannerResult
} from "./roi";
import {
  applyScannerCorrection,
  ArtifactMainStatCorrectionSelection,
  ArtifactSlotCorrectionSelection,
  getArtifactMainStatOptions,
  getInitialScannerCorrections,
  getScannerCorrectionState
} from "./scannerCorrection";
import {
  clearAssistantPlacement,
  loadAssistantPlacement,
  placementFromPhysicalPosition,
  saveAssistantPlacement
} from "./assistantPlacement";
import { loadEvaluationProfile } from "./evaluationProfile";
import { loadScanningState, useSharedScanningState, useSharedWatchState } from "./assistantRuntimeState";

export function AssistantBubbleApp() {
  const startupResultRevisionRef = useRef(loadLatestScannerResultRevision());
  const [result, setResult] = useState<ScannerArtifactResult | null>(null);
  const [region, setRegion] = useState(loadScanRegion);
  const [status, setStatus] = useState<ScannerStatus | null>(null);
  const [watching, setWatching] = useSharedWatchState();
  const [busy, setBusy] = useSharedScanningState();
  const [collapsed, setCollapsed] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState("");
  const [manualLevel, setManualLevel] = useState(0);
  const [manualSlotKey, setManualSlotKey] = useState<ArtifactSlotCorrectionSelection>("");
  const [manualMainStatKey, setManualMainStatKey] = useState<ArtifactMainStatCorrectionSelection>("");
  const [placement, setPlacement] = useState(loadAssistantPlacement);
  const [profile, setProfile] = useState(loadEvaluationProfile);
  const busyRef = useRef(false);
  const pollingRef = useRef(false);
  const lastHashRef = useRef<string | null>(result?.capture.regionHash ?? null);
  const summary = useMemo(() => buildAssistantSummary(result, profile), [profile, result]);
  const correction = useMemo(() => getScannerCorrectionState(result), [result]);
  const roiAttention = shouldHighlightRoi(result);
  const surfaceStyle = useMemo(() => browserAssistantSurfaceStyle(collapsed, detailsOpen), [collapsed, detailsOpen]);
  const statusRef = useRef(status);
  const statusPollingRef = useRef(false);
  const draggingRef = useRef(false);
  const dragSettledTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const initial = getInitialScannerCorrections(result);
    setManualLevel(initial.level);
    setManualSlotKey(initial.slotKey);
    setManualMainStatKey(initial.mainStatKey);
  }, [result]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const storedRegion = loadScanRegion();
      setRegion((current) => (sameRegion(current, storedRegion) ? current : storedRegion));
      const storedProfile = loadEvaluationProfile();
      setProfile((current) => (current.id === storedProfile.id ? current : storedProfile));
    }, 500);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return subscribeLatestScannerResult((revision) => {
      if (!revision || revision === startupResultRevisionRef.current) {
        return;
      }

      const stored = loadLatestScannerResult();
      setResult((current) => (sameResult(current, stored) ? current : stored));
    });
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
      if (statusPollingRef.current) {
        return;
      }
      statusPollingRef.current = true;
      try {
        const next = await scannerStatus();
        if (!ignore) {
          setStatus((current) => (sameStatus(current, next) ? current : next));
        }
      } catch (caught) {
        if (!ignore) {
          setError(caught instanceof Error ? caught.message : "Scanner status unavailable.");
        }
      } finally {
        statusPollingRef.current = false;
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

    void (async () => {
      try {
        const nextRect =
          status?.available || placement
            ? assistantWindowRect(status, region, collapsed, detailsOpen, window.devicePixelRatio, placement)
            : assistantWindowRectFromCurrentWindow(await getAssistantWindowBounds(), collapsed, detailsOpen, window.devicePixelRatio);
        await syncAssistantWindowBounds(nextRect);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to resize assistant.");
      }
    })();
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
    // Block if this window or any other window (main panel) is already scanning.
    if (busyRef.current || loadScanningState()) {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    if (!silent) {
      setError("");
    }

    try {
      await lockRoiEditor().catch(() => undefined);
      const classification = await classifyRegionArtifact(region);
      if (!classification.screenState?.readyForArtifactOcr) {
        lastHashRef.current = classification.capture.regionHash ?? null;
        setResult(classification);
        saveLatestScannerResult(classification);
        setError(classification.screenState?.message ?? classification.error ?? "Adjust scan area.");
        return;
      }

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
      saveRoiEditingState(true);
      await openRoiEditor(status);
      setError("");
    } catch (caught) {
      saveRoiEditingState(false);
      setError(caught instanceof Error ? caught.message : "Unable to open area editor.");
    }
  }

  async function openPanel() {
    try {
      localStorage.setItem("ri-genshin.debug.open-panel-last", new Date().toISOString());
      await recordSmokeEvent("bubble-open-panel-handler");
      await showMainWindow();
      await recordSmokeEvent("bubble-open-panel-native-shown");
    } catch (caught) {
      await recordSmokeEvent("bubble-open-panel-error");
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

  async function toggleCollapsed() {
    if (!collapsed) {
      await recordSmokeEvent("bubble-collapse-handler");
      // Collapsing: shrink content immediately; the useEffect will resize the native window.
      setCollapsed(true);
      return;
    }
    await recordSmokeEvent("bubble-expand-handler");
    // Expanding: pre-resize the native window before React renders expanded content so the
    // content is never clipped inside a still-collapsed window.
    // Only pre-resize when we have a reference point (game detected or manual placement).
    if (isTauri() && !draggingRef.current) {
      try {
        const nextRect =
          status?.available || placement
            ? assistantWindowRect(status, region, false, detailsOpen, window.devicePixelRatio, placement)
            : assistantWindowRectFromCurrentWindow(await getAssistantWindowBounds(), false, detailsOpen, window.devicePixelRatio);
        await syncAssistantWindowBounds(nextRect);
      } catch {
        // Ignore resize errors; still expand the content.
      }
    }
    setCollapsed(false);
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
    if (corrected === result) {
      setError("Choose valid OCR correction values first.");
      return;
    }

    setResult(corrected);
    saveLatestScannerResult(corrected);
    setError("");
  }

  function updateManualSlotKey(slotKey: ArtifactSlotCorrectionSelection) {
    const options = getArtifactMainStatOptions(slotKey);
    setManualSlotKey(slotKey);
    setManualMainStatKey((current) => current && options.includes(current) ? current : "");
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
      roiAttention={roiAttention}
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
              onSlotKeyChange: updateManualSlotKey,
              onMainStatKeyChange: setManualMainStatKey,
              onApply: applyManualCorrection
            }
          : undefined
      }
      onToggleCollapsed={() => void toggleCollapsed()}
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

async function recordSmokeEvent(event: string): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    await invoke("debug_record_event", { event });
  } catch {
    // Ignore smoke-only instrumentation failures.
  }
}

function shouldHighlightRoi(result: ScannerArtifactResult | null): boolean {
  if (!result) {
    return true;
  }
  if (result.screenState?.readyForArtifactOcr === false) {
    return true;
  }
  return result.screenState?.message.startsWith("Review ROI") === true || result.error?.startsWith("Review ROI") === true;
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
