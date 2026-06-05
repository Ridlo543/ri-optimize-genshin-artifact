import { isNormalizedScanRegion, ScanRegion, ScannerArtifactResult } from "@ri-genshin/artifact-schema";

export type RoiOpacity = "hidden" | "faint" | "visible";

const ROI_KEY = "ri-genshin.roi.region";
const ROI_EDIT_KEY = "ri-genshin.roi.editing";
const ROI_OPACITY_KEY = "ri-genshin.roi.opacity";
const LATEST_RESULT_KEY = "ri-genshin.scanner.latestResult";

export const DEFAULT_REGION: ScanRegion = {
  x: 0.68,
  y: 0.1,
  width: 0.27,
  height: 0.8,
  unit: "normalized-client"
};

export function loadScanRegion(): ScanRegion {
  try {
    const raw = window.localStorage.getItem(ROI_KEY);
    if (!raw) {
      return DEFAULT_REGION;
    }
    const parsed = JSON.parse(raw);
    return isNormalizedScanRegion(parsed) ? parsed : DEFAULT_REGION;
  } catch {
    return DEFAULT_REGION;
  }
}

export function saveScanRegion(region: ScanRegion): void {
  if (!isNormalizedScanRegion(region)) {
    return;
  }
  window.localStorage.setItem(ROI_KEY, JSON.stringify(region));
}

export function loadRoiEditMode(): boolean {
  return window.localStorage.getItem(ROI_EDIT_KEY) === "true";
}

export function saveRoiEditMode(value: boolean): void {
  window.localStorage.setItem(ROI_EDIT_KEY, value ? "true" : "false");
}

export function loadRoiOpacity(): RoiOpacity {
  const value = window.localStorage.getItem(ROI_OPACITY_KEY);
  return value === "hidden" || value === "faint" || value === "visible" ? value : "faint";
}

export function saveRoiOpacity(value: RoiOpacity): void {
  window.localStorage.setItem(ROI_OPACITY_KEY, value);
}

export function nextRoiOpacity(value: RoiOpacity): RoiOpacity {
  if (value === "faint") {
    return "visible";
  }
  if (value === "visible") {
    return "hidden";
  }
  return "faint";
}

export function loadLatestScannerResult(): ScannerArtifactResult | null {
  try {
    const raw = window.localStorage.getItem(LATEST_RESULT_KEY);
    return raw ? (JSON.parse(raw) as ScannerArtifactResult) : null;
  } catch {
    return null;
  }
}

export function saveLatestScannerResult(result: ScannerArtifactResult): void {
  window.localStorage.setItem(LATEST_RESULT_KEY, JSON.stringify(result));
}
