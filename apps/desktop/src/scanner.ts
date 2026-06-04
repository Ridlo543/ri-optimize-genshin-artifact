import { invoke } from "@tauri-apps/api/core";
import { ScannerArtifactResult } from "@ri-genshin/artifact-schema";

export interface ScannerStatus {
  available: boolean;
  processName?: string;
  windowTitle?: string;
  resolution?: string;
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

export async function startWatch(): Promise<ScannerStatus> {
  const raw = await invoke<string>("scanner_start_watch");
  return JSON.parse(raw) as ScannerStatus;
}

export async function stopWatch(): Promise<ScannerStatus> {
  const raw = await invoke<string>("scanner_stop_watch");
  return JSON.parse(raw) as ScannerStatus;
}
