# Scanner Pipeline

## MVP Pipeline

1. Locate the Genshin process by known executable names.
2. Read the client rectangle and screen position.
3. Capture only the game client region.
4. Crop the right-side artifact detail card.
5. Emit structured JSON.

## OCR Pipeline To Implement Next

- Preprocess cropped regions with grayscale, contrast, thresholding, and optional padding.
- Parse slot, main stat, level, substats, lock state, equipped state, and unactivated marker.
- Match OCR text against known GOOD stat keys and artifact set names.
- Attach per-field confidence.
- Save diagnostic crops only when debug logging is enabled.

## Safety Boundary

The scanner must only use screenshots and explicit user-triggered actions. Batch inventory navigation is future scope and must be opt-in because it uses mouse/keyboard automation.
