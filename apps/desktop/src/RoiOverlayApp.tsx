import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
import { ScanRegion } from "@ri-genshin/artifact-schema";
import { scannerStatus, ScannerStatus } from "./scanner";
import { loadRoiEditMode, loadRoiOpacity, loadScanRegion, RoiOpacity, saveRoiEditMode, saveScanRegion } from "./roi";

type DragMode = "move" | "nw" | "ne" | "sw" | "se";

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  startRegion: ScanRegion;
}

const MIN_REGION_SIZE = 0.05;

export function RoiOverlayApp() {
  const [region, setRegion] = useState(loadScanRegion);
  const [editing, setEditing] = useState(loadRoiEditMode);
  const [opacity, setOpacity] = useState<RoiOpacity>(loadRoiOpacity);
  const [status, setStatus] = useState<ScannerStatus | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    saveScanRegion(region);
  }, [region]);

  useEffect(() => {
    let ignore = false;

    async function syncWindow() {
      try {
        const next = await scannerStatus();
        if (ignore) {
          return;
        }
        setStatus(next);

        if (
          next.available &&
          typeof next.screenX === "number" &&
          typeof next.screenY === "number" &&
          typeof next.clientWidth === "number" &&
          typeof next.clientHeight === "number"
        ) {
          const overlay = getCurrentWindow();
          await overlay.setPosition(new LogicalPosition(next.screenX, next.screenY));
          await overlay.setSize(new LogicalSize(next.clientWidth, next.clientHeight));
        }
      } catch {
        if (!ignore) {
          setStatus({ available: false, error: "Waiting for native scanner." });
        }
      }
    }

    void syncWindow();
    const id = window.setInterval(() => void syncWindow(), 1000);
    return () => {
      ignore = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setEditing(loadRoiEditMode());
      setOpacity(loadRoiOpacity());
      const stored = loadScanRegion();
      setRegion((current) => (sameRegion(current, stored) ? current : stored));
    }, 300);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      void getCurrentWindow().setIgnoreCursorEvents(!editing);
    } catch {
      // Browser preview has no native window handle.
    }
  }, [editing]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      const viewportWidth = Math.max(window.innerWidth, 1);
      const viewportHeight = Math.max(window.innerHeight, 1);
      const dx = (event.clientX - drag.startX) / viewportWidth;
      const dy = (event.clientY - drag.startY) / viewportHeight;
      setRegion(clampRegion(applyDrag(drag, dx, dy)));
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function startDrag(mode: DragMode, event: ReactPointerEvent<HTMLElement>) {
    if (!editing) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startRegion: region
    };
  }

  function lockRoi() {
    saveRoiEditMode(false);
    setEditing(false);
  }

  return (
    <div className={`roi-overlay roi-overlay--${editing ? "editing" : "locked"} roi-overlay--${status?.available ? "available" : "unavailable"} roi-overlay--${opacity}`}>
      <div
        className="roi-box"
        style={{
          left: `${region.x * 100}%`,
          top: `${region.y * 100}%`,
          width: `${region.width * 100}%`,
          height: `${region.height * 100}%`
        }}
        onPointerDown={(event) => startDrag("move", event)}
      >
        {editing ? (
          <>
            <span className="roi-handle roi-handle--nw" onPointerDown={(event) => startDrag("nw", event)} />
            <span className="roi-handle roi-handle--ne" onPointerDown={(event) => startDrag("ne", event)} />
            <span className="roi-handle roi-handle--sw" onPointerDown={(event) => startDrag("sw", event)} />
            <span className="roi-handle roi-handle--se" onPointerDown={(event) => startDrag("se", event)} />
          </>
        ) : null}
      </div>

      {editing ? (
        <div className="roi-toolbar">
          <span>{status?.available ? status.resolution : "Waiting for Genshin"}</span>
          <button onClick={lockRoi}>Lock ROI</button>
        </div>
      ) : null}
    </div>
  );
}

function applyDrag(drag: DragState, dx: number, dy: number): ScanRegion {
  const current = drag.startRegion;
  switch (drag.mode) {
    case "move":
      return { ...current, x: current.x + dx, y: current.y + dy };
    case "nw":
      return { ...current, x: current.x + dx, y: current.y + dy, width: current.width - dx, height: current.height - dy };
    case "ne":
      return { ...current, y: current.y + dy, width: current.width + dx, height: current.height - dy };
    case "sw":
      return { ...current, x: current.x + dx, width: current.width - dx, height: current.height + dy };
    case "se":
      return { ...current, width: current.width + dx, height: current.height + dy };
    default:
      return current;
  }
}

function clampRegion(region: ScanRegion): ScanRegion {
  const width = clamp(region.width, MIN_REGION_SIZE, 1);
  const height = clamp(region.height, MIN_REGION_SIZE, 1);
  return {
    unit: "normalized-client",
    width,
    height,
    x: clamp(region.x, 0, 1 - width),
    y: clamp(region.y, 0, 1 - height)
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sameRegion(left: ScanRegion, right: ScanRegion): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height && left.unit === right.unit;
}
