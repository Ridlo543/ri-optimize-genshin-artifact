# Scanner Pipeline

## MVP Pipeline

1. Locate the Genshin process by known executable names.
2. Read the client rectangle and screen position.
3. Capture only the game client region.
4. Crop the right-side artifact detail card.
5. Emit structured JSON.

## Implemented Substat OCR

- `apps/scanner-win` uses Tesseract with `apps/scanner-win/tessdata/genshin_fast_09_04_21.traineddata`.
- `ocr-substats <imagePath>` reads one substat crop and returns active substats, unactivated substats, raw OCR text, and confidence.
- `parse-fixture-artifact <fixtureFolder>` compares `substats/substats.png` OCR output against the fixture `artifact.json`.
- Current fixture coverage includes `artifact0` and `artifact1000`.

## OCR Pipeline To Implement Next

- Parse slot, main stat, level, lock state, equipped state, and artifact set/name from fixture crops.
- Match OCR text against known GOOD stat keys and artifact set names.
- Attach per-field confidence.
- Assemble a full `ScanResult.artifact` from live visible artifact screen captures.
- Save diagnostic crops only when debug logging is enabled.

## Safety Boundary

The scanner must only use screenshots and explicit user-triggered actions. Batch inventory navigation is future scope and must be opt-in because it uses mouse/keyboard automation.
