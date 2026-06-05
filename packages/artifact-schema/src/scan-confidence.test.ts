import { describe, expect, it } from "vitest";
import { assessScannerResultTrust } from "./scan-confidence";
import { ScannerArtifactResult } from "./types";

function scannerResult(overrides: Partial<ScannerArtifactResult> = {}): ScannerArtifactResult {
  return {
    source: "fixture",
    mode: "screenshot-artifact",
    confidence: {
      setKey: 0.93,
      slotKey: 0.95,
      mainStatKey: 0.48,
      level: 0,
      substats: 0.8,
      lock: 0.98,
      equipped: 0.75,
      location: 0.75
    },
    artifact: {
      setKey: "CelestialGift",
      slotKey: "flower",
      rarity: 5,
      level: 20,
      mainStatKey: "hp",
      substats: [
        { key: "critRate_", value: 10.5 },
        { key: "enerRech_", value: 6.5 }
      ],
      unactivatedSubstats: [],
      lock: true,
      location: ""
    },
    capture: {
      resolution: "1920x1200",
      capturedAt: "2026-06-04T00:00:00.000Z",
      layout: "bag-inventory-card"
    },
    ...overrides
  };
}

describe("scanner confidence trust policy", () => {
  it("allows evaluation for sample screenshot confidence while still recommending OCR review", () => {
    const assessment = assessScannerResultTrust(scannerResult());

    expect(assessment.canEvaluate).toBe(true);
    expect(assessment.reviewRecommended).toBe(true);
    expect(assessment.blockingReasons).toEqual([]);
    expect(assessment.warningMessages.some((message) => message.includes("mainStatKey"))).toBe(true);
  });

  it("blocks evaluation when scanner returns no artifact", () => {
    const assessment = assessScannerResultTrust(scannerResult({ artifact: null, error: "No artifact panel detected." }));

    expect(assessment.canEvaluate).toBe(false);
    expect(assessment.blockingReasons).toContain("No artifact panel detected.");
    expect(assessment.blockingReasons).toContain("Scanner did not return artifact data.");
  });

  it("blocks evaluation when screen state is not ready for artifact OCR", () => {
    const assessment = assessScannerResultTrust(
      scannerResult({
        mode: "screen-classification",
        artifact: null,
        screenState: {
          code: "artifact-bag-grid",
          readyForArtifactOcr: false,
          confidence: 0.92,
          message: "Artifact inventory grid detected, but no artifact detail panel is visible."
        }
      })
    );

    expect(assessment.canEvaluate).toBe(false);
    expect(assessment.blockingReasons).toContain("Artifact inventory grid detected, but no artifact detail panel is visible.");
  });

  it("blocks evaluation when required field confidence is severely low", () => {
    const assessment = assessScannerResultTrust(
      scannerResult({
        confidence: {
          setKey: 0.2,
          slotKey: 0.95,
          mainStatKey: 0.48,
          substats: 0.8
        }
      })
    );

    expect(assessment.canEvaluate).toBe(false);
    expect(assessment.blockingReasons).toContain("Scanner confidence for setKey is too low (20.0%).");
  });
});
