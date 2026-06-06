import { describe, expect, it } from "vitest";
import { isNormalizedScanRegion } from "@ri-genshin/artifact-schema";
import { placeAssistantBubble, overlapsRegion } from "./assistantBubblePlacement";
import { BAG_CARD_REGION, CHARACTER_PANEL_REGION, FIXTURE_PLAYGROUND_ENTRIES } from "./fixtureCatalog";

describe("fixture playground catalog", () => {
  it("uses valid normalized-client regions", () => {
    for (const fixture of FIXTURE_PLAYGROUND_ENTRIES) {
      expect(isNormalizedScanRegion(fixture.region), fixture.key).toBe(true);
    }
  });

  it("includes low-rarity bag fixtures for offline scanner checks", () => {
    const byKey = new Map(FIXTURE_PLAYGROUND_ENTRIES.map((fixture) => [fixture.key, fixture]));

    expect(byKey.get("bag-2star")?.fallbackArtifact).toMatchObject({
      setKey: "Adventurer",
      rarity: 2,
      substats: []
    });
    expect(byKey.get("bag-3star")?.fallbackArtifact).toMatchObject({
      setKey: "TravelingDoctor",
      rarity: 3,
      substats: [{ key: "atk_", value: 2.8 }]
    });
  });

  it("places expanded bubble away from character panel ROI", () => {
    const viewport = { width: 1920, height: 1200 };
    const placement = placeAssistantBubble(CHARACTER_PANEL_REGION, viewport, { width: 340, height: 260 });

    expect(placement.side).toBe("left");
    expect(overlapsRegion(placement, CHARACTER_PANEL_REGION, viewport)).toBe(false);
  });

  it("places expanded bubble away from bag card ROI", () => {
    const viewport = { width: 1920, height: 1200 };
    const placement = placeAssistantBubble(BAG_CARD_REGION, viewport, { width: 340, height: 260 });

    expect(placement.side).toBe("left");
    expect(overlapsRegion(placement, BAG_CARD_REGION, viewport)).toBe(false);
  });
});
