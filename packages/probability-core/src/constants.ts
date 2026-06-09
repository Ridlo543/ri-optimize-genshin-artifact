import { ArtifactLevel, ArtifactPiece, ArtifactRarity, StatType } from "@ri-genshin/artifact-schema";

export const MINOR_AFFIX_WEIGHTS: Record<StatType, number | undefined> = {
  [StatType.FLAT_HP]: 6,
  [StatType.FLAT_ATK]: 6,
  [StatType.FLAT_DEF]: 6,
  [StatType.HP_PERCENT]: 4,
  [StatType.ATK_PERCENT]: 4,
  [StatType.DEF_PERCENT]: 4,
  [StatType.ELEMENTAL_MASTERY]: 4,
  [StatType.ENERGY_RECHARGE]: 4,
  [StatType.CRIT_RATE]: 3,
  [StatType.CRIT_DMG]: 3,
  [StatType.PYRO_DMG]: undefined,
  [StatType.HYDRO_DMG]: undefined,
  [StatType.ELECTRO_DMG]: undefined,
  [StatType.CRYO_DMG]: undefined,
  [StatType.ANEMO_DMG]: undefined,
  [StatType.GEO_DMG]: undefined,
  [StatType.DENDRO_DMG]: undefined,
  [StatType.PHYSICAL_DMG]: undefined,
  [StatType.HEALING_BONUS]: undefined
};

export const MINOR_STATS = Object.entries(MINOR_AFFIX_WEIGHTS)
  .filter(([, weight]) => typeof weight === "number")
  .map(([stat]) => stat as StatType);

export const VALID_MAIN_STATS_BY_PIECE: Record<ArtifactPiece, StatType[]> = {
  [ArtifactPiece.FLOWER]: [StatType.FLAT_HP],
  [ArtifactPiece.FEATHER]: [StatType.FLAT_ATK],
  [ArtifactPiece.SANDS]: [
    StatType.HP_PERCENT,
    StatType.ATK_PERCENT,
    StatType.DEF_PERCENT,
    StatType.ENERGY_RECHARGE,
    StatType.ELEMENTAL_MASTERY
  ],
  [ArtifactPiece.GOBLET]: [
    StatType.HP_PERCENT,
    StatType.ATK_PERCENT,
    StatType.DEF_PERCENT,
    StatType.ELEMENTAL_MASTERY,
    StatType.PYRO_DMG,
    StatType.HYDRO_DMG,
    StatType.ELECTRO_DMG,
    StatType.CRYO_DMG,
    StatType.ANEMO_DMG,
    StatType.GEO_DMG,
    StatType.DENDRO_DMG,
    StatType.PHYSICAL_DMG
  ],
  [ArtifactPiece.CIRCLET]: [
    StatType.HP_PERCENT,
    StatType.ATK_PERCENT,
    StatType.DEF_PERCENT,
    StatType.ELEMENTAL_MASTERY,
    StatType.CRIT_RATE,
    StatType.CRIT_DMG,
    StatType.HEALING_BONUS
  ]
};

export const ROLL_VALUE_WEIGHTS_BY_RARITY: Record<number, number[]> = {
  2: [3, 2, 1],
  3: [7, 5, 3, 1],
  4: [7, 5, 3, 1],
  5: [7, 5, 3, 1]
};

