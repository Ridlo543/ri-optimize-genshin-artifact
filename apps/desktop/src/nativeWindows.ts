import { invoke } from "@tauri-apps/api/core";
import { availableMonitors, currentMonitor } from "@tauri-apps/api/window";
import { ScanRegion } from "@ri-genshin/artifact-schema";
import { placeAssistantBubble } from "./assistantBubblePlacement";
import { ScannerStatus } from "./scanner";
import { AssistantPlacement, rectFromAssistantPlacement } from "./assistantPlacement";

export interface PhysicalWindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const COLLAPSED_ASSISTANT_SIZE = { width: 72, height: 72 };
export const EXPANDED_ASSISTANT_SIZE = { width: 360, height: 285 };
export const EXPANDED_ASSISTANT_DETAILS_SIZE = { width: 360, height: 405 };

export function scannerStatusRect(status: ScannerStatus): PhysicalWindowRect | null {
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

export function assistantWindowRect(
  status: ScannerStatus | null,
  region: ScanRegion,
  collapsed: boolean,
  detailsOpen: boolean,
  dpiScale = 1,
  manualPlacement: AssistantPlacement | null = null
): PhysicalWindowRect {
  const scale = normalizeDpiScale(dpiScale);
  const preferredSize = scaleSize(collapsed ? COLLAPSED_ASSISTANT_SIZE : detailsOpen ? EXPANDED_ASSISTANT_DETAILS_SIZE : EXPANDED_ASSISTANT_SIZE, scale);
  const client = status ? scannerStatusRect(status) : null;
  if (!client) {
    return { x: 32, y: 72, ...preferredSize };
  }

  const size = {
    width: Math.min(preferredSize.width, client.width),
    height: Math.min(preferredSize.height, client.height)
  };
  if (manualPlacement) {
    return rectFromAssistantPlacement(manualPlacement, client, size);
  }
  const placement = placeAssistantBubble(region, { width: client.width, height: client.height }, size);
  return {
    x: Math.round(client.x + placement.left),
    y: Math.round(client.y + placement.top),
    width: size.width,
    height: size.height
  };
}

export function assistantWindowRectFromCurrentWindow(
  current: Pick<PhysicalWindowRect, "x" | "y">,
  collapsed: boolean,
  detailsOpen: boolean,
  dpiScale = 1
): PhysicalWindowRect {
  const scale = normalizeDpiScale(dpiScale);
  const size = scaleSize(collapsed ? COLLAPSED_ASSISTANT_SIZE : detailsOpen ? EXPANDED_ASSISTANT_DETAILS_SIZE : EXPANDED_ASSISTANT_SIZE, scale);
  return {
    x: Math.round(current.x),
    y: Math.round(current.y),
    width: size.width,
    height: size.height
  };
}

function normalizeDpiScale(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.min(3, Math.max(1, value));
}

function scaleSize(size: { width: number; height: number }, scale: number): { width: number; height: number } {
  return {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale)
  };
}

export async function openRoiEditor(status?: ScannerStatus | null): Promise<void> {
  const rect = await resolveOverlayRect(status);
  await invoke("set_roi_overlay_bounds", { rect });
  await invoke("set_roi_edit_mode", { editing: true });
}

export async function lockRoiEditor(): Promise<void> {
  await invoke("set_roi_edit_mode", { editing: false });
}

export async function syncRoiOverlayBounds(status?: ScannerStatus | null): Promise<void> {
  const rect = await resolveOverlayRect(status);
  await invoke("set_roi_overlay_bounds", { rect });
}

export async function syncAssistantWindowBounds(rect: PhysicalWindowRect): Promise<void> {
  await invoke("set_assistant_window_bounds", { rect });
}

export async function getAssistantWindowBounds(): Promise<PhysicalWindowRect> {
  return await invoke<PhysicalWindowRect>("get_assistant_window_bounds");
}

export async function startAssistantDrag(): Promise<void> {
  await invoke("start_assistant_drag");
}

export async function showMainWindow(): Promise<void> {
  await invoke("show_main_window");
}

export async function enableMainInput(): Promise<void> {
  await invoke("enable_main_input");
}

export async function quitApp(): Promise<void> {
  await invoke("quit_app");
}

async function resolveOverlayRect(status?: ScannerStatus | null): Promise<PhysicalWindowRect> {
  const scannerRect = status ? scannerStatusRect(status) : null;
  if (scannerRect) {
    return scannerRect;
  }

  const monitorRect = await resolveMonitorRect();
  if (monitorRect) {
    return monitorRect;
  }

  return {
    x: Math.round(window.screenX || 0),
    y: Math.round(window.screenY || 0),
    width: Math.max(1, Math.round(window.innerWidth || 1280)),
    height: Math.max(1, Math.round(window.innerHeight || 720))
  };
}

async function resolveMonitorRect(): Promise<PhysicalWindowRect | null> {
  try {
    const monitor = await currentMonitor();
    const rect = monitor ? monitorRect(monitor) : null;
    if (rect) {
      return rect;
    }
  } catch {
    // Fall through to available monitors and browser viewport fallback.
  }

  try {
    const monitors = await availableMonitors();
    for (const monitor of monitors) {
      const rect = monitorRect(monitor);
      if (rect) {
        return rect;
      }
    }
  } catch {
    // Fall through to browser viewport fallback.
  }

  return null;
}

function monitorRect(monitor: unknown): PhysicalWindowRect | null {
  if (!isRecord(monitor) || !isRecord(monitor.position) || !isRecord(monitor.size)) {
    return null;
  }

  const x = numberOrNull(monitor.position.x);
  const y = numberOrNull(monitor.position.y);
  const width = numberOrNull(monitor.size.width);
  const height = numberOrNull(monitor.size.height);
  if (x === null || y === null || width === null || height === null) {
    return null;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
