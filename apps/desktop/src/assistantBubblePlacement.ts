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
  const roiLeft = region.x * viewport.width;
  const roiRight = (region.x + region.width) * viewport.width;
  const preferredLeft = roiLeft - width - MARGIN;
  const rightCandidate = roiRight + MARGIN;
  const hasLeftSpace = preferredLeft >= MARGIN;
  const hasRightSpace = rightCandidate + width <= viewport.width - MARGIN;
  const side = hasLeftSpace || !hasRightSpace ? "left" : "right";
  const left = side === "left" ? preferredLeft : rightCandidate;
  const top = region.y * viewport.height + MARGIN;

  return {
    left: clamp(left, MARGIN, viewport.width - width - MARGIN),
    top: clamp(top, MARGIN, viewport.height - height - MARGIN),
    width,
    height,
    side
  };
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
