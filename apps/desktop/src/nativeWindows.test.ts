import { describe, expect, it } from "vitest";
import { DEFAULT_REGION } from "./roi";
import { assistantWindowRect, assistantWindowRectFromCurrentWindow, scannerStatusRect } from "./nativeWindows";

describe("native physical window rectangles", () => {
  it("maps scanner client bounds to integer physical pixels", () => {
    expect(
      scannerStatusRect({
        available: true,
        screenX: 100.4,
        screenY: 50.6,
        clientWidth: 1919.8,
        clientHeight: 1199.7
      })
    ).toEqual({
      x: 100,
      y: 51,
      width: 1920,
      height: 1200
    });
  });

  it("places the expanded assistant inside the physical Genshin client", () => {
    const rect = assistantWindowRect(
      {
        available: true,
        screenX: 100,
        screenY: 50,
        clientWidth: 1920,
        clientHeight: 1200
      },
      DEFAULT_REGION,
      false,
      false
    );

    expect(rect.width).toBe(360);
    expect(rect.height).toBe(285);
    expect(rect.x).toBeGreaterThanOrEqual(100);
    expect(rect.y).toBeGreaterThanOrEqual(50);
    expect(rect.x + rect.width).toBeLessThanOrEqual(2020);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1250);
  });

  it("scales assistant physical size for high-DPI displays", () => {
    const collapsed = assistantWindowRect(
      {
        available: true,
        screenX: 100,
        screenY: 50,
        clientWidth: 1920,
        clientHeight: 1200
      },
      DEFAULT_REGION,
      true,
      false,
      1.5
    );
    const expanded = assistantWindowRect(
      {
        available: true,
        screenX: 100,
        screenY: 50,
        clientWidth: 1920,
        clientHeight: 1200
      },
      DEFAULT_REGION,
      false,
      false,
      1.5
    );

    expect(collapsed).toMatchObject({ width: 108, height: 108 });
    expect(expanded).toMatchObject({ width: 540, height: 428 });
  });

  it("shrinks the assistant when the client is smaller than its preferred size", () => {
    expect(
      assistantWindowRect(
        {
          available: true,
          screenX: 0,
          screenY: 0,
          clientWidth: 320,
          clientHeight: 200
        },
        DEFAULT_REGION,
        false,
        true
      )
    ).toMatchObject({
      width: 320,
      height: 200
    });
  });

  it("can expand from its current native position before scanner status is available", () => {
    expect(assistantWindowRectFromCurrentWindow({ x: 48, y: 108 }, false, false)).toEqual({
      x: 48,
      y: 108,
      width: 360,
      height: 285
    });
  });

  it("restores a manually dragged assistant position and clamps expanded size", () => {
    expect(
      assistantWindowRect(
        {
          available: true,
          screenX: 100,
          screenY: 50,
          clientWidth: 1920,
          clientHeight: 1200
        },
        DEFAULT_REGION,
        false,
        false,
        1,
        { x: 1, y: 1, unit: "normalized-client" }
      )
    ).toEqual({ x: 1660, y: 965, width: 360, height: 285 });
  });
});
