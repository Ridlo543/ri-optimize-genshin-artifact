import { describe, expect, it } from "vitest";
import { ScanRegion } from "@ri-genshin/artifact-schema";
import { resizeRegion } from "./RoiEditor";

const region: ScanRegion = {
  x: 0.6,
  y: 0.1,
  width: 0.3,
  height: 0.8,
  unit: "normalized-client"
};

describe("resizeRegion", () => {
  it.each([
    ["nw", -0.1, -0.05, { x: 0.5, y: 0.05, width: 0.4, height: 0.85 }],
    ["ne", 0.05, 0.05, { x: 0.6, y: 0.15, width: 0.35, height: 0.75 }],
    ["sw", -0.1, 0.05, { x: 0.5, y: 0.1, width: 0.4, height: 0.85 }],
    ["se", 0.05, 0.05, { x: 0.6, y: 0.1, width: 0.35, height: 0.85 }]
  ] as const)("resizes from the %s handle", (mode, dx, dy, expected) => {
    expect(resizeRegion(region, mode, dx, dy)).toMatchObject(expected);
  });

  it("moves and clamps the ROI inside normalized bounds", () => {
    expect(resizeRegion(region, "move", 0.5, -0.5)).toMatchObject({
      x: 0.7,
      y: 0,
      width: 0.3,
      height: 0.8
    });
  });

  it("keeps resize handles above the minimum region size", () => {
    expect(resizeRegion(region, "se", -1, -1)).toMatchObject({
      width: 0.05,
      height: 0.05
    });
  });
});
