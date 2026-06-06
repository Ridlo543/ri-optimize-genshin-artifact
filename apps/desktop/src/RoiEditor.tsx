import { PointerEvent as ReactPointerEvent, RefObject, useEffect, useRef } from "react";
import { ScanRegion } from "@ri-genshin/artifact-schema";

export type RoiDragMode = "move" | "nw" | "ne" | "sw" | "se";

interface DragState {
  mode: RoiDragMode;
  startX: number;
  startY: number;
  startRegion: ScanRegion;
}

export interface RoiEditorProps {
  region: ScanRegion;
  editing: boolean;
  onRegionChange?: (region: ScanRegion) => void;
  boundsRef?: RefObject<HTMLElement | null>;
}

const MIN_REGION_SIZE = 0.05;

export function RoiEditor({ region, editing, onRegionChange, boundsRef }: RoiEditorProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !onRegionChange) {
        return;
      }

      const bounds = boundsRef?.current?.getBoundingClientRect() ?? boxRef.current?.parentElement?.getBoundingClientRect();
      const viewportWidth = Math.max(bounds?.width ?? window.innerWidth, 1);
      const viewportHeight = Math.max(bounds?.height ?? window.innerHeight, 1);
      const dx = (event.clientX - drag.startX) / viewportWidth;
      const dy = (event.clientY - drag.startY) / viewportHeight;
      onRegionChange(resizeRegion(drag.startRegion, drag.mode, dx, dy));
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
  }, [boundsRef, onRegionChange]);

  function startDrag(mode: RoiDragMode, event: ReactPointerEvent<HTMLElement>) {
    if (!editing || !onRegionChange) {
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

  return (
    <div
      ref={boxRef}
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
  );
}

export function clampRegion(region: ScanRegion): ScanRegion {
  const width = roundCoordinate(clamp(region.width, MIN_REGION_SIZE, 1));
  const height = roundCoordinate(clamp(region.height, MIN_REGION_SIZE, 1));
  return {
    unit: "normalized-client",
    width,
    height,
    x: roundCoordinate(clamp(region.x, 0, 1 - width)),
    y: roundCoordinate(clamp(region.y, 0, 1 - height))
  };
}

export function resizeRegion(current: ScanRegion, mode: RoiDragMode, dx: number, dy: number): ScanRegion {
  let next: ScanRegion;
  switch (mode) {
    case "move":
      next = { ...current, x: current.x + dx, y: current.y + dy };
      break;
    case "nw":
      next = { ...current, x: current.x + dx, y: current.y + dy, width: current.width - dx, height: current.height - dy };
      break;
    case "ne":
      next = { ...current, y: current.y + dy, width: current.width + dx, height: current.height - dy };
      break;
    case "sw":
      next = { ...current, x: current.x + dx, width: current.width - dx, height: current.height + dy };
      break;
    case "se":
      next = { ...current, width: current.width + dx, height: current.height + dy };
      break;
    default:
      next = current;
  }
  return clampRegion(next);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
