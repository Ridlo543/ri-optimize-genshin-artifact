import { describe, expect, it } from "vitest";
import { isNormalizedScanRegion } from "./scan-region";

describe("scan region schema", () => {
  it("accepts normalized client regions inside bounds", () => {
    expect(isNormalizedScanRegion({ x: 0.68, y: 0.1, width: 0.27, height: 0.8, unit: "normalized-client" })).toBe(true);
  });

  it("rejects regions outside normalized client bounds", () => {
    expect(isNormalizedScanRegion({ x: 0.9, y: 0.1, width: 0.2, height: 0.8, unit: "normalized-client" })).toBe(false);
  });

  it("rejects unknown units", () => {
    expect(isNormalizedScanRegion({ x: 0, y: 0, width: 1, height: 1, unit: "screen-pixels" })).toBe(false);
  });
});
