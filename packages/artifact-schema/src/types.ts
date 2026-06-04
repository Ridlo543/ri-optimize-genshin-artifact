export enum StatType {
  FLAT_HP = "FLAT_HP",
  FLAT_ATK = "FLAT_ATK",
  FLAT_DEF = "FLAT_DEF",
  HP_PERCENT = "HP_PERCENT",
  ATK_PERCENT = "ATK_PERCENT",
  DEF_PERCENT = "DEF_PERCENT",
  ELEMENTAL_MASTERY = "ELEMENTAL_MASTERY",
  ENERGY_RECHARGE = "ENERGY_RECHARGE",
  CRIT_RATE = "CRIT_RATE",
  CRIT_DMG = "CRIT_DMG",
  PYRO_DMG = "PYRO_DMG",
  HYDRO_DMG = "HYDRO_DMG",
  ELECTRO_DMG = "ELECTRO_DMG",
  CRYO_DMG = "CRYO_DMG",
  ANEMO_DMG = "ANEMO_DMG",
  GEO_DMG = "GEO_DMG",
  DENDRO_DMG = "DENDRO_DMG",
  PHYSICAL_DMG = "PHYSICAL_DMG",
  HEALING_BONUS = "HEALING_BONUS"
}

export enum ArtifactPiece {
  FLOWER = "FLOWER",
  FEATHER = "FEATHER",
  SANDS = "SANDS",
  GOBLET = "GOBLET",
  CIRCLET = "CIRCLET"
}

export type ArtifactLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;
export type ArtifactRarity = 3 | 4 | 5;

export interface SubstatInput {
  stat: StatType;
  value: number;
  active: boolean;
  source?: "VISIBLE" | "UNACTIVATED" | "SIMULATED";
}

export interface ArtifactInput {
  id?: string;
  setName?: string;
  piece: ArtifactPiece;
  rarity: ArtifactRarity;
  level: ArtifactLevel;
  mainStat: StatType;
  substats: SubstatInput[];
  source?: "DOMAIN" | "BOSS" | "STRONGBOX" | "RELIQUARY" | "UNKNOWN";
  lock?: boolean;
  location?: string;
}

export interface GoodSubstat {
  key: string;
  value: number;
}

export interface GoodArtifact {
  id?: string | number;
  setKey?: string;
  slotKey: string;
  rarity: number;
  level: number;
  mainStatKey: string;
  substats: GoodSubstat[];
  unactivatedSubstats?: GoodSubstat[];
  lock?: boolean;
  location?: string;
}

export interface ScanConfidence {
  setKey?: number;
  slotKey?: number;
  mainStatKey?: number;
  level?: number;
  substats?: number;
  lock?: number;
  equipped?: number;
  location?: number;
}

export interface ScannerCapture {
  resolution: string;
  capturedAt: string;
  artifactPanelImagePath?: string;
}

export interface ScannerArtifactResult {
  source: "screen" | "fixture";
  mode: "visible-artifact";
  confidence: ScanConfidence;
  artifact: GoodArtifact | null;
  capture: ScannerCapture;
  error?: string;
}
