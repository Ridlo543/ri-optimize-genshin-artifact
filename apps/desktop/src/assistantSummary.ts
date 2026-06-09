import {
  assessScannerResultTrust,
  goodArtifactToArtifactInput,
  GoodArtifact,
  GOOD_SLOT_KEY_TO_LABEL,
  GOOD_STAT_KEY_TO_LABEL,
  normalizeGoodArtifact,
  ScanConfidence,
  ScannerArtifactResult
} from "@ri-genshin/artifact-schema";
import { DEFAULT_PROFILES, evaluateArtifactExact, ScoringProfile } from "@ri-genshin/probability-core";
import { getScannerCorrectionState } from "./scannerCorrection";

export type AssistantSummaryState = "setup" | "waiting" | "review" | "ready" | "error";

export interface AssistantSummaryMetric {
  label: string;
  value: string;
  help: string;
}

export interface AssistantSummary {
  state: AssistantSummaryState;
  title: string;
  detail: string;
  confidence: string;
  metrics: AssistantSummaryMetric[];
  details: string[];
}

export function buildAssistantSummary(result: ScannerArtifactResult | null, profile: ScoringProfile = DEFAULT_PROFILES[0]): AssistantSummary {
  if (!result) {
    return {
      state: "setup",
      title: "Set Area",
      detail: "Click Set Area, then place the box over an artifact detail panel.",
      confidence: "n/a",
      metrics: [],
      details: ["No scan has been run yet."]
    };
  }

  const confidence = formatConfidence(result.confidence);
  const trust = assessScannerResultTrust(result);

  if (!trust.canEvaluate || !result.artifact) {
    const correction = getScannerCorrectionState(result);
    if (correction.available) {
      return {
        state: "review",
        title: correctionTitle(correction.missingFields),
        detail: correction.reason,
        confidence,
        metrics: [],
        details: [...trust.blockingReasons, ...trust.warningMessages].slice(0, 6)
      };
    }

    const readyButIncomplete = result.screenState?.readyForArtifactOcr === true;
    const fallbackTitle = titleFromBlockingReasons(trust.blockingReasons) ?? "Review OCR";
    return {
      state: result.screenState?.readyForArtifactOcr === false || readyButIncomplete ? "review" : "waiting",
      title: result.screenState?.message.startsWith("Review ROI") ? "Adjust Area" : readyButIncomplete ? fallbackTitle : "Waiting",
      detail: trust.blockingReasons.join(" ") || result.error || result.screenState?.message || "No artifact data yet.",
      confidence,
      metrics: [],
      details: [...(trust.blockingReasons.length > 0 ? trust.blockingReasons : [result.error ?? result.screenState?.message ?? "No artifact data yet."]), ...trust.warningMessages].slice(0, 6)
    };
  }

  const normalized = normalizeGoodArtifact(result.artifact);
  if (!normalized.artifact) {
    const skipTitle = titleFromNormalizationSkips(normalized.skipReason) ?? "Review OCR";
    const details = normalized.skipReason ? [normalized.skipReason, ...normalized.warnings.map((warning) => warning.message)] : ["Artifact could not be normalized."];
    return {
      state: "error",
      title: skipTitle,
      detail: normalized.skipReason ?? "Artifact could not be normalized.",
      confidence,
      metrics: [],
      details
    };
  }

  try {
    const artifact = goodArtifactToArtifactInput(normalized.artifact);
    const evaluation = evaluateArtifactExact(artifact, profile);
    const facts = formatArtifactFacts(result.artifact);

    return {
      state: "ready",
      title: compactDecision(evaluation.recommendation.label),
      detail: facts,
      confidence,
      metrics: [
        {
          label: "Active CV",
          value: evaluation.activeCritValue.toFixed(1),
          help: "Crit Value currently active: CRIT Rate x 2 + CRIT DMG."
        },
        {
          label: "Known CV",
          value: evaluation.knownCritValue.toFixed(1),
          help: "Active Crit Value plus a visible unactivated stat that is guaranteed to unlock."
        },
        {
          label: "Expected CV",
          value: evaluation.expectedFinalCritValue.toFixed(1),
          help: "Probability-weighted average Crit Value at this artifact rarity's maximum level."
        },
        {
          label: "Useful RV",
          value: evaluation.usefulRollValue.toFixed(1),
          help: `Normalized useful roll value for the ${evaluation.profileContext.name} profile.`
        },
        {
          label: "Reach target",
          value: formatPercent(evaluation.probabilityReachProfileTarget),
          help: `Exact chance to reach ${evaluation.profileContext.targetUsefulRollValue.toFixed(1)} Useful Roll Value for ${evaluation.profileContext.name}.`
        }
      ],
      details: [
        evaluation.recommendation.title,
        `Profile: ${evaluation.profileContext.name}. Main stat fit: ${formatFit(evaluation.profileContext.mainStatFit)}. Set fit: not evaluated.`,
        ...evaluation.recommendation.explanation,
        ...trust.warningMessages
      ]
    };
  } catch (error) {
    return {
      state: "error",
      title: "Review OCR",
      detail: error instanceof Error ? error.message : "Artifact could not be evaluated.",
      confidence,
      metrics: [],
      details: [error instanceof Error ? error.message : "Artifact could not be evaluated."]
    };
  }
}

