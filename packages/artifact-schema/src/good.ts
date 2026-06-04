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

  if (!isArtifactLevel(good.level)) {
    return {
      artifact: null,
      warnings,
      skipReason: `Artifact level ${good.level} is outside supported range 0..20.`
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
