import {
  assessScannerResultTrust,
  goodArtifactToArtifactInput,
  normalizeGoodArtifact,
  ScanConfidence,
  ScannerArtifactResult
} from "@ri-genshin/artifact-schema";
import { DEFAULT_PROFILES, evaluateArtifactExact } from "@ri-genshin/probability-core";

export type AssistantSummaryState = "setup" | "waiting" | "review" | "ready" | "error";

export interface AssistantSummaryMetric {
  label: string;
  value: string;
}

export interface AssistantSummary {
  state: AssistantSummaryState;
  title: string;
  detail: string;
  confidence: string;
  metrics: AssistantSummaryMetric[];
}

export function buildAssistantSummary(result: ScannerArtifactResult | null): AssistantSummary {
  if (!result) {
    return {
      state: "setup",
      title: "Set ROI",
      detail: "Place the red box on the artifact card, then scan.",
      confidence: "n/a",
      metrics: []
    };
  }

  const confidence = formatConfidence(result.confidence);
  const trust = assessScannerResultTrust(result);

  if (!trust.canEvaluate || !result.artifact) {
    return {
      state: result.screenState?.readyForArtifactOcr === false ? "review" : "waiting",
      title: result.screenState?.message.startsWith("Review ROI") ? "Review ROI" : "Waiting",
      detail: trust.blockingReasons.join(" ") || result.error || result.screenState?.message || "No artifact data yet.",
      confidence,
      metrics: []
    };
  }

  const normalized = normalizeGoodArtifact(result.artifact);
  if (!normalized.artifact) {
    return {
      state: "error",
      title: "Review OCR",
      detail: normalized.skipReason ?? "Artifact could not be normalized.",
      confidence,
      metrics: []
    };
  }

  try {
    const profile = DEFAULT_PROFILES[0];
    const artifact = goodArtifactToArtifactInput(normalized.artifact);
    const evaluation = evaluateArtifactExact(artifact, profile);
    const probability30 = evaluation.probabilityReachScoreThreshold[30] ?? 0;

    return {
      state: "ready",
      title: compactDecision(evaluation.recommendation.label),
      detail: evaluation.recommendation.title,
      confidence,
      metrics: [
        { label: "CV", value: evaluation.currentCV.toFixed(1) },
        { label: "Exp CV", value: evaluation.expectedFinalCV.toFixed(1) },
        { label: "Score", value: evaluation.expectedFinalScore.toFixed(1) },
        { label: "P >= 30", value: formatPercent(probability30) }
      ]
    };
  } catch (error) {
    return {
      state: "error",
      title: "Review OCR",
      detail: error instanceof Error ? error.message : "Artifact could not be evaluated.",
      confidence,
      metrics: []
    };
  }
}

function compactDecision(label: string): string {
  switch (label) {
    case "EXCELLENT":
    case "UPGRADE":
    case "UPGRADE_CAUTIOUSLY":
      return "Upgrade";
    case "RISKY_KEEP":
      return "Keep";
    case "STOP_OR_FODDER":
      return "Stop";
    default:
      return "Review";
  }
}

function formatConfidence(confidence: ScanConfidence): string {
  const values = Object.values(confidence).filter((value): value is number => typeof value === "number");
  if (values.length === 0) {
    return "n/a";
  }

  return formatPercent(Math.min(...values));
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
