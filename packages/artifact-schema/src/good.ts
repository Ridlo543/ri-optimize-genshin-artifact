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

export const ARTIFACT_MAX_LEVEL_BY_RARITY: Record<ArtifactRarity, ArtifactLevel> = {
  2: 4,
  3: 12,
  4: 16,
  5: 20
};

export const STAT_TYPE_TO_LABEL: Record<StatType, string> = {
  [StatType.FLAT_HP]: "HP",
  [StatType.FLAT_ATK]: "ATK",
  [StatType.FLAT_DEF]: "DEF",
  [StatType.HP_PERCENT]: "HP%",
  [StatType.ATK_PERCENT]: "ATK%",
  [StatType.DEF_PERCENT]: "DEF%",
  [StatType.ELEMENTAL_MASTERY]: "Elemental Mastery",
  [StatType.ENERGY_RECHARGE]: "Energy Recharge",
  [StatType.CRIT_RATE]: "CRIT Rate",
  [StatType.CRIT_DMG]: "CRIT DMG",
  [StatType.PYRO_DMG]: "Pyro DMG",
  [StatType.HYDRO_DMG]: "Hydro DMG",
  [StatType.ELECTRO_DMG]: "Electro DMG",
  [StatType.CRYO_DMG]: "Cryo DMG",
  [StatType.ANEMO_DMG]: "Anemo DMG",
  [StatType.GEO_DMG]: "Geo DMG",
  [StatType.DENDRO_DMG]: "Dendro DMG",
  [StatType.PHYSICAL_DMG]: "Physical DMG",
  [StatType.HEALING_BONUS]: "Healing Bonus"
};

export const GOOD_STAT_KEY_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(GOOD_STAT_TO_STAT_TYPE).map(([key, stat]) => [key, STAT_TYPE_TO_LABEL[stat]])
) as Record<string, string>;

export const GOOD_SLOT_KEY_TO_LABEL: Record<string, string> = {
  flower: "Flower",
  plume: "Plume",
  sands: "Sands",
  goblet: "Goblet",
  circlet: "Circlet"
};

export const STAT_TYPE_IS_PERCENT: ReadonlySet<StatType> = new Set([
  StatType.HP_PERCENT,
  StatType.ATK_PERCENT,
  StatType.DEF_PERCENT,
  StatType.ENERGY_RECHARGE,
  StatType.CRIT_RATE,
  StatType.CRIT_DMG,
  StatType.PYRO_DMG,
  StatType.HYDRO_DMG,
  StatType.ELECTRO_DMG,
  StatType.CRYO_DMG,
  StatType.ANEMO_DMG,
  StatType.GEO_DMG,
  StatType.DENDRO_DMG,
  StatType.PHYSICAL_DMG,
  StatType.HEALING_BONUS
]);

export interface GoodImportPayload {
  artifacts?: GoodArtifact[];
  artifact?: GoodArtifact;
  samples?: Array<{ artifact?: GoodArtifact }>;
}

export interface GoodNormalizationWarning {
  code: string;
  message: string;
}

export interface GoodArtifactNormalizationResult {
  artifact: GoodArtifact | null;
  warnings: GoodNormalizationWarning[];
  skipReason?: string;
}

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

export function isArtifactLevel(level: number): level is ArtifactLevel {
  return Number.isInteger(level) && level >= 0 && level <= 20;
}

export function isArtifactRarity(rarity: number): rarity is ArtifactRarity {
  return Number.isInteger(rarity) && rarity >= 2 && rarity <= 5;
}

export function getMaxArtifactLevel(rarity: ArtifactRarity): ArtifactLevel {
  return ARTIFACT_MAX_LEVEL_BY_RARITY[rarity];
}

export function extractGoodArtifacts(payload: unknown): GoodArtifact[] {
  if (Array.isArray(payload)) {
    return payload.filter(isGoodArtifactLike);
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.artifacts)) {
    return payload.artifacts.filter(isGoodArtifactLike);
  }

  if (Array.isArray(payload.samples)) {
    return payload.samples
      .map((sample) => (isRecord(sample) ? sample.artifact : undefined))
      .filter(isGoodArtifactLike);
  }

  if (isGoodArtifactLike(payload.artifact)) {
    return [payload.artifact];
  }

  if (isGoodArtifactLike(payload)) {
    return [payload];
  }

  return [];
}

export function normalizeGoodArtifact(good: GoodArtifact): GoodArtifactNormalizationResult {
  const warnings: GoodNormalizationWarning[] = [];

  if (!isArtifactRarity(good.rarity)) {
    return {
      artifact: null,
      warnings,
      skipReason: `Artifact rarity ${good.rarity} is outside supported range 2..5.`
    };
  }

  if (!isArtifactLevel(good.level)) {
    return {
      artifact: null,
      warnings,
      skipReason: `Artifact level ${good.level} is outside supported range 0..20.`
    };
  }

  const maxLevel = getMaxArtifactLevel(good.rarity);
  if (good.level > maxLevel) {
    return {
      artifact: null,
      warnings,
      skipReason: `Artifact level ${good.level} exceeds max +${maxLevel} for ${good.rarity}-star artifacts.`
    };
  }

  const substats = filterSubstats(good.substats ?? [], "substats", warnings);
  const unactivatedSubstats = filterSubstats(good.unactivatedSubstats ?? [], "unactivatedSubstats", warnings);

  if (unactivatedSubstats.length > 1) {
    return {
      artifact: null,
      warnings,
      skipReason: "Multiple real unactivated substats are not supported."
    };
  }

  const normalized: GoodArtifact = {
    ...good,
    level: good.level,
    substats,
    unactivatedSubstats
  };

  return { artifact: normalized, warnings };
}

export function goodArtifactToArtifactInput(good: GoodArtifact): ArtifactInput {
  const normalized = normalizeGoodArtifact(good);
  if (!normalized.artifact) {
    throw new Error(normalized.skipReason ?? "Unable to normalize GOOD artifact.");
  }

  good = normalized.artifact;
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

function filterSubstats(
  substats: GoodSubstat[],
  fieldName: "substats" | "unactivatedSubstats",
  warnings: GoodNormalizationWarning[]
): GoodSubstat[] {
  const filtered: GoodSubstat[] = [];

  substats.forEach((substat, index) => {
    const key = substat.key.trim();
    const value = substat.value;
    if (key.length === 0 || !Number.isFinite(value) || value <= 0) {
      warnings.push({
        code: "dropped-placeholder-substat",
        message: `Dropped ${fieldName}[${index}] because it has an empty key or invalid value.`
      });
      return;
    }

    filtered.push({ key, value });
  });

  return filtered;
}

function goodSubstatToInput(substat: GoodSubstat, active: boolean) {
  return {
    stat: mapGoodStatKey(substat.key),
    value: substat.value,
    active,
    source: active ? "VISIBLE" as const : "UNACTIVATED" as const
  };
}

function isGoodArtifactLike(value: unknown): value is GoodArtifact {
  return (
    isRecord(value) &&
    typeof value.slotKey === "string" &&
    typeof value.mainStatKey === "string" &&
    typeof value.rarity === "number" &&
    typeof value.level === "number" &&
    Array.isArray(value.substats)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
