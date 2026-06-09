import { ArtifactInput, ArtifactLevel, ArtifactRarity, StatType } from "@ri-genshin/artifact-schema";
import { MINOR_AFFIX_WEIGHTS, MINOR_ROLL_VALUES_BY_RARITY, MINOR_STATS, ROLL_VALUE_WEIGHTS_BY_RARITY, UPGRADE_MILESTONES_BY_RARITY } from "./constants";

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

export function getRollValues(stat: StatType, rarity: ArtifactRarity): number[] {
  const values = MINOR_ROLL_VALUES_BY_RARITY[rarity]?.[stat];
  if (!values) {
    throw new Error(`No minor roll values for ${rarity}-star ${stat}.`);
  }
  return values;
}

export function getRollValueProbabilities(rarity: ArtifactRarity): number[] {
  const weights = ROLL_VALUE_WEIGHTS_BY_RARITY[rarity] ?? ROLL_VALUE_WEIGHTS_BY_RARITY[5];
  if (!weights) {
    return [1];
  }
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  return weights.map((w) => w / totalWeight);
}

export function getRemainingMilestones(level: ArtifactInput["level"], rarity: ArtifactRarity = 5): ArtifactLevel[] {
  return UPGRADE_MILESTONES_BY_RARITY[rarity].filter((milestone) => milestone > level);
}
