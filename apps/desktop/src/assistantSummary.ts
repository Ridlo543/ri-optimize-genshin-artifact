import {
  assessScannerResultTrust,
  goodArtifactToArtifactInput,
  GoodArtifact,
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
      title: "Set ROI",
      detail: "Place the red box on the artifact card, then scan.",
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
    return {
      state: result.screenState?.readyForArtifactOcr === false || readyButIncomplete ? "review" : "waiting",
      title: result.screenState?.message.startsWith("Review ROI") ? "Adjust ROI" : readyButIncomplete ? "Review OCR" : "Waiting",
      detail: trust.blockingReasons.join(" ") || result.error || result.screenState?.message || "No artifact data yet.",
      confidence,
      metrics: [],
      details: [...(trust.blockingReasons.length > 0 ? trust.blockingReasons : [result.error ?? result.screenState?.message ?? "No artifact data yet."]), ...trust.warningMessages].slice(0, 6)
    };
  }

  const normalized = normalizeGoodArtifact(result.artifact);
  if (!normalized.artifact) {
    return {
      state: "error",
      title: "Review OCR",
      detail: normalized.skipReason ?? "Artifact could not be normalized.",
      confidence,
      metrics: [],
      details: [normalized.skipReason ?? "Artifact could not be normalized.", ...normalized.warnings.map((warning) => warning.message)]
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
  if (missingFields.length === 1 && missingFields[0] === "level") {
    return "Review Level";
  }
  if (missingFields.length === 1 && missingFields[0] === "slotKey") {
    return "Review Slot";
  }
  if (missingFields.length === 1 && missingFields[0] === "mainStatKey") {
    return "Review Main Stat";
  }
  return "Review OCR";
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
  return `${artifact.rarity}-star ${slotLabel(artifact.slotKey)} · ${statLabel(artifact.mainStatKey)} · +${artifact.level} · ${active} active${guaranteed > 0 ? ` + ${guaranteed} guaranteed` : ""}`;
}

function slotLabel(slotKey: string): string {
  return (
    {
      flower: "Flower",
      plume: "Plume",
      sands: "Sands",
      goblet: "Goblet",
      circlet: "Circlet"
    }[slotKey] ?? slotKey
  );
}

function statLabel(statKey: string): string {
  return (
    {
      hp: "HP",
      atk: "ATK",
      hp_: "HP%",
      atk_: "ATK%",
      def_: "DEF%",
      eleMas: "Elemental Mastery",
      enerRech_: "Energy Recharge",
      critRate_: "CRIT Rate",
      critDMG_: "CRIT DMG"
    }[statKey] ?? statKey
  );
}

function formatFit(value: string): string {
  return value.replaceAll("-", " ");
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
