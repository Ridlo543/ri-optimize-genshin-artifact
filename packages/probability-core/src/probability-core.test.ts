import { describe, expect, it } from "vitest";
import { ArtifactInput, ArtifactPiece, StatType } from "@ri-genshin/artifact-schema";
import { getAvailableMinorAffixes, getNewSubstatDistribution } from "./distribution";
import { evaluateArtifactExact } from "./exact";
import { GENERIC_DPS_CRIT_PROFILE } from "./profiles";
import { calculateCV } from "./scoring";
import { validateArtifact } from "./validation";

function baseArtifact(overrides: Partial<ArtifactInput> = {}): ArtifactInput {
  return {
    piece: ArtifactPiece.GOBLET,
    rarity: 5,
    level: 0,
    mainStat: StatType.DEF_PERCENT,
    substats: [
      { stat: StatType.CRIT_DMG, value: 7.0, active: true, source: "VISIBLE" },
      { stat: StatType.ELEMENTAL_MASTERY, value: 23, active: true, source: "VISIBLE" },
      { stat: StatType.FLAT_DEF, value: 23, active: true, source: "VISIBLE" }
    ],
    ...overrides
  };
}

describe("artifact probability core", () => {
  it("rejects a substat that duplicates the main stat", () => {
    const result = validateArtifact(
      baseArtifact({
        substats: [
          { stat: StatType.DEF_PERCENT, value: 5.8, active: true },
          { stat: StatType.CRIT_DMG, value: 7, active: true }
        ]
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("duplicates the main stat");
  });

  it("excludes main stat and existing substats from available minor affixes", () => {
    const artifact = baseArtifact();
    const available = getAvailableMinorAffixes(artifact);

    expect(available).not.toContain(StatType.DEF_PERCENT);
    expect(available).not.toContain(StatType.CRIT_DMG);
    expect(available).not.toContain(StatType.ELEMENTAL_MASTERY);
    expect(available).not.toContain(StatType.FLAT_DEF);
    expect(available).toContain(StatType.CRIT_RATE);
  });

  it("computes weighted new substat probability", () => {
    const artifact = baseArtifact({
      piece: ArtifactPiece.FEATHER,
      mainStat: StatType.FLAT_ATK,
      substats: [
        { stat: StatType.ATK_PERCENT, value: 5.8, active: true },
        { stat: StatType.ENERGY_RECHARGE, value: 5.2, active: true },
        { stat: StatType.CRIT_RATE, value: 3.1, active: true }
      ]
    });
    const distribution = getNewSubstatDistribution(artifact);
    const critDmg = distribution.find((item) => item.stat === StatType.CRIT_DMG);

    expect(critDmg?.probability).toBeCloseTo(3 / 27, 8);
  });

  it("calculates CV", () => {
    expect(
      calculateCV([
        { stat: StatType.CRIT_RATE, value: 3.1, active: true },
        { stat: StatType.CRIT_DMG, value: 7.0, active: true }
      ])
    ).toBeCloseTo(13.2);
  });

  it("activates an unactivated substat at +4 without rolling a weighted new stat", () => {
    const artifact = baseArtifact({
      substats: [
        ...baseArtifact().substats,
        { stat: StatType.CRIT_RATE, value: 3.1, active: false, source: "UNACTIVATED" }
      ]
    });
    const result = evaluateArtifactExact(artifact, GENERIC_DPS_CRIT_PROFILE);

    expect(result.currentCV).toBeCloseTo(13.2);
    expect(result.probabilityByTargetRollCount[0]).toBeCloseTo(0.0625, 8);
    expect(result.probabilityByTargetRollCount[1]).toBeCloseTo(0.25, 8);
    expect(result.probabilityByTargetRollCount[2]).toBeCloseTo(0.375, 8);
    expect(result.probabilityByTargetRollCount[3]).toBeCloseTo(0.25, 8);
    expect(result.probabilityByTargetRollCount[4]).toBeCloseTo(0.0625, 8);
  });

  it("matches binomial target roll distribution for a 4-liner with 4 remaining upgrades", () => {
    const artifact = baseArtifact({
      level: 4,
      substats: [
        { stat: StatType.CRIT_RATE, value: 3.1, active: true },
        { stat: StatType.CRIT_DMG, value: 7.0, active: true },
        { stat: StatType.ATK_PERCENT, value: 5.8, active: true },
        { stat: StatType.FLAT_DEF, value: 23, active: true }
      ]
    });
    const result = evaluateArtifactExact(artifact, GENERIC_DPS_CRIT_PROFILE);

    expect(result.probabilityByTargetRollCount[0]).toBeCloseTo(0.0625, 8);
    expect(result.probabilityByTargetRollCount[1]).toBeCloseTo(0.25, 8);
    expect(result.probabilityByTargetRollCount[2]).toBeCloseTo(0.375, 8);
    expect(result.probabilityByTargetRollCount[3]).toBeCloseTo(0.25, 8);
    expect(result.probabilityByTargetRollCount[4]).toBeCloseTo(0.0625, 8);
  });
});