export const MINOR_ROLL_VALUES_BY_RARITY: Record<ArtifactRarity, Record<StatType, number[] | undefined>> = {
  2: {
    [StatType.FLAT_HP]: [50.19, 60.95, 71.7],
    [StatType.FLAT_ATK]: [3.27, 3.97, 4.67],
    [StatType.FLAT_DEF]: [3.89, 4.72, 5.56],
    [StatType.HP_PERCENT]: [1.63, 1.98, 2.33],
    [StatType.ATK_PERCENT]: [1.63, 1.98, 2.33],
    [StatType.DEF_PERCENT]: [2.04, 2.48, 2.91],
    [StatType.ELEMENTAL_MASTERY]: [6.53, 7.93, 9.33],
    [StatType.ENERGY_RECHARGE]: [1.81, 2.2, 2.59],
    [StatType.CRIT_RATE]: [1.09, 1.32, 1.55],
    [StatType.CRIT_DMG]: [2.18, 2.64, 3.11],
    [StatType.PYRO_DMG]: undefined,
    [StatType.HYDRO_DMG]: undefined,
    [StatType.ELECTRO_DMG]: undefined,
    [StatType.CRYO_DMG]: undefined,
    [StatType.ANEMO_DMG]: undefined,
    [StatType.GEO_DMG]: undefined,
    [StatType.DENDRO_DMG]: undefined,
    [StatType.PHYSICAL_DMG]: undefined,
    [StatType.HEALING_BONUS]: undefined
  },
  3: {
    [StatType.FLAT_HP]: [100.38, 114.72, 129.06, 143.4],
    [StatType.FLAT_ATK]: [6.54, 7.47, 8.4, 9.34],
    [StatType.FLAT_DEF]: [7.78, 8.89, 10, 11.11],
    [StatType.HP_PERCENT]: [2.45, 2.8, 3.15, 3.5],
    [StatType.ATK_PERCENT]: [2.45, 2.8, 3.15, 3.5],
    [StatType.DEF_PERCENT]: [3.06, 3.5, 3.93, 4.37],
    [StatType.ELEMENTAL_MASTERY]: [9.79, 11.19, 12.59, 13.99],
    [StatType.ENERGY_RECHARGE]: [2.72, 3.11, 3.5, 3.89],
    [StatType.CRIT_RATE]: [1.63, 1.86, 2.1, 2.33],
    [StatType.CRIT_DMG]: [3.26, 3.73, 4.2, 4.66],
    [StatType.PYRO_DMG]: undefined,
    [StatType.HYDRO_DMG]: undefined,
    [StatType.ELECTRO_DMG]: undefined,
    [StatType.CRYO_DMG]: undefined,
    [StatType.ANEMO_DMG]: undefined,
    [StatType.GEO_DMG]: undefined,
    [StatType.DENDRO_DMG]: undefined,
    [StatType.PHYSICAL_DMG]: undefined,
    [StatType.HEALING_BONUS]: undefined
  },
  4: {
    [StatType.FLAT_HP]: [167.3, 191.2, 215.1, 239],
    [StatType.FLAT_ATK]: [10.89, 12.45, 14, 15.56],
    [StatType.FLAT_DEF]: [12.96, 14.82, 16.67, 18.52],
    [StatType.HP_PERCENT]: [3.26, 3.73, 4.2, 4.66],
    [StatType.ATK_PERCENT]: [3.26, 3.73, 4.2, 4.66],
    [StatType.DEF_PERCENT]: [4.08, 4.66, 5.25, 5.83],
    [StatType.ELEMENTAL_MASTERY]: [13.06, 14.92, 16.79, 18.65],
    [StatType.ENERGY_RECHARGE]: [3.63, 4.14, 4.66, 5.18],
    [StatType.CRIT_RATE]: [2.18, 2.49, 2.8, 3.11],
    [StatType.CRIT_DMG]: [4.35, 4.97, 5.6, 6.22],
    [StatType.PYRO_DMG]: undefined,
    [StatType.HYDRO_DMG]: undefined,
    [StatType.ELECTRO_DMG]: undefined,
    [StatType.CRYO_DMG]: undefined,
    [StatType.ANEMO_DMG]: undefined,
    [StatType.GEO_DMG]: undefined,
    [StatType.DENDRO_DMG]: undefined,
    [StatType.PHYSICAL_DMG]: undefined,
    [StatType.HEALING_BONUS]: undefined
  },
  5: {
    [StatType.FLAT_HP]: [209.13, 239.0, 268.88, 298.75],
    [StatType.FLAT_ATK]: [13.62, 15.56, 17.51, 19.45],
    [StatType.FLAT_DEF]: [16.2, 18.52, 20.83, 23.15],
    [StatType.HP_PERCENT]: [4.08, 4.66, 5.25, 5.83],
    [StatType.ATK_PERCENT]: [4.08, 4.66, 5.25, 5.83],
    [StatType.DEF_PERCENT]: [5.1, 5.83, 6.56, 7.29],
    [StatType.ELEMENTAL_MASTERY]: [16.32, 18.65, 20.98, 23.31],
    [StatType.ENERGY_RECHARGE]: [4.53, 5.18, 5.83, 6.48],
    [StatType.CRIT_RATE]: [2.72, 3.11, 3.5, 3.89],
    [StatType.CRIT_DMG]: [5.44, 6.22, 6.99, 7.77],
    [StatType.PYRO_DMG]: undefined,
    [StatType.HYDRO_DMG]: undefined,
    [StatType.ELECTRO_DMG]: undefined,
    [StatType.CRYO_DMG]: undefined,
    [StatType.ANEMO_DMG]: undefined,
    [StatType.GEO_DMG]: undefined,
    [StatType.DENDRO_DMG]: undefined,
    [StatType.PHYSICAL_DMG]: undefined,
    [StatType.HEALING_BONUS]: undefined
  }
};

export const UPGRADE_MILESTONES_BY_RARITY: Record<ArtifactRarity, readonly ArtifactLevel[]> = {
  2: [4],
  3: [4, 8, 12],
  4: [4, 8, 12, 16],
  5: [4, 8, 12, 16, 20]
};
