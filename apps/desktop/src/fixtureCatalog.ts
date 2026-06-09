import { GoodArtifact, ScanRegion, ScannerArtifactResult } from "@ri-genshin/artifact-schema";

export type FixturePlaygroundKey =
  | "character-plus20"
  | "character-unactivated"
  | "bag-plus20"
  | "bag-royal-unactivated"
  | "bag-4star"
  | "bag-3star"
  | "bag-2star";

export interface FixturePlaygroundEntry {
  key: FixturePlaygroundKey;
  label: string;
  fileName: string;
  imageUrl: string;
  region: ScanRegion;
  fallbackArtifact: GoodArtifact;
}

declare const __RI_REPO_ROOT__: string;

export const CHARACTER_PANEL_REGION: ScanRegion = {
  x: 0.75625,
  y: 0.075,
  width: 0.2427083333,
  height: 0.8333333333,
  unit: "normalized-client"
};

export const BAG_CARD_REGION: ScanRegion = {
  x: 0.68125,
  y: 0.1,
  width: 0.2572916667,
  height: 0.8016666667,
  unit: "normalized-client"
};

export const FIXTURE_PLAYGROUND_ENTRIES: FixturePlaygroundEntry[] = [
  {
    key: "character-plus20",
    label: "Character +20",
    fileName: "character-detail-plus20.jpg",
    imageUrl: fixtureImageUrl("character-detail-plus20.jpg"),
    region: CHARACTER_PANEL_REGION,
    fallbackArtifact: {
      setKey: "CelestialGift",
      slotKey: "sands",
      rarity: 5,
      level: 20,
      mainStatKey: "atk_",
      substats: [
        { key: "enerRech_", value: 17.5 },
        { key: "critDMG_", value: 5.4 },
        { key: "eleMas", value: 44 },
        { key: "critRate_", value: 5.8 }
      ],
      unactivatedSubstats: [],
      lock: true,
      location: "Nicole"
    }
  },
  {
    key: "character-unactivated",
    label: "Character unactivated",
    fileName: "character-detail-unactivated.jpg",
    imageUrl: fixtureImageUrl("character-detail-unactivated.jpg"),
    region: CHARACTER_PANEL_REGION,
    fallbackArtifact: {
      setKey: "CelestialGift",
      slotKey: "sands",
      rarity: 5,
      level: 0,
      mainStatKey: "atk_",
      substats: [
        { key: "enerRech_", value: 4.5 },
        { key: "def", value: 19 },
        { key: "def_", value: 5.1 }
      ],
      unactivatedSubstats: [{ key: "critDMG_", value: 5.4 }],
      lock: true,
      location: ""
    }
  },
  {
    key: "bag-plus20",
    label: "Bag +20",
    fileName: "bag-card-plus20.png",
    imageUrl: fixtureImageUrl("bag-card-plus20.png"),
    region: BAG_CARD_REGION,
    fallbackArtifact: {
      setKey: "CelestialGift",
      slotKey: "flower",
      rarity: 5,
      level: 20,
      mainStatKey: "hp",
      substats: [
        { key: "critRate_", value: 10.5 },
        { key: "enerRech_", value: 6.5 },
        { key: "def", value: 23 },
        { key: "hp_", value: 16.3 }
      ],
      unactivatedSubstats: [],
      lock: true,
      location: ""
    }
  },
  {
    key: "bag-royal-unactivated",
    label: "Bag Royal unactivated",
    fileName: "bag-card-royal-unactivated.png",
    imageUrl: fixtureImageUrl("bag-card-royal-unactivated.png"),
    region: BAG_CARD_REGION,
    fallbackArtifact: {
      setKey: "NoblesseOblige",
      slotKey: "flower",
      rarity: 5,
      level: 0,
      mainStatKey: "hp",
      substats: [
        { key: "def", value: 23 },
        { key: "eleMas", value: 21 },
        { key: "critDMG_", value: 5.4 }
      ],
      unactivatedSubstats: [{ key: "enerRech_", value: 5.2 }],
      lock: true,
      location: ""
    }
  },
  {
    key: "bag-4star",
    label: "Bag 4-star",
    fileName: "bag-card-4star.png",
    imageUrl: fixtureImageUrl("bag-card-4star.png"),
    region: BAG_CARD_REGION,
    fallbackArtifact: {
      setKey: "Instructor",
      slotKey: "plume",
      rarity: 4,
      level: 0,
      mainStatKey: "atk",
      substats: [
        { key: "hp", value: 167 },
        { key: "eleMas", value: 17 }
      ],
      unactivatedSubstats: [],
      lock: true,
      location: ""
    }
  },
  {
    key: "bag-3star",
    label: "Bag 3-star",
    fileName: "bag-card-3star.png",
    imageUrl: fixtureImageUrl("bag-card-3star.png"),
    region: BAG_CARD_REGION,
    fallbackArtifact: {
      setKey: "TravelingDoctor",
      slotKey: "plume",
      rarity: 3,
      level: 0,
      mainStatKey: "atk",
      substats: [{ key: "atk_", value: 2.8 }],
      unactivatedSubstats: [],
      lock: false,
      location: "Xiangling"
    }
  },
  {
    key: "bag-2star",
    label: "Bag 2-star",
    fileName: "bag-card-2star.jpg",
    imageUrl: fixtureImageUrl("bag-card-2star.jpg"),
    region: BAG_CARD_REGION,
    fallbackArtifact: {
      setKey: "Adventurer",
      slotKey: "plume",
      rarity: 2,
      level: 0,
      mainStatKey: "atk",
      substats: [],
      unactivatedSubstats: [],
      lock: false,
      location: "Amber"
    }
  }
];

export function getFixturePlaygroundEntry(value: string | null): FixturePlaygroundEntry {
  return FIXTURE_PLAYGROUND_ENTRIES.find((entry) => entry.key === value) ?? FIXTURE_PLAYGROUND_ENTRIES[0]!;
}

export function createFixtureFallbackResult(entry: FixturePlaygroundEntry, region: ScanRegion): ScannerArtifactResult {
  return {
    source: "fixture",
    mode: "region-artifact",
    confidence: {
      setKey: 0.9,
      slotKey: 0.9,
      mainStatKey: 0.9,
      level: 0.9,
      substats: 0.9,
      lock: 0.9,
      equipped: entry.fallbackArtifact.location ? 0.9 : 0.75,
      location: entry.fallbackArtifact.location ? 0.9 : 0.75
    },
    artifact: entry.fallbackArtifact,
    screenState: {
      code: entry.key.startsWith("bag") ? "artifact-bag-detail" : "character-artifact-detail",
      readyForArtifactOcr: true,
      confidence: 0.9,
      message: "Fixture playground fallback result."
    },
    capture: {
      resolution: "1920x1200",
      capturedAt: new Date().toISOString(),
      layout: entry.key.startsWith("bag") ? "roi-bag-card" : "roi-character-panel",
      screenshotImagePath: entry.fileName,
      regionHash: `fixture-${entry.key}`,
      region
    }
  };
}

function fixtureImageUrl(fileName: string): string {
  const repoRoot = __RI_REPO_ROOT__.replaceAll("\\", "/").replace(/\/$/, "");
  return `/@fs/${repoRoot}/data/example/picture/${encodeURIComponent(fileName)}`;
}
