import { ScannerArtifactResult } from "@ri-genshin/artifact-schema";

export const IDLE_SCAN_RESULT: ScannerArtifactResult = {
  source: "screen",
  mode: "region-classification",
  confidence: {},
  artifact: null,
  screenState: {
    code: "game-not-found",
    readyForArtifactOcr: false,
    confidence: 0,
    message: "No analysis has run yet. Open Genshin, set the ROI, then click Analyze."
  },
  capture: {
    resolution: "unknown",
    capturedAt: new Date().toISOString()
  }
};

export const SAMPLE_SCAN_RESULT: ScannerArtifactResult = {
  source: "fixture",
  mode: "visible-artifact",
  confidence: {
    setKey: 0.95,
    slotKey: 0.98,
    mainStatKey: 0.96,
    level: 0.97,
    substats: 0.94,
    lock: 0.95,
    equipped: 0.9,
    location: 0.9
  },
  artifact: {
    setKey: "HuskOfOpulentDreams",
    slotKey: "goblet",
    rarity: 5,
    level: 0,
    mainStatKey: "def_",
    substats: [
      { key: "critDMG_", value: 7.0 },
      { key: "eleMas", value: 23 },
      { key: "def", value: 23 }
    ],
    unactivatedSubstats: [{ key: "critRate_", value: 3.1 }],
    lock: false,
    location: ""
  },
  capture: {
    resolution: "fixture",
    capturedAt: new Date().toISOString()
  }
};
