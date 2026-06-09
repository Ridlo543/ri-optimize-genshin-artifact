import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ArtifactInput, ArtifactPiece, extractGoodArtifacts, StatType } from "@ri-genshin/artifact-schema";
import { evaluateGoodArtifactBatch } from "./batch";
import { getAvailableMinorAffixes, getNewSubstatDistribution, getRemainingMilestones, getRollValues } from "./distribution";
import { evaluateArtifactExact } from "./exact";
import { GENERIC_DPS_CRIT_PROFILE } from "./profiles";
import { calculateCV } from "./scoring";
import { validateArtifact } from "./validation";

const fixturePath = fileURLToPath(new URL("../../../data/fixtures/good/artifact-samples.json", import.meta.url));

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

    expect(result.activeCritValue).toBeCloseTo(7);
    expect(result.knownCritValue).toBeCloseTo(13.2);
    expect(result.currentCV).toBeCloseTo(result.knownCritValue);
    expect(result.probabilityByTargetRollCount[0]).toBeCloseTo(0.0625, 8);
    expect(result.probabilityByTargetRollCount[1]).toBeCloseTo(0.25, 8);
    expect(result.probabilityByTargetRollCount[2]).toBeCloseTo(0.375, 8);
    expect(result.probabilityByTargetRollCount[3]).toBeCloseTo(0.25, 8);
    expect(result.probabilityByTargetRollCount[4]).toBeCloseTo(0.0625, 8);
  });

  it("reports auditable profile metrics and normalized useful roll value", () => {
    const artifact = baseArtifact({
      substats: [
        { stat: StatType.CRIT_RATE, value: 3.89, active: true },
        { stat: StatType.CRIT_DMG, value: 7.77, active: true },
        { stat: StatType.ATK_PERCENT, value: 5.83, active: true }
      ]
    });

    const result = evaluateArtifactExact(artifact, GENERIC_DPS_CRIT_PROFILE);

    expect(result.activeCritValue).toBeCloseTo(15.55);
    expect(result.knownCritValue).toBe(result.activeCritValue);
    expect(result.usefulRollValue).toBeCloseTo(2.65, 2);
    expect(result.profileContext).toMatchObject({
      id: "generic-dps-crit",
      name: "Crit Potential",
      mainStatFit: "not-evaluated",
      setFit: "not-evaluated"
    });
    expect(result.modelVersion).toBe("artifact-exact-v3");
    expect(result.probabilityReachProfileTarget).toBeGreaterThanOrEqual(0);
    expect(result.probabilityReachProfileTarget).toBeLessThanOrEqual(1);
  });

  it("keeps exact outcome probability normalized", () => {
    const outcomes = evaluateArtifactExact(baseArtifact(), GENERIC_DPS_CRIT_PROFILE);
    const total = Object.values(outcomes.probabilityByTargetRollCount).reduce((sum, probability) => sum + probability, 0);

    expect(total).toBeCloseTo(1, 8);
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

  it("calculates remaining milestones from non-milestone levels", () => {
    expect(getRemainingMilestones(17)).toEqual([20]);
    expect(getRemainingMilestones(9)).toEqual([12, 16, 20]);
    expect(getRemainingMilestones(6)).toEqual([8, 12, 16, 20]);
    expect(getRemainingMilestones(1, 2)).toEqual([4]);
    expect(getRemainingMilestones(9, 3)).toEqual([12]);
    expect(getRemainingMilestones(10, 4)).toEqual([12, 16]);
  });

  it("uses rarity-specific minor roll tables", () => {
    expect(getRollValues(StatType.CRIT_RATE, 2)).toHaveLength(3);
    expect(getRollValues(StatType.CRIT_RATE, 3)).toEqual([1.63, 1.86, 2.1, 2.33]);
    expect(getRollValues(StatType.CRIT_DMG, 4)).toEqual([4.35, 4.97, 5.6, 6.22]);
  });

  it("evaluates low-rarity artifacts instead of skipping them as unsupported", () => {
    const twoStar = baseArtifact({
      piece: ArtifactPiece.FEATHER,
      rarity: 2,
      level: 0,
      mainStat: StatType.FLAT_ATK,
      substats: []
    });
    const threeStar = baseArtifact({
      piece: ArtifactPiece.FEATHER,
      rarity: 3,
      level: 0,
      mainStat: StatType.FLAT_ATK,
      substats: [{ stat: StatType.ATK_PERCENT, value: 2.8, active: true }]
    });

    expect(evaluateArtifactExact(twoStar, GENERIC_DPS_CRIT_PROFILE).recommendation.label).toBe("LOW_RARITY_FODDER");
    expect(evaluateArtifactExact(threeStar, GENERIC_DPS_CRIT_PROFILE).recommendation.label).toBe("LOW_RARITY_FODDER");
  });

  it("rejects artifacts above the rarity-specific max level", () => {
    const result = validateArtifact(baseArtifact({ rarity: 4, level: 17 }));

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("at most +16");
  });

  it("evaluates supported GOOD fixture artifacts and reports skipped artifacts with reasons", () => {
    const payload = JSON.parse(readFileSync(fixturePath, "utf8"));
    const artifacts = extractGoodArtifacts(payload);
    const batch = evaluateGoodArtifactBatch(artifacts, GENERIC_DPS_CRIT_PROFILE);

    expect(batch.summary.total).toBe(10);
    expect(batch.evaluated.length).toBeGreaterThan(0);
    expect(batch.skipped.length).toBe(0);
    expect(batch.summary.warningCount).toBeGreaterThan(0);
    expect(batch.evaluated.some((item) => item.id === "artifact_2087")).toBe(true);
    expect(batch.evaluated.some((item) => item.artifact.rarity === 4)).toBe(true);
    expect(batch.skipped.some((item) => item.reason.includes("MVP supports 5-star artifacts only"))).toBe(false);
  });
});
