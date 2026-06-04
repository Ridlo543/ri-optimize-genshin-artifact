# Fixture Data

This directory contains a curated subset of local examples for scanner, OCR, import, and manual UI testing.

## Source

- Full GOOD export: `data/example/Database_1_2026-06-04_18-43-27.json`
- Full screenshots: `data/example/picture/`
- Artifact logging source: `data/example/artifacts`

`data/example/artifacts` is a local symlink to Inventory Kamera logging output:

```text
D:\Programming\Python\Inventory_Kamera-1.4.3_source_code\Inventory_Kamera-1.4.3\InventoryKamera\bin\x64\Release\logging\artifacts
```

Do not copy the whole symlink target into this repository. Use the small fixture set here for development.

## Contents

- `screenshots/`: full Genshin artifact inventory screenshots.
- `artifacts/`: selected artifact folders copied from Inventory Kamera logs. Each folder includes `artifact.json`, `card.png`, and cropped OCR regions.
- `good/`: selected artifacts from the full GOOD export and database summary notes.

## Screenshot Fixtures

- `screenshots/artifact-inventory-plus20.jpg`: equipped-character artifact screen with a +20 selected artifact. A character is visible in the center, and the right detail panel includes equipped/action controls.
- `screenshots/artifact-inventory-unactivated.jpg`: equipped-character artifact screen with a +0 selected artifact and visible `(unactivated)` text.
- `screenshots/bag-inventory-raw-1920x1200.png`: bag/inventory artifact screen without character model in the center; this is the raw 16:10 layout used for grid/card capture calibration.
- `screenshots/bag-grid-diagnostic-plus20-8x5.png`: Inventory Kamera diagnostic overlay for 8x5 grid detection on a +20 artifact page.
- `screenshots/bag-grid-diagnostic-unactivated-8x5.png`: Inventory Kamera diagnostic overlay for 8x5 grid detection with a +0 unactivated artifact selected.
- `screenshots/bag-grid-diagnostic-4star-8x5.png`: Inventory Kamera diagnostic overlay with a 4-star artifact selected.
- `screenshots/bag-item-count.png`: cropped artifact inventory count text, expected to parse `1783/2400`.

## Selected Artifact Fixtures

- `artifact0`: +20 5-star flower with four active substats.
- `artifact1000`: +0 5-star plume with three active substats and one unactivated substat.
- `artifact1021`: elemental goblet with four active substats.
- `artifact1027`: elemental goblet with unactivated CRIT DMG.
- `artifact1035`: crit main-stat circlet.
- `artifact1066`: ER sands with unactivated CRIT Rate.
- `artifact1743`: 4-star electro goblet edge case.
- `artifact1082`: unlocked 5-star artifact.
- `artifact1042`: equipped artifact with unactivated substat.
- `artifact513`: odd level +17 import edge case.

## Manual OCR Targets

- `artifacts/artifact0/substats/substats.png` should parse four active substats and no unactivated stat.
- `artifacts/artifact1000/substats/substats.png` should parse three active substats and one unactivated `atk_` value.
