import { ArtifactInput, StatType, SubstatInput } from "@ri-genshin/artifact-schema";

export interface ScoringProfile {
  id: string;
  name: string;
  description?: string;
  statWeights: Partial<Record<StatType, number>>;
  targetStats: StatType[];
  thresholds: {
    goodScore: number;
    excellentScore: number;
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

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
