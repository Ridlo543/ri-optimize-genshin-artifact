import { invoke } from "@tauri-apps/api/core";
import { ScanRegion, ScannerArtifactResult } from "@ri-genshin/artifact-schema";

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
  const raw = await invoke<string>("scanner_status");
  return JSON.parse(raw) as ScannerStatus;
}

export async function scanVisibleArtifact(): Promise<ScannerArtifactResult> {
  const raw = await invoke<string>("scanner_scan_visible_artifact");
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function scanRegionArtifact(region: ScanRegion): Promise<ScannerArtifactResult> {
  const raw = await invoke<string>("scanner_scan_region_artifact", { regionJson: JSON.stringify(region) });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function classifyVisibleScreen(): Promise<ScannerArtifactResult> {
  const raw = await invoke<string>("scanner_classify_visible_screen");
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function classifyRegionArtifact(region: ScanRegion): Promise<ScannerArtifactResult> {
  const raw = await invoke<string>("scanner_classify_region_artifact", { regionJson: JSON.stringify(region) });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function ocrSubstats(imagePath: string): Promise<unknown> {
  const raw = await invoke<string>("scanner_ocr_substats", { imagePath });
  return JSON.parse(raw) as unknown;
}

export async function parseFixtureArtifact(fixtureFolder: string): Promise<unknown> {
  const raw = await invoke<string>("scanner_parse_fixture_artifact", { fixtureFolder });
  return JSON.parse(raw) as unknown;
}

export async function parseFixtureCard(fixtureFolder: string): Promise<unknown> {
  const raw = await invoke<string>("scanner_parse_fixture_card", { fixtureFolder });
  return JSON.parse(raw) as unknown;
}

export async function parseScreenshotArtifact(imagePath: string): Promise<ScannerArtifactResult> {
  const raw = await invoke<string>("scanner_parse_screenshot_artifact", { imagePath });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function parseScreenshotFixture(fixtureName: string): Promise<ScannerArtifactResult> {
  const raw = await invoke<string>("scanner_parse_screenshot_fixture", { fixtureName });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function parseRegionFixture(fixtureName: string, region: ScanRegion): Promise<ScannerArtifactResult> {
  const raw = await invoke<string>("scanner_parse_region_fixture", { fixtureName, regionJson: JSON.stringify(region) });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function classifyRegionFixture(fixtureName: string, region: ScanRegion): Promise<ScannerArtifactResult> {
  const raw = await invoke<string>("scanner_classify_region_fixture", { fixtureName, regionJson: JSON.stringify(region) });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function classifyScreenshotArtifact(imagePath: string): Promise<ScannerArtifactResult> {
  const raw = await invoke<string>("scanner_classify_screenshot_artifact", { imagePath });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function classifyScreenshotFixture(fixtureName: string): Promise<ScannerArtifactResult> {
  const raw = await invoke<string>("scanner_classify_screenshot_fixture", { fixtureName });
  return JSON.parse(raw) as ScannerArtifactResult;
}

export async function startWatch(): Promise<ScannerStatus> {
  const raw = await invoke<string>("scanner_start_watch");
  return JSON.parse(raw) as ScannerStatus;
}

export async function stopWatch(): Promise<ScannerStatus> {
  const raw = await invoke<string>("scanner_stop_watch");
  return JSON.parse(raw) as ScannerStatus;
}
