import { invoke } from "@tauri-apps/api/core";
import { DetectArtifactRegionResult, ScanRegion, ScannerArtifactResult } from "@ri-genshin/artifact-schema";

const SCANNER_TIMEOUT_MS = 45_000;
const SCANNER_STATUS_TIMEOUT_MS = 5_000;

export interface ScannerStatus {
  available: boolean;
  processName?: string;
  windowTitle?: string;
  resolution?: string;
  clientWidth?: number;
  clientHeight?: number;
  screenX?: number;
  screenY?: number;
  error?: string;
}

export async function scannerStatus(): Promise<ScannerStatus> {
  const raw = await invokeScanner("scanner_status", "Checking scanner status timed out.", undefined, SCANNER_STATUS_TIMEOUT_MS);
  return JSON.parse(raw) as ScannerStatus;
}

export async function scanVisibleArtifact(): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_scan_visible_artifact", "Visible artifact scan timed out.");
  return parseScannerArtifactResult(raw);
}

export async function scanRegionArtifact(region: ScanRegion, options: { occlusionAvoided?: boolean } = {}): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_scan_region_artifact", "Scan timed out. Try Analyze again after confirming the scan area covers only the artifact panel.", {
    regionJson: JSON.stringify(region),
    occlusionAvoided: options.occlusionAvoided ?? false
  });
  return parseScannerArtifactResult(raw);
}

export async function classifyVisibleScreen(): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_classify_visible_screen", "Screen classification timed out.");
  return parseScannerArtifactResult(raw);
}

export async function classifyRegionArtifact(region: ScanRegion): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_classify_region_artifact", "ROI classification timed out.", { regionJson: JSON.stringify(region) });
  return parseScannerArtifactResult(raw);
}

export async function ocrSubstats(imagePath: string): Promise<unknown> {
  const raw = await invokeScanner("scanner_ocr_substats", "Substat OCR timed out.", { imagePath });
  return JSON.parse(raw) as unknown;
}

export async function parseFixtureArtifact(fixtureFolder: string): Promise<unknown> {
  const raw = await invokeScanner("scanner_parse_fixture_artifact", "Fixture artifact OCR timed out.", { fixtureFolder });
  return JSON.parse(raw) as unknown;
}

export async function parseFixtureCard(fixtureFolder: string): Promise<unknown> {
  const raw = await invokeScanner("scanner_parse_fixture_card", "Fixture card OCR timed out.", { fixtureFolder });
  return JSON.parse(raw) as unknown;
}

export async function parseScreenshotArtifact(imagePath: string): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_parse_screenshot_artifact", "Screenshot OCR timed out.", { imagePath });
  return parseScannerArtifactResult(raw);
}

export async function parseScreenshotFixture(fixtureName: string): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_parse_screenshot_fixture", "Screenshot fixture OCR timed out.", { fixtureName });
  return parseScannerArtifactResult(raw);
}

export async function parseRegionFixture(fixtureName: string, region: ScanRegion): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_parse_region_fixture", "Region fixture OCR timed out.", { fixtureName, regionJson: JSON.stringify(region) });
  return parseScannerArtifactResult(raw);
}

export async function classifyRegionFixture(fixtureName: string, region: ScanRegion): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_classify_region_fixture", "Region fixture classification timed out.", { fixtureName, regionJson: JSON.stringify(region) });
  return parseScannerArtifactResult(raw);
}

export async function classifyScreenshotArtifact(imagePath: string): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_classify_screenshot_artifact", "Screenshot classification timed out.", { imagePath });
  return parseScannerArtifactResult(raw);
}

export async function classifyScreenshotFixture(fixtureName: string): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_classify_screenshot_fixture", "Screenshot fixture classification timed out.", { fixtureName });
  return parseScannerArtifactResult(raw);
}

export async function detectArtifactRegion(): Promise<DetectArtifactRegionResult> {
  const raw = await invokeScanner("scanner_detect_artifact_region", "Region detection timed out.");
  const parsed = JSON.parse(raw);
  if (typeof parsed === "object" && parsed !== null && "error" in parsed && !("screenState" in parsed)) {
    throw new Error((parsed as Record<string, unknown>).error as string);
  }
  return parsed as DetectArtifactRegionResult;
}

export async function startWatch(): Promise<ScannerStatus> {
  const raw = await invokeScanner("scanner_start_watch", "Starting scanner watch timed out.");
  return JSON.parse(raw) as ScannerStatus;
}

export async function stopWatch(): Promise<ScannerStatus> {
  const raw = await invokeScanner("scanner_stop_watch", "Stopping scanner watch timed out.");
  return JSON.parse(raw) as ScannerStatus;
}

function invokeScanner(command: string, timeoutMessage: string, args?: Record<string, unknown>, timeoutMs = SCANNER_TIMEOUT_MS): Promise<string> {
  let timeoutId: number | undefined;
  const timeout = new Promise<string>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  const invokePromise = invoke<string>(command, args);
  const result = Promise.race([invokePromise, timeout]).finally(() => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  });

  // Suppress unhandled rejection when invoke() loses the race to timeout
  invokePromise.catch(() => {});

  return result;
}

function parseScannerArtifactResult(raw: string): ScannerArtifactResult {
  const parsed = JSON.parse(raw) as unknown;
  if (isScannerArtifactResult(parsed)) {
    return parsed;
  }
  if (isScannerError(parsed)) {
    throw new Error(parsed.error);
  }
  throw new Error("Scanner returned an unexpected payload.");
}

function isScannerArtifactResult(value: unknown): value is ScannerArtifactResult {
  return isRecord(value) && isRecord(value.capture) && isRecord(value.confidence) && typeof value.mode === "string" && typeof value.source === "string";
}

function isScannerError(value: unknown): value is { error: string } {
  return isRecord(value) && typeof value.error === "string" && !("capture" in value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
