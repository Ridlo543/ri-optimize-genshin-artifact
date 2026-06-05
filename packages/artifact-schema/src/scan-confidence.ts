import { GoodArtifact, ScanConfidence, ScannerArtifactResult } from "./types";

export interface ScanTrustAssessment {
  canEvaluate: boolean;
  reviewRecommended: boolean;
  blockingReasons: string[];
  warningMessages: string[];
}

const REVIEW_THRESHOLD = 0.85;

const BLOCK_THRESHOLDS: Partial<Record<keyof ScanConfidence, number>> = {
  setKey: 0.45,
  slotKey: 0.5,
  mainStatKey: 0.4,
  substats: 0.5
};

const REQUIRED_ARTIFACT_FIELDS: Array<keyof Pick<GoodArtifact, "slotKey" | "mainStatKey" | "substats">> = ["slotKey", "mainStatKey", "substats"];

export function assessScannerResultTrust(result: ScannerArtifactResult): ScanTrustAssessment {
  const blockingReasons: string[] = [];
  const warningMessages: string[] = [];

  if (result.screenState && !result.screenState.readyForArtifactOcr) {
    blockingReasons.push(result.screenState.message);
  }

  if (result.error) {
    blockingReasons.push(result.error);
  }

  if (!result.artifact) {
    blockingReasons.push("Scanner did not return artifact data.");
  } else {
    for (const field of REQUIRED_ARTIFACT_FIELDS) {
      const value = result.artifact[field];
      if (Array.isArray(value) ? value.length === 0 : !value) {
        blockingReasons.push(`Scanner artifact is missing ${field}.`);
      }
    }
  }

  for (const [field, threshold] of Object.entries(BLOCK_THRESHOLDS) as Array<[keyof ScanConfidence, number]>) {
    const value = result.confidence[field];
    if (typeof value === "number" && value < threshold) {
      blockingReasons.push(`Scanner confidence for ${field} is too low (${formatPercent(value)}).`);
    }
  }

  for (const [field, value] of Object.entries(result.confidence) as Array<[keyof ScanConfidence, number | undefined]>) {
    if (typeof value === "number" && value < REVIEW_THRESHOLD) {
      warningMessages.push(`Review OCR field ${field}: confidence ${formatPercent(value)}.`);
    }
  }

  return {
    canEvaluate: blockingReasons.length === 0,
    reviewRecommended: warningMessages.length > 0,
    blockingReasons: unique(blockingReasons),
    warningMessages: unique(warningMessages)
  };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
