import { ScanRegion } from "@ri-genshin/artifact-schema";

export interface BubblePlacement {
  left: number;
  top: number;
  width: number;
  height: number;
  side: "left" | "right";
}

export interface BubbleViewport {
  width: number;
  height: number;
}

export interface BubbleDimensions {
  width: number;
  height: number;
}

const MARGIN = 16;

export function placeAssistantBubble(region: ScanRegion, viewport: BubbleViewport, dimensions: BubbleDimensions): BubblePlacement {
  const { width, height } = dimensions;
  // Anchor to the left edge of the client area so the bubble does not float
  // in front of the artifact card or drift into unpredictable positions.
  const left = MARGIN;
  // Vertically centre on the ROI midpoint and clamp to stay within the viewport.
  const roiCenterY = (region.y + region.height / 2) * viewport.height;
  const top = clamp(Math.round(roiCenterY - height / 2), MARGIN, viewport.height - height - MARGIN);

  return { left, top, width, height, side: "left" };
}

export function overlapsRegion(placement: BubblePlacement, region: ScanRegion, viewport: BubbleViewport): boolean {
  const roi = {
    left: region.x * viewport.width,
    top: region.y * viewport.height,
    right: (region.x + region.width) * viewport.width,
    bottom: (region.y + region.height) * viewport.height
  };
  const bubble = {
    left: placement.left,
    top: placement.top,
    right: placement.left + placement.width,
    bottom: placement.top + placement.height
  };

  return bubble.left < roi.right && bubble.right > roi.left && bubble.top < roi.bottom && bubble.bottom > roi.top;
}

function clamp(value: number, min: number, max: number): number {
  const safeMax = Math.max(min, max);
  return Math.min(Math.max(value, min), safeMax);
}
