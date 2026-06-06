import { ArtifactInput, ArtifactPiece, StatType, SubstatInput } from "@ri-genshin/artifact-schema";
import { getRollValues } from "./distribution";

export type MainStatFit = "preferred" | "acceptable" | "not-preferred" | "not-evaluated";

export interface ScoringProfile {
  id: string;
  name: string;
  description?: string;
  /** Legacy raw-value weights, retained for diagnostics and import compatibility. */
  statWeights: Partial<Record<StatType, number>>;
  /** Utility multiplier applied to normalized roll-equivalent value. */
  usefulStatWeights: Partial<Record<StatType, number>>;
  targetStats: StatType[];
  mainStatsByPiece?: Partial<Record<ArtifactPiece, { preferred: StatType[]; acceptable?: StatType[] }>>;
  thresholds: {
    goodScore: number;
    excellentScore: number;
    goodUsefulRollValue: number;
    excellentUsefulRollValue: number;
    minProbabilityToContinue: number;
  };
}

export function calculateCV(substats: SubstatInput[], includeInactiveKnown = true): number {
  const relevant = includeInactiveKnown ? substats : substats.filter((substat) => substat.active);
  const critRate = relevant.find((substat) => substat.stat === StatType.CRIT_RATE)?.value ?? 0;
  const critDmg = relevant.find((substat) => substat.stat === StatType.CRIT_DMG)?.value ?? 0;
  return round(critRate * 2 + critDmg, 3);
}

export function calculateWeightedScore(
  artifact: ArtifactInput,
  profile: ScoringProfile,
  includeInactiveKnown = true
): number {
  const substats = includeInactiveKnown ? artifact.substats : artifact.substats.filter((substat) => substat.active);
  const score = substats.reduce((sum, substat) => {
    return sum + substat.value * (profile.statWeights[substat.stat] ?? 0);
  }, 0);
  return round(score, 3);
}

export function calculateUsefulRollValue(
  artifact: ArtifactInput,
  profile: ScoringProfile,
  includeInactiveKnown = true
): number {
  const substats = includeInactiveKnown ? artifact.substats : artifact.substats.filter((substat) => substat.active);
  const value = substats.reduce((sum, substat) => {
    const weight = profile.usefulStatWeights[substat.stat] ?? 0;
    if (weight <= 0) {
      return sum;
    }
    const maxRoll = Math.max(...getRollValues(substat.stat, artifact.rarity));
    return sum + (substat.value / maxRoll) * weight;
  }, 0);
  return round(value, 3);
}

export function assessMainStatFit(artifact: ArtifactInput, profile: ScoringProfile): MainStatFit {
  const preference = profile.mainStatsByPiece?.[artifact.piece];
  if (!preference) {
    return "not-evaluated";
  }
  if (preference.preferred.includes(artifact.mainStat)) {
    return "preferred";
  }
  if (preference.acceptable?.includes(artifact.mainStat)) {
    return "acceptable";
  }
  return "not-preferred";
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
