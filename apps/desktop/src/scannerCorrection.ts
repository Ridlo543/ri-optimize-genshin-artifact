import { GoodArtifact, ScannerArtifactResult } from "@ri-genshin/artifact-schema";

export const ARTIFACT_LEVEL_OPTIONS = Array.from({ length: 21 }, (_, level) => level);
export const ARTIFACT_SLOT_OPTIONS = ["flower", "plume", "sands", "goblet", "circlet"] as const;
export const ARTIFACT_MAIN_STAT_OPTIONS = [
  "hp",
  "atk",
  "hp_",
  "atk_",
  "def_",
  "eleMas",
  "enerRech_",
  "critRate_",
  "critDMG_",
  "pyro_dmg_",
  "hydro_dmg_",
  "electro_dmg_",
  "cryo_dmg_",
  "anemo_dmg_",
  "geo_dmg_",
  "dendro_dmg_",
  "physical_dmg_",
  "heal_"
] as const;

export type ArtifactSlotCorrection = (typeof ARTIFACT_SLOT_OPTIONS)[number];
export type ArtifactMainStatCorrection = (typeof ARTIFACT_MAIN_STAT_OPTIONS)[number];
export type ArtifactSlotCorrectionSelection = ArtifactSlotCorrection | "";
export type ArtifactMainStatCorrectionSelection = ArtifactMainStatCorrection | "";

const MAIN_STATS_BY_SLOT: Record<ArtifactSlotCorrection, readonly ArtifactMainStatCorrection[]> = {
  flower: ["hp"],
  plume: ["atk"],
  sands: ["hp_", "atk_", "def_", "eleMas", "enerRech_"],
  goblet: [
    "hp_",
    "atk_",
    "def_",
    "eleMas",
    "pyro_dmg_",
    "hydro_dmg_",
    "electro_dmg_",
    "cryo_dmg_",
    "anemo_dmg_",
    "geo_dmg_",
    "dendro_dmg_",
    "physical_dmg_"
  ],
  circlet: ["hp_", "atk_", "def_", "eleMas", "critRate_", "critDMG_", "heal_"]
};

export interface LevelCorrectionState {
  available: boolean;
  reason: string;
}

export interface ScannerCorrectionState {
  available: boolean;
  reason: string;
  missingFields: string[];
  needsLevel: boolean;
  needsSlotKey: boolean;
  needsMainStatKey: boolean;
}

export interface ScannerCorrections {
  level?: number;
  slotKey?: ArtifactSlotCorrectionSelection;
  mainStatKey?: ArtifactMainStatCorrectionSelection;
}

export function getLevelCorrectionState(result: ScannerArtifactResult | null): LevelCorrectionState {
  const correction = getScannerCorrectionState(result);
  if (!correction.available || correction.missingFields.length !== 1 || !correction.needsLevel) {
    return { available: false, reason: correction.reason };
  }

  return {
    available: true,
    reason: "Level OCR failed. Choose the visible artifact level, then apply correction."
  };
}

export function getScannerCorrectionState(result: ScannerArtifactResult | null): ScannerCorrectionState {
  if (!result?.artifactDraft || result.artifact) {
    return unavailableCorrection("");
  }

  const missingFields = result.missingFields ?? [];
  const supportedMissingFields = new Set(["level", "slotKey", "mainStatKey"]);
  if (missingFields.length === 0 || missingFields.some((field) => !supportedMissingFields.has(field))) {
    return unavailableCorrection("");
  }

  const draft = result.artifactDraft;
  const missingDraftFields = [
    typeof draft.rarity === "number" ? "" : "rarity",
    Array.isArray(draft.substats) && draft.substats.length > 0 ? "" : "substats"
  ].filter(Boolean);

  if (missingDraftFields.length > 0) {
    return {
      available: false,
      reason: `Manual correction needs draft fields: ${missingDraftFields.join(", ")}.`,
      missingFields,
      needsLevel: missingFields.includes("level"),
      needsSlotKey: missingFields.includes("slotKey"),
      needsMainStatKey: missingFields.includes("mainStatKey")
    };
  }

  const labels = missingFields.map(friendlyMissingField).join(" and ");
  return {
    available: true,
    reason: `Review ${labels}. Choose the visible value, then apply correction.`,
    missingFields,
    needsLevel: missingFields.includes("level"),
    needsSlotKey: missingFields.includes("slotKey"),
    needsMainStatKey: missingFields.includes("mainStatKey")
  };
}

