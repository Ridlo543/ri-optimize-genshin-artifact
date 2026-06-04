import { ArtifactPiece, StatType } from "@ri-genshin/artifact-schema";

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

export const MINOR_ROLL_VALUES_5_STAR: Record<StatType, number[] | undefined> = {
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
};

export const UPGRADE_MILESTONES = [4, 8, 12, 16, 20] as const;
