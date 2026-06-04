import { ArtifactInput, StatType } from "@ri-genshin/artifact-schema";
import { MINOR_AFFIX_WEIGHTS, MINOR_ROLL_VALUES_5_STAR, MINOR_STATS, UPGRADE_MILESTONES } from "./constants";

export interface WeightedStat {
  stat: StatType;
  probability: number;
}

export function getAvailableMinorAffixes(artifact: ArtifactInput): StatType[] {
  const existing = new Set(artifact.substats.map((substat) => substat.stat));
  return MINOR_STATS.filter((stat) => stat !== artifact.mainStat && !existing.has(stat));
}

export function getNewSubstatDistribution(artifact: ArtifactInput): WeightedStat[] {
  const available = getAvailableMinorAffixes(artifact);
  const totalWeight = available.reduce((sum, stat) => sum + (MINOR_AFFIX_WEIGHTS[stat] ?? 0), 0);
  if (totalWeight <= 0) {
    return [];
  }
  return available.map((stat) => ({
    stat,
    probability: (MINOR_AFFIX_WEIGHTS[stat] ?? 0) / totalWeight
  }));
}

export function getRollValues(stat: StatType, rarity: number): number[] {
  if (rarity !== 5) {
    throw new Error("MVP supports 5-star roll values only.");
  }
  const values = MINOR_ROLL_VALUES_5_STAR[stat];
  if (!values) {
    throw new Error(`No minor roll values for ${stat}.`);
  }
  return values;
}

export function getRemainingMilestones(level: ArtifactInput["level"]): Array<4 | 8 | 12 | 16 | 20> {
  return UPGRADE_MILESTONES.filter((milestone) => milestone > level);
}
