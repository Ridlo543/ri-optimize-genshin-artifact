import { ScannerStatus } from "./scanner";

interface PhysicalWindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STORAGE_KEY = "ri-genshin.assistant.placement.v1";

export interface AssistantPlacement {
  x: number;
  y: number;
  unit: "normalized-client";
}

export function loadAssistantPlacement(): AssistantPlacement | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    return isAssistantPlacement(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveAssistantPlacement(placement: AssistantPlacement): void {
  if (isAssistantPlacement(placement)) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(placement));
  }
}

export function clearAssistantPlacement(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function placementFromPhysicalPosition(
  position: { x: number; y: number },
  status: ScannerStatus
): AssistantPlacement | null {
  const client = clientRect(status);
  if (!client) {
    return null;
  }
  return {
    x: clamp01((position.x - client.x) / client.width),
    y: clamp01((position.y - client.y) / client.height),
    unit: "normalized-client"
  };
}

function clientRect(status: ScannerStatus): PhysicalWindowRect | null {
  if (
    !status.available ||
    typeof status.screenX !== "number" ||
    typeof status.screenY !== "number" ||
    typeof status.clientWidth !== "number" ||
    typeof status.clientHeight !== "number"
  ) {
    return null;
  }
  return {
    x: Math.round(status.screenX),
    y: Math.round(status.screenY),
    width: Math.max(1, Math.round(status.clientWidth)),
    height: Math.max(1, Math.round(status.clientHeight))
  };
}

export function rectFromAssistantPlacement(
  placement: AssistantPlacement,
  client: PhysicalWindowRect,
  size: { width: number; height: number }
): PhysicalWindowRect {
  const maxX = client.x + Math.max(0, client.width - size.width);
  const maxY = client.y + Math.max(0, client.height - size.height);
  return {
    x: clamp(Math.round(client.x + placement.x * client.width), client.x, maxX),
    y: clamp(Math.round(client.y + placement.y * client.height), client.y, maxY),
    width: size.width,
    height: size.height
  };
}

function isAssistantPlacement(value: unknown): value is AssistantPlacement {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const placement = value as Partial<AssistantPlacement>;
  return (
    placement.unit === "normalized-client" &&
    typeof placement.x === "number" &&
    typeof placement.y === "number" &&
    placement.x >= 0 &&
    placement.x <= 1 &&
    placement.y >= 0 &&
    placement.y <= 1
  );
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
