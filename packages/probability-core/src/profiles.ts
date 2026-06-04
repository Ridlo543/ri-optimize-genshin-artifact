import { StatType } from "@ri-genshin/artifact-schema";
import { ScoringProfile } from "./scoring";

export const GENERIC_DPS_CRIT_PROFILE: ScoringProfile = {
  id: "generic-dps-crit",
  name: "Generic DPS Crit",
  description: "General crit-focused artifact evaluation.",
  statWeights: {
    [StatType.CRIT_RATE]: 2.0,
    [StatType.CRIT_DMG]: 1.0,
    [StatType.ATK_PERCENT]: 0.8,
    [StatType.ENERGY_RECHARGE]: 0.5,
    [StatType.ELEMENTAL_MASTERY]: 0.3,
    [StatType.FLAT_ATK]: 0.1
  },
  targetStats: [StatType.CRIT_RATE, StatType.CRIT_DMG],
  thresholds: {
    goodScore: 30,
    excellentScore: 40,
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
  targetStats: [StatType.CRIT_RATE, StatType.CRIT_DMG, StatType.DEF_PERCENT],
  thresholds: {
    goodScore: 30,
    excellentScore: 40,
    minProbabilityToContinue: 0.4
  }
};

export const DEFAULT_PROFILES = [GENERIC_DPS_CRIT_PROFILE, DEF_SCALING_DPS_PROFILE] as const;
