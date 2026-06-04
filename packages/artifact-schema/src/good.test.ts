import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractGoodArtifacts, goodArtifactToArtifactInput, normalizeGoodArtifact } from "./good";
import { ArtifactPiece, GoodArtifact, StatType } from "./types";

const fixturePath = fileURLToPath(new URL("../../../data/fixtures/good/artifact-samples.json", import.meta.url));
const artifactFixturesRoot = fileURLToPath(new URL("../../../data/fixtures/artifacts/", import.meta.url));

function loadFixtureArtifacts(): GoodArtifact[] {
  return extractGoodArtifacts(JSON.parse(readFileSync(fixturePath, "utf8")));
}

function plumeArtifact(overrides: Partial<GoodArtifact> = {}): GoodArtifact {
  return {
    setKey: "TestSet",
    slotKey: "plume",
    rarity: 5,
    level: 0,
    mainStatKey: "atk",
    substats: [
      { key: "critRate_", value: 3.9 },
      { key: "critDMG_", value: 7 },
      { key: "hp", value: 209 }
    ],
    unactivatedSubstats: [],
    ...overrides
  };
}

describe("GOOD artifact import", () => {
  it("extracts selected GOOD fixture artifacts without reading the full export", () => {
    const artifacts = loadFixtureArtifacts();

    expect(artifacts).toHaveLength(10);
    expect(artifacts[0]?.id).toBe("artifact_1441");
  });

  it("drops blank placeholder substats before mapping into ArtifactInput", () => {
    const placeholder = loadFixtureArtifacts().find((artifact) => artifact.id === "artifact_2087");
    expect(placeholder).toBeDefined();

    const normalized = normalizeGoodArtifact(placeholder!);
    const artifact = goodArtifactToArtifactInput(placeholder!);

    expect(normalized.warnings).toHaveLength(4);
    expect(normalized.artifact?.substats).toHaveLength(3);
    expect(normalized.artifact?.unactivatedSubstats).toEqual([{ key: "hp", value: 209 }]);
    expect(artifact.substats).toHaveLength(4);
    expect(artifact.substats.filter((substat) => substat.active)).toHaveLength(3);
    expect(artifact.substats.find((substat) => !substat.active)?.stat).toBe(StatType.FLAT_HP);
  });

  it("preserves one real unactivated substat as inactive known input", () => {
    const withInactive = loadFixtureArtifacts().find((artifact) => artifact.id === "artifact_2260");
    expect(withInactive).toBeDefined();

    const artifact = goodArtifactToArtifactInput(withInactive!);

    expect(artifact.piece).toBe(ArtifactPiece.GOBLET);
    expect(artifact.substats.find((substat) => !substat.active)).toMatchObject({
      stat: StatType.CRIT_DMG,
      value: 7.8,
      source: "UNACTIVATED"
    });
  });

  it.each([6, 9, 10, 17])("accepts non-milestone level +%i from GOOD exports", (level) => {
    const artifact = goodArtifactToArtifactInput(plumeArtifact({ level }));

    expect(artifact.level).toBe(level);
  });

  it("rejects artifacts outside the 0..20 level range during normalization", () => {
    const normalized = normalizeGoodArtifact(plumeArtifact({ level: 21 }));

    expect(normalized.artifact).toBeNull();
    expect(normalized.skipReason).toContain("outside supported range");
  });

  it("rejects multiple real unactivated substats instead of guessing which one is visible", () => {
    const normalized = normalizeGoodArtifact(
      plumeArtifact({
        unactivatedSubstats: [
          { key: "atk_", value: 4.1 },
          { key: "def_", value: 5.8 }
        ]
      })
    );

    expect(normalized.artifact).toBeNull();
    expect(normalized.skipReason).toContain("Multiple real unactivated");
  });

  it.each([
    "artifact0",
    "artifact1000",
    "artifact1021",
    "artifact1027",
    "artifact1035",
    "artifact1042",
    "artifact1066",
    "artifact1082",
    "artifact1743",
    "artifact513"
  ])("maps fixture %s artifact.json into internal artifact input", (fixtureName) => {
    const artifact = JSON.parse(readFileSync(`${artifactFixturesRoot}/${fixtureName}/artifact.json`, "utf8")) as GoodArtifact;
    const mapped = goodArtifactToArtifactInput(artifact);

    expect(mapped.piece).toBeDefined();
    expect(mapped.mainStat).toBeDefined();
    expect(mapped.level).toBeGreaterThanOrEqual(0);
    expect(mapped.level).toBeLessThanOrEqual(20);
    expect(mapped.substats.length).toBeGreaterThan(0);
  });
});
