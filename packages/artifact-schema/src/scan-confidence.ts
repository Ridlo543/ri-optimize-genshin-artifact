import { GoodArtifact, ScanConfidence, ScannerArtifactResult } from "./types";

export interface ScanTrustAssessment {
  canEvaluate: boolean;
  reviewRecommended: boolean;
  blockingReasons: string[];
  warningMessages: string[];
}

const REVIEW_THRESHOLD = 0.85;

const BLOCK_THRESHOLDS: Partial<Record<keyof ScanConfidence, number>> = {
  slotKey: 0.5,
  mainStatKey: 0.4,
  substats: 0.5
};

const OPTIONAL_FIELDS = new Set<keyof ScanConfidence>(["setKey", "lock", "equipped", "location"]);

const REQUIRED_ARTIFACT_FIELDS: Array<keyof Pick<GoodArtifact, "slotKey" | "mainStatKey">> = ["slotKey", "mainStatKey"];

export function assessScannerResultTrust(result: ScannerArtifactResult): ScanTrustAssessment {
  const blockingReasons: string[] = [];
  const warningMessages: string[] = [];
  warningMessages.push(...(result.optionalWarnings ?? []));

  if (result.screenState && !result.screenState.readyForArtifactOcr) {
    return {
      canEvaluate: false,
      reviewRecommended: false,
      blockingReasons: [result.screenState.message],
      warningMessages: []
    };
  }

  if (result.error) {
    blockingReasons.push(formatScannerError(result.error));
  }

  if (!result.artifact) {
    if (result.artifactDraft && result.missingFields && result.missingFields.length > 0) {
      blockingReasons.push(`Review ${formatFieldList(result.missingFields)} before evaluating.`);
    } else {
      blockingReasons.push("Scanner did not return artifact data.");
    }
  } else {
    for (const field of REQUIRED_ARTIFACT_FIELDS) {
      const value = result.artifact[field];
      if (!value) {
        blockingReasons.push(`Scanner artifact is missing ${field}.`);
      }
    }
    if (result.artifact.substats.length === 0 && !allowsNoVisibleSubstats(result.artifact)) {
      blockingReasons.push("Scanner artifact is missing substats.");
    }
  }

  for (const [field, threshold] of Object.entries(BLOCK_THRESHOLDS) as Array<[keyof ScanConfidence, number]>) {
    if (field === "substats" && result.artifact && allowsNoVisibleSubstats(result.artifact)) {
      continue;
    }
    const value = result.confidence[field];
    if (typeof value === "number" && value < threshold) {
      blockingReasons.push(`Review ${friendlyFieldName(field)} before evaluating.`);
    }
  }

  for (const [field, value] of Object.entries(result.confidence) as Array<[keyof ScanConfidence, number | undefined]>) {
    if (field === "substats" && result.artifact && allowsNoVisibleSubstats(result.artifact)) {
      continue;
    }
    if (typeof value === "number" && value < REVIEW_THRESHOLD) {
      warningMessages.push(formatConfidenceWarning(field, value));
    }
  }

  return {
    canEvaluate: blockingReasons.length === 0,
    reviewRecommended: warningMessages.length > 0,
    blockingReasons: unique(blockingReasons),
    warningMessages: unique(warningMessages)
  };
}

function formatConfidenceWarning(field: keyof ScanConfidence, value: number): string {
  if (field === "setKey") {
    return `Set name confidence is ${formatPercent(value)}. Upgrade-roll analysis can still continue.`;
  }
  if (OPTIONAL_FIELDS.has(field)) {
    return `Optional ${field} reading confidence is ${formatPercent(value)}.`;
  }
  return `Review ${friendlyFieldName(field)}: OCR confidence ${formatPercent(value)}.`;
}

function formatScannerError(error: string): string {
  const missingMatch = error.match(/(?:Region|Screenshot) OCR missing required fields: (?<fields>[^.]+)\./);
  if (missingMatch?.groups?.fields) {
    return `Review ${formatFieldList(missingMatch.groups.fields.split(",").map((field) => field.trim()))} before evaluating.`;
  }

  if (error.startsWith("Review ROI")) {
    return "Adjust the ROI so the red box covers the artifact detail panel.";
  }

  return error;
}

function formatFieldList(fields: string[]): string {
  const names = fields.map((field) => friendlyFieldName(field as keyof ScanConfidence));
  if (names.length <= 1) {
    return names[0] ?? "OCR";
  }

  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function friendlyFieldName(field: keyof ScanConfidence): string {
  switch (field) {
    case "slotKey":
      return "artifact slot";
    case "mainStatKey":
      return "main stat";
    case "substats":
      return "substats";
    case "level":
      return "artifact level";
    default:
      return field;
  }
}

function allowsNoVisibleSubstats(artifact: GoodArtifact): boolean {
  return artifact.rarity === 2 && artifact.level === 0;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
