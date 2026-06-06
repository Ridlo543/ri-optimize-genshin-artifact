import { isNormalizedScanRegion, ScanRegion, ScannerArtifactResult } from "@ri-genshin/artifact-schema";

const ROI_KEY = "ri-genshin.roi.region";
const LATEST_RESULT_KEY = "ri-genshin.scanner.latestResult";
const LATEST_RESULT_REVISION_KEY = "ri-genshin.scanner.latestResultRevision";
const LATEST_RESULT_EVENT = "ri-genshin-scanner-result";

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

export function loadLatestScannerResultRevision(): string | null {
  return window.localStorage.getItem(LATEST_RESULT_REVISION_KEY);
}

export function saveLatestScannerResult(result: ScannerArtifactResult): void {
  const revision = createResultRevision(result);
  window.localStorage.setItem(LATEST_RESULT_KEY, JSON.stringify(result));
  window.localStorage.setItem(LATEST_RESULT_REVISION_KEY, revision);
  window.dispatchEvent(new CustomEvent(LATEST_RESULT_EVENT, { detail: revision }));
}

export function subscribeLatestScannerResult(listener: (revision: string | null) => void): () => void {
  const sync = () => listener(loadLatestScannerResultRevision());
  const handleCustom = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    listener(typeof detail === "string" ? detail : loadLatestScannerResultRevision());
  };

  window.addEventListener("storage", sync);
  window.addEventListener(LATEST_RESULT_EVENT, handleCustom);
  return () => {
    window.removeEventListener("storage", sync);
    window.removeEventListener(LATEST_RESULT_EVENT, handleCustom);
  };
}

function createResultRevision(result: ScannerArtifactResult): string {
  const capture = result.capture ?? {};
  return [
    capture.scanId,
    capture.regionHash,
    capture.screenshotHash,
    capture.capturedAt,
    result.mode
  ].filter(Boolean).join("|") || `${Date.now()}`;
}
