import { ArtifactPiece, StatType } from "@ri-genshin/artifact-schema";
import { ScoringProfile } from "./scoring";

export const GENERIC_DPS_CRIT_PROFILE: ScoringProfile = {
  id: "generic-dps-crit",
  name: "Crit Potential",
  description: "Measures crit-focused substat potential. Main stat and set fit are not evaluated.",
  statWeights: {
    [StatType.CRIT_RATE]: 2.0,
    [StatType.CRIT_DMG]: 1.0,
    [StatType.ATK_PERCENT]: 0.8,
    [StatType.ENERGY_RECHARGE]: 0.5,
    [StatType.ELEMENTAL_MASTERY]: 0.3,
    [StatType.FLAT_ATK]: 0.1
  },
  usefulStatWeights: {
    [StatType.CRIT_RATE]: 1,
    [StatType.CRIT_DMG]: 1,
    [StatType.ATK_PERCENT]: 0.65,
    [StatType.ENERGY_RECHARGE]: 0.45,
    [StatType.ELEMENTAL_MASTERY]: 0.3,
    [StatType.FLAT_ATK]: 0.1
  },
  targetStats: [StatType.CRIT_RATE, StatType.CRIT_DMG],
  thresholds: {
    goodScore: 30,
    excellentScore: 40,
    goodUsefulRollValue: 4,
    excellentUsefulRollValue: 6,
    minProbabilityToContinue: 0.4
  }
};

export const DEF_SCALING_DPS_PROFILE: ScoringProfile = {
  id: "def-scaling-dps",
  name: "DEF-scaling DPS",
  description: "Useful for characters that value DEF%, crit, and some ER.",
  statWeights: {
    [StatType.CRIT_RATE]: 2.0,
    [StatType.CRIT_DMG]: 1.0,
    [StatType.DEF_PERCENT]: 0.9,
    [StatType.ENERGY_RECHARGE]: 0.45,
    [StatType.ELEMENTAL_MASTERY]: 0.15,
    [StatType.FLAT_DEF]: 0.05
  },
  usefulStatWeights: {
    [StatType.CRIT_RATE]: 1,
    [StatType.CRIT_DMG]: 1,
    [StatType.DEF_PERCENT]: 0.8,
    [StatType.ENERGY_RECHARGE]: 0.45,
    [StatType.ELEMENTAL_MASTERY]: 0.15,
    [StatType.FLAT_DEF]: 0.08
  },
  targetStats: [StatType.CRIT_RATE, StatType.CRIT_DMG, StatType.DEF_PERCENT],
  mainStatsByPiece: {
    [ArtifactPiece.FLOWER]: { preferred: [StatType.FLAT_HP] },
    [ArtifactPiece.FEATHER]: { preferred: [StatType.FLAT_ATK] },
    [ArtifactPiece.SANDS]: { preferred: [StatType.DEF_PERCENT], acceptable: [StatType.ENERGY_RECHARGE] },
    [ArtifactPiece.GOBLET]: { preferred: [StatType.GEO_DMG], acceptable: [StatType.DEF_PERCENT] },
    [ArtifactPiece.CIRCLET]: {
      preferred: [StatType.CRIT_RATE, StatType.CRIT_DMG],
      acceptable: [StatType.DEF_PERCENT]
    }
  },
  thresholds: {
    goodScore: 30,
    excellentScore: 40,
    goodUsefulRollValue: 4,
    excellentUsefulRollValue: 6,
    minProbabilityToContinue: 0.4
  }
};

export const DEFAULT_PROFILES = [GENERIC_DPS_CRIT_PROFILE, DEF_SCALING_DPS_PROFILE] as const;