function correctionTitle(missingFields: string[]): string {
  const names = missingFields.map(missingFieldLabel).filter(Boolean);
  if (names.length === 1) {
    return `Review ${names[0]}`;
  }
  if (names.length >= 2) {
    return `Review ${names.join(" & ")}`;
  }
  return "Review OCR";
}

function missingFieldLabel(field: string): string {
  switch (field) {
    case "slotKey":
      return "Slot";
    case "mainStatKey":
      return "Main Stat";
    case "level":
      return "Level";
    default:
      return "";
  }
}

function titleFromBlockingReasons(blockingReasons: string[]): string | null {
  const hasSlot = blockingReasons.some((r) => /(?:artifact slot|slotkey|\bslot\b)/i.test(r) && !r.toLowerCase().includes("review roi"));
  const hasMainStat = blockingReasons.some((r) => /(?:main stat|mainstatkey)/i.test(r));
  const hasLevel = blockingReasons.some((r) => /(?:artifact level|level confidence|missing level)/i.test(r));
  const hasSubstats = blockingReasons.some((r) => /\bsubstats?\b/i.test(r));
  const hasRoi = blockingReasons.some((r) => /(?:adjust roi|review roi)/i.test(r));

  if (hasRoi) {
    return "Adjust Area";
  }

  const parts: string[] = [];
  if (hasSlot) parts.push("Slot");
  if (hasMainStat) parts.push("Main Stat");
  if (hasLevel) parts.push("Level");
  if (hasSubstats) parts.push("Substats");

  if (parts.length === 1) {
    return `Review ${parts[0]}`;
  }
  if (parts.length >= 2) {
    return `Review ${parts.join(" & ")}`;
  }
  return null;
}

function titleFromNormalizationSkips(skipReason: string | undefined): string | null {
  if (!skipReason) {
    return null;
  }
  const lower = skipReason.toLowerCase();
  if (lower.includes("unactivated substat")) {
    return "Review Substats";
  }
  if (lower.includes("rarity") || lower.includes("level")) {
    return "Review OCR";
  }
  return null;
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
    case "LOW_RARITY_FODDER":
      return "Fodder";
    default:
      return "Review";
  }
}

function formatConfidence(confidence: ScanConfidence): string {
  const values = [confidence.slotKey, confidence.mainStatKey, confidence.level, confidence.substats].filter(
    (value): value is number => typeof value === "number"
  );
  if (values.length === 0) {
    return "n/a";
  }

  return formatPercent(Math.min(...values));
}

function formatArtifactFacts(artifact: GoodArtifact): string {
  const active = artifact.substats.length;
  const guaranteed = artifact.unactivatedSubstats?.length ?? 0;
  return `${artifact.rarity}-star ${GOOD_SLOT_KEY_TO_LABEL[artifact.slotKey] ?? artifact.slotKey} · ${GOOD_STAT_KEY_TO_LABEL[artifact.mainStatKey] ?? artifact.mainStatKey} · +${artifact.level} · ${active} active${guaranteed > 0 ? ` + ${guaranteed} guaranteed` : ""}`;
}

function formatFit(value: string): string {
  return value.replaceAll("-", " ");
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
