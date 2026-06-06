import { isNormalizedScanRegion, ScanRegion, ScannerArtifactResult } from "@ri-genshin/artifact-schema";

const ROI_KEY = "ri-genshin.roi.region";
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
