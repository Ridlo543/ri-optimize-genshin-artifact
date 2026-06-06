import { invoke } from "@tauri-apps/api/core";
import { ScanRegion, ScannerArtifactResult } from "@ri-genshin/artifact-schema";

const SCANNER_TIMEOUT_MS = 45_000;

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
  const raw = await invokeScanner("scanner_status", "Checking scanner status timed out.");
  return JSON.parse(raw) as ScannerStatus;
}

export async function scanVisibleArtifact(): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_scan_visible_artifact", "Visible artifact scan timed out.");
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function scanRegionArtifact(region: ScanRegion, options: { occlusionAvoided?: boolean } = {}): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_scan_region_artifact", "Artifact ROI scan timed out. Try Analyze again after confirming the ROI covers only the artifact panel.", {
    regionJson: JSON.stringify(region),
    occlusionAvoided: options.occlusionAvoided ?? false
  });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function classifyVisibleScreen(): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_classify_visible_screen", "Screen classification timed out.");
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function classifyRegionArtifact(region: ScanRegion): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_classify_region_artifact", "ROI classification timed out.", { regionJson: JSON.stringify(region) });
  return JSON.parse(raw) as ScannerArtifactResult;
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
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function parseScreenshotFixture(fixtureName: string): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_parse_screenshot_fixture", "Screenshot fixture OCR timed out.", { fixtureName });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function parseRegionFixture(fixtureName: string, region: ScanRegion): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_parse_region_fixture", "Region fixture OCR timed out.", { fixtureName, regionJson: JSON.stringify(region) });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function classifyRegionFixture(fixtureName: string, region: ScanRegion): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_classify_region_fixture", "Region fixture classification timed out.", { fixtureName, regionJson: JSON.stringify(region) });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function classifyScreenshotArtifact(imagePath: string): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_classify_screenshot_artifact", "Screenshot classification timed out.", { imagePath });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function classifyScreenshotFixture(fixtureName: string): Promise<ScannerArtifactResult> {
  const raw = await invokeScanner("scanner_classify_screenshot_fixture", "Screenshot fixture classification timed out.", { fixtureName });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function startWatch(): Promise<ScannerStatus> {
  const raw = await invokeScanner("scanner_start_watch", "Starting scanner watch timed out.");
  return JSON.parse(raw) as ScannerStatus;
}

export async function stopWatch(): Promise<ScannerStatus> {
  const raw = await invokeScanner("scanner_stop_watch", "Stopping scanner watch timed out.");
  return JSON.parse(raw) as ScannerStatus;
}

function invokeScanner(command: string, timeoutMessage: string, args?: Record<string, unknown>): Promise<string> {
  let timeoutId: number | undefined;
  const timeout = new Promise<string>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), SCANNER_TIMEOUT_MS);
  });

  return Promise.race([invoke<string>(command, args), timeout]).finally(() => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  });
}
