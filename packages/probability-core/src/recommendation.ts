import { ScoringProfile } from "./scoring";

export type RecommendationLabel =
  | "EXCELLENT"
  | "UPGRADE"
  | "UPGRADE_CAUTIOUSLY"
  | "RISKY_KEEP"
  | "STOP_OR_FODDER";

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
  probabilityReachScoreThreshold: Record<number, number>;
  probabilityReachCVThreshold: Record<number, number>;
  remainingUpgradeEvents: number;
}

export function recommendArtifact(input: RecommendationInput, profile: ScoringProfile): Recommendation {
  const pGood = input.probabilityReachScoreThreshold[profile.thresholds.goodScore] ?? 0;
  const pExcellent = input.probabilityReachScoreThreshold[profile.thresholds.excellentScore] ?? 0;
  const explanation = [
    `${input.remainingUpgradeEvents} upgrade event(s) remain.`,
    `Expected final score is ${input.expectedFinalScore.toFixed(1)}.`,
    `Chance to reach good score (${profile.thresholds.goodScore}) is ${(pGood * 100).toFixed(1)}%.`,
    `Expected final CV is ${input.expectedFinalCV.toFixed(1)}.`
  ];

  if (input.currentScore >= profile.thresholds.excellentScore) {
    return { label: "EXCELLENT", title: "Excellent: upgrade to +20", explanation };
  }
  if (pExcellent >= 0.25 || pGood >= 0.7) {
    return { label: "UPGRADE", title: "Good: continue upgrading", explanation };
  }
  if (pGood >= profile.thresholds.minProbabilityToContinue) {
    return { label: "UPGRADE_CAUTIOUSLY", title: "Upgrade cautiously", explanation };
  }
  if (pGood >= 0.2) {
    return { label: "RISKY_KEEP", title: "Promising but risky", explanation };
  }
  return { label: "STOP_OR_FODDER", title: "Stop or fodder candidate", explanation };
}
