import { ArtifactInput, ArtifactLevel, ArtifactPiece, ArtifactRarity, GoodArtifact, GoodSubstat, StatType } from "./types";

export const GOOD_STAT_TO_STAT_TYPE: Record<string, StatType> = {
  hp: StatType.FLAT_HP,
  atk: StatType.FLAT_ATK,
  def: StatType.FLAT_DEF,
  hp_: StatType.HP_PERCENT,
  atk_: StatType.ATK_PERCENT,
  def_: StatType.DEF_PERCENT,
  eleMas: StatType.ELEMENTAL_MASTERY,
  enerRech_: StatType.ENERGY_RECHARGE,
  critRate_: StatType.CRIT_RATE,
  critDMG_: StatType.CRIT_DMG,
  pyro_dmg_: StatType.PYRO_DMG,
  hydro_dmg_: StatType.HYDRO_DMG,
  electro_dmg_: StatType.ELECTRO_DMG,
  cryo_dmg_: StatType.CRYO_DMG,
  anemo_dmg_: StatType.ANEMO_DMG,
  geo_dmg_: StatType.GEO_DMG,
  dendro_dmg_: StatType.DENDRO_DMG,
  physical_dmg_: StatType.PHYSICAL_DMG,
  heal_: StatType.HEALING_BONUS
};

export const STAT_TYPE_TO_GOOD_STAT: Record<StatType, string> = Object.fromEntries(
  Object.entries(GOOD_STAT_TO_STAT_TYPE).map(([goodKey, stat]) => [stat, goodKey])
) as Record<StatType, string>;

export const GOOD_SLOT_TO_ARTIFACT_PIECE: Record<string, ArtifactPiece> = {
  flower: ArtifactPiece.FLOWER,
  plume: ArtifactPiece.FEATHER,
  sands: ArtifactPiece.SANDS,
  goblet: ArtifactPiece.GOBLET,
  circlet: ArtifactPiece.CIRCLET
};

export const ARTIFACT_PIECE_TO_GOOD_SLOT: Record<ArtifactPiece, string> = Object.fromEntries(
  Object.entries(GOOD_SLOT_TO_ARTIFACT_PIECE).map(([slot, piece]) => [piece, slot])
) as Record<ArtifactPiece, string>;

export function mapGoodStatKey(key: string): StatType {
  const stat = GOOD_STAT_TO_STAT_TYPE[key];
  if (!stat) {
    throw new Error(`Unsupported GOOD stat key: ${key}`);
  }
  return stat;
}

export function mapGoodSlotKey(key: string): ArtifactPiece {
  const piece = GOOD_SLOT_TO_ARTIFACT_PIECE[key];
  if (!piece) {
    throw new Error(`Unsupported GOOD slot key: ${key}`);
  }
  return piece;
}

export function goodArtifactToArtifactInput(good: GoodArtifact): ArtifactInput {
  const rarity = good.rarity as ArtifactRarity;
  const level = good.level as ArtifactLevel;
  const activeSubstats = good.substats.map((substat) => goodSubstatToInput(substat, true));
  const inactiveSubstats = (good.unactivatedSubstats ?? []).map((substat) => goodSubstatToInput(substat, false));

  const artifact: ArtifactInput = {
    piece: mapGoodSlotKey(good.slotKey),
    rarity,
    level,
    mainStat: mapGoodStatKey(good.mainStatKey),
    substats: [...activeSubstats, ...inactiveSubstats]
  };

  if (good.setKey !== undefined) {
    artifact.setName = good.setKey;
  }
  if (good.lock !== undefined) {
    artifact.lock = good.lock;
  }
  if (good.location !== undefined) {
    artifact.location = good.location;
  }

  return artifact;
}

function goodSubstatToInput(substat: GoodSubstat, active: boolean) {
  return {
    stat: mapGoodStatKey(substat.key),
    value: substat.value,
    active,
    source: active ? "VISIBLE" as const : "UNACTIVATED" as const
  };
}