export function applyLevelCorrection(result: ScannerArtifactResult, level: number): ScannerArtifactResult {
  const correction = getLevelCorrectionState(result);
  if (!correction.available || !result.artifactDraft || !Number.isInteger(level) || level < 0 || level > 20) {
    return result;
  }

  return applyScannerCorrection(result, { level });
}

export function applyScannerCorrection(result: ScannerArtifactResult, corrections: ScannerCorrections): ScannerArtifactResult {
  const correction = getScannerCorrectionState(result);
  if (!correction.available || !result.artifactDraft) {
    return result;
  }

  const draft = result.artifactDraft;
  const level = draft.level ?? corrections.level;
  const slotKey = draft.slotKey ?? corrections.slotKey;
  const mainStatKey = draft.mainStatKey ?? corrections.mainStatKey;
  if (!isValidLevel(level) || !isValidSlot(slotKey) || !isValidMainStat(mainStatKey) || !isValidMainStatForSlot(slotKey, mainStatKey)) {
    return result;
  }

  const artifact: GoodArtifact = {
    ...(draft.id !== undefined ? { id: draft.id } : {}),
    ...(draft.setKey !== undefined ? { setKey: draft.setKey } : {}),
    slotKey,
    rarity: draft.rarity ?? 5,
    level,
    mainStatKey,
    substats: draft.substats ?? [],
    unactivatedSubstats: draft.unactivatedSubstats ?? [],
    lock: draft.lock ?? false,
    location: draft.location ?? ""
  };

  const { error: _error, ...resultWithoutError } = result;
  return {
    ...resultWithoutError,
    artifact,
    missingFields: [],
    confidence: {
      ...result.confidence,
      ...(correction.needsLevel ? { level: 1 } : {}),
      ...(correction.needsSlotKey ? { slotKey: 1 } : {}),
      ...(correction.needsMainStatKey ? { mainStatKey: 1 } : {})
    }
  };
}

export function getArtifactMainStatOptions(slotKey: ArtifactSlotCorrectionSelection): readonly ArtifactMainStatCorrection[] {
  if (!slotKey) {
    return [];
  }

  return MAIN_STATS_BY_SLOT[slotKey];
}

function unavailableCorrection(reason: string): ScannerCorrectionState {
  return {
    available: false,
    reason,
    missingFields: [],
    needsLevel: false,
    needsSlotKey: false,
    needsMainStatKey: false
  };
}

function friendlyMissingField(field: string): string {
  switch (field) {
    case "level":
      return "level";
    case "slotKey":
      return "artifact slot";
    case "mainStatKey":
      return "main stat";
    default:
      return field;
  }
}

function isValidLevel(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0 && value <= 20;
}

function isValidSlot(value: unknown): value is ArtifactSlotCorrection {
  return typeof value === "string" && ARTIFACT_SLOT_OPTIONS.includes(value as ArtifactSlotCorrection);
}

function isValidMainStat(value: unknown): value is ArtifactMainStatCorrection {
  return typeof value === "string" && ARTIFACT_MAIN_STAT_OPTIONS.includes(value as ArtifactMainStatCorrection);
}

function isValidMainStatForSlot(slotKey: ArtifactSlotCorrection, mainStatKey: ArtifactMainStatCorrection): boolean {
  return MAIN_STATS_BY_SLOT[slotKey].includes(mainStatKey);
}
