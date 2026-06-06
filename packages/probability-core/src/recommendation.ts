import { ArtifactRarity } from "@ri-genshin/artifact-schema";
import { ScoringProfile } from "./scoring";

export type RecommendationLabel =
  | "EXCELLENT"
  | "UPGRADE"
  | "UPGRADE_CAUTIOUSLY"
  | "RISKY_KEEP"
  | "STOP_OR_FODDER"
  | "LOW_RARITY_FODDER";

export interface Recommendation {
  label: RecommendationLabel;
  title: string;
  explanation: string[];
}

export interface RecommendationInput {
  currentScore: number;
  currentCV: number;
  expectedFinalScore: number;
  expectedFinalCV: number;
  usefulRollValue: number;
  expectedFinalUsefulRollValue: number;
  probabilityReachProfileTarget: number;
  probabilityReachScoreThreshold: Record<number, number>;
  probabilityReachCVThreshold: Record<number, number>;
  remainingUpgradeEvents: number;
  rarity: ArtifactRarity;
}

export function recommendArtifact(input: RecommendationInput, profile: ScoringProfile): Recommendation {
  const pGood = input.probabilityReachProfileTarget;
  const explanation = [
    `${input.remainingUpgradeEvents} upgrade event(s) remain.`,
    `Expected useful roll value is ${input.expectedFinalUsefulRollValue.toFixed(1)} for the ${profile.name} profile.`,
    `Chance to reach the ${profile.thresholds.goodUsefulRollValue.toFixed(1)} useful-roll target is ${(pGood * 100).toFixed(1)}%.`,
    `Expected final Crit Value is ${input.expectedFinalCV.toFixed(1)}.`,
    "Artifact set fit is not evaluated."
  ];

  if (input.rarity <= 3) {
    return {
      label: "LOW_RARITY_FODDER",
      title: "Low rarity: temporary or fodder",
      explanation: [
        ...explanation,
        `${input.rarity}-star artifacts have a low level cap, so treat this as temporary gear unless it fills an immediate gap.`
      ]
    };
  }

  const rarityExplanation = input.rarity === 4
    ? [...explanation, "4-star artifacts cap at +16, so compare them as temporary pieces."]
    : explanation;

  if (input.usefulRollValue >= profile.thresholds.excellentUsefulRollValue) {
    return { label: "EXCELLENT", title: `High ${profile.name.toLowerCase()}: upgrade`, explanation: rarityExplanation };
  }
  if (pGood >= 0.7) {
    return { label: "UPGRADE", title: `Good ${profile.name.toLowerCase()}: continue`, explanation: rarityExplanation };
  }
  if (pGood >= profile.thresholds.minProbabilityToContinue) {
    return { label: "UPGRADE_CAUTIOUSLY", title: `Borderline ${profile.name.toLowerCase()}: test rolls`, explanation: rarityExplanation };
  }
  if (pGood >= 0.2) {
    return { label: "RISKY_KEEP", title: `Low-chance ${profile.name.toLowerCase()}: keep cautiously`, explanation: rarityExplanation };
  }
  return { label: "STOP_OR_FODDER", title: `Low ${profile.name.toLowerCase()}: stop candidate`, explanation: rarityExplanation };
}
