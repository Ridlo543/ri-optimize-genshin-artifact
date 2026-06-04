# PRD & Technical Specification — Genshin Artifact Probability Calculator

Version: 1.0  
Date: 2026-06-04  
Language: Indonesian  
Status: Draft siap eksekusi untuk coding agent  
Target platform: Windows desktop-first floating app; web/mobile manual mode is future scope

---

## 1. Ringkasan Produk

Aplikasi ini adalah kalkulator probabilitas artefak Genshin Impact untuk membantu pemain memutuskan apakah sebuah artefak layak disimpan, dinaikkan, dihentikan pada level tertentu, atau dijadikan fodder/strongbox.

Fokus aplikasi bukan “memprediksi hasil pasti”, melainkan menghitung probabilitas berdasarkan rule artefak yang diketahui komunitas: distribusi substat awal berbobot, nilai roll substat, dan peluang upgrade substat saat artefak sudah memiliki 4 substat.

Aplikasi harus mendukung UI terbaru Genshin di mana artefak 5★ dengan 3 substat dapat menampilkan substat ke-4 sebagai `unactivated`. Dalam model kalkulasi, substat `unactivated` harus diperlakukan sebagai substat masa depan yang sudah diketahui, bukan substat yang masih perlu diprediksi.

---

## 2. Problem Statement

Pemain sering mendapat artefak dengan potensi yang tidak jelas, misalnya:

- Artefak memiliki 1–2 substat bagus, tetapi main stat atau slotnya meragukan.
- Artefak 3-liner sekarang menampilkan substat ke-4 sebagai `unactivated`, tetapi pemain belum tahu apakah worth dinaikkan.
- Pemain sulit menilai kapan harus stop upgrade di +4, +8, +12, atau +16.
- Pemain sering menyimpan terlalu banyak artefak karena tidak punya standar numerik.
- Tool yang ada seperti Genshin Optimizer kuat untuk build optimization, tetapi terlalu besar jika kebutuhan utamanya hanya mengevaluasi peluang upgrade artefak secara cepat.

Aplikasi ini menyelesaikan masalah tersebut dengan memberi output kuantitatif: peluang minimal roll masuk target, expected score, probabilitas mencapai threshold CV/RV/custom score, dan rekomendasi tindakan.

---

## 3. Goals

### 3.1 Product Goals

1. Membantu pemain mengevaluasi kualitas artefak secara cepat sebelum menghabiskan artifact EXP.
2. Menghitung peluang artefak mencapai threshold tertentu, misalnya 30 CV, 35 CV, 40 CV, atau custom score.
3. Memberikan rekomendasi tindakan: `Upgrade`, `Upgrade cautiously`, `Stop`, `Keep`, `Fodder`, atau `Strongbox candidate`.
4. Mendukung artefak dengan substat `unactivated` dari UI terbaru.
5. Menyediakan mode kalkulasi exact probability dan Monte Carlo simulation.

### 3.2 Technical Goals

1. Logic probabilitas harus dipisah dari UI agar dapat dites dengan unit test.
2. Semua rule artefak harus ditulis sebagai konfigurasi data, bukan hardcoded tersebar.
3. Formula dan asumsi harus transparan di halaman Theory/Methodology.
4. Hasil kalkulasi harus deterministic untuk exact mode.
5. Monte Carlo mode harus mendukung seed agar hasil dapat direproduksi.

---

## 4. Non-Goals

Aplikasi versi awal tidak perlu:

1. Menjadi full build optimizer seperti Genshin Optimizer.
2. Mengambil data langsung dari akun Genshin.
3. OCR otomatis dari screenshot.
4. Menghitung damage final lengkap per karakter.
5. Mendukung semua karakter dan rotasi tim secara mendalam.
6. Mengklaim probabilitas sebagai data resmi HoYoverse.

OCR screenshot dan character-specific damage optimizer bisa menjadi fitur lanjutan.

---

## 5. Target User

### 5.1 Primary User

Pemain Genshin AR45+ yang aktif farming artefak dan ingin membuat keputusan praktis:

- Artefak ini dinaikkan atau tidak?
- Stop di +8 atau lanjut ke +12/+16/+20?
- Artefak ini lebih baik disimpan untuk karakter lain atau dijadikan fodder?
- Apakah artefak ini punya peluang realistis menjadi bagus?

### 5.2 Secondary User

Theorycrafter ringan atau pemain endgame yang ingin membandingkan artefak berdasarkan probabilitas dan scoring custom.

---

## 6. Referensi Teori dan Status Validitas

### 6.1 Status Data

Data probabilitas artefak yang digunakan harus dijelaskan sebagai:

> Community-derived artifact probability model based on Genshin Wiki, KeqingMains resources, datamine references, and community research. Not official HoYoverse data.

Ini penting karena HoYoverse tidak mempublikasikan semua tabel probabilitas artefak secara resmi.

### 6.2 Sumber Utama

1. Genshin Impact Wiki — Artifact/Distribution  
   https://genshin-impact.fandom.com/wiki/Artifact/Distribution

2. Genshin Impact Wiki — Artifact  
   https://genshin-impact.fandom.com/wiki/Artifact

3. KeqingMains — Genshin Impact Artifacts Guide  
   https://keqingmains.com/misc/artifacts/

4. KeqingMains Theorycrafting Library — Artifact evidence  
   https://library.keqingmains.com/evidence/equipment/artifacts

### 6.3 Ringkasan Teori yang Digunakan

#### 6.3.1 Main Stat

Setiap artefak memiliki satu main stat. Flower selalu Flat HP, Feather selalu Flat ATK. Sands, Goblet, dan Circlet memiliki distribusi main stat masing-masing.

Untuk versi awal, aplikasi boleh mengasumsikan user memasukkan main stat yang sudah diketahui. Kalkulasi drop-rate main stat tidak wajib untuk MVP.

#### 6.3.2 Substat Dasar

Substat yang mungkin muncul pada artefak:

- HP
- ATK
- DEF
- HP%
- ATK%
- DEF%
- Elemental Mastery
- Energy Recharge%
- CRIT Rate%
- CRIT DMG%

Rule:

- Substat tidak boleh sama dengan main stat.
- Substat tidak boleh duplikat.
- Artefak maksimal memiliki 4 substat.

Contoh:

- Goblet DEF% tidak bisa punya substat DEF%, tetapi bisa punya Flat DEF.
- Circlet CRIT Rate tidak bisa punya substat CRIT Rate, tetapi bisa punya CRIT DMG.

#### 6.3.3 UI Baru: Unactivated Substat

UI terbaru dapat menampilkan substat ke-4 pada artefak 5★ 3-liner sebagai `unactivated`.

Implikasi teknis:

- Jika user mengisi `unactivatedSubstat`, aplikasi tidak boleh menghitung peluang substat ke-4 muncul.
- Pada level +4, substat tersebut otomatis menjadi aktif.
- Setelah +4, upgrade berikutnya diperlakukan sebagai upgrade pada 4 substat yang sudah diketahui.

Contoh dari screenshot:

```text
Piece: Goblet
Main stat: DEF%
Level: +0
Active substats:
- CRIT DMG +7.0%
- Elemental Mastery +23
- DEF +23
Unactivated substat:
- CRIT Rate +3.1%
```

Model:

```text
+4: CRIT Rate aktif
+8/+12/+16/+20: random upgrade ke salah satu dari 4 substat
```

#### 6.3.4 Weight Substat Awal / Substat Baru

Saat substat awal digenerate atau saat substat baru ditambahkan, peluangnya berbobot.

| Substat | Weight |
|---|---:|
| HP | 6 |
| ATK | 6 |
| DEF | 6 |
| HP% | 4 |
| ATK% | 4 |
| DEF% | 4 |
| Energy Recharge% | 4 |
| Elemental Mastery | 4 |
| CRIT Rate% | 3 |
| CRIT DMG% | 3 |

Formula peluang substat baru:

```text
P(stat) = weight(stat) / sum(weight(availableStats))
```

`availableStats` adalah semua substat yang tidak sama dengan main stat dan belum ada di artefak.

Contoh:

Jika Plume ATK sudah punya ATK%, ER, dan CRIT Rate, maka peluang mendapat CRIT DMG sebagai substat ke-4:

```text
Available = HP, DEF, HP%, DEF%, EM, CRIT DMG
Weight sum = 6 + 6 + 4 + 4 + 4 + 3 = 27
P(CRIT DMG) = 3 / 27 = 11.111...%
```

#### 6.3.5 Nilai Roll Substat

Untuk artefak 3★, 4★, dan 5★, nilai minor affix memiliki 4 tier value: 70%, 80%, 90%, dan 100% dari maksimum, masing-masing dengan peluang 25%.

Untuk MVP, fokus pada artefak 5★.

Tabel nilai roll 5★ yang umum digunakan:

| Substat | 70% | 80% | 90% | 100% |
|---|---:|---:|---:|---:|
| HP | 209.13 | 239.00 | 268.88 | 298.75 |
| ATK | 13.62 | 15.56 | 17.51 | 19.45 |
| DEF | 16.20 | 18.52 | 20.83 | 23.15 |
| HP% | 4.08 | 4.66 | 5.25 | 5.83 |
| ATK% | 4.08 | 4.66 | 5.25 | 5.83 |
| DEF% | 5.10 | 5.83 | 6.56 | 7.29 |
| Elemental Mastery | 16.32 | 18.65 | 20.98 | 23.31 |
| Energy Recharge% | 4.53 | 5.18 | 5.83 | 6.48 |
| CRIT Rate% | 2.72 | 3.11 | 3.50 | 3.89 |
| CRIT DMG% | 5.44 | 6.22 | 6.99 | 7.77 |

Catatan rounding:

- Game menampilkan percent stat sampai 1 desimal.
- Flat stat dan EM ditampilkan sebagai integer.
- Internal value lebih presisi daripada display value.
- Aplikasi harus menyimpan internal value, tetapi boleh menampilkan rounded value.

#### 6.3.6 Upgrade Slot Saat Sudah 4 Substat

Jika artefak sudah memiliki 4 substat, setiap milestone level +4, +8, +12, +16, dan +20 akan memilih salah satu dari 4 slot substat secara rata.

| Slot | Probability |
|---|---:|
| Slot 1 | 25% |
| Slot 2 | 25% |
| Slot 3 | 25% |
| Slot 4 | 25% |

Untuk artefak 5★:

- 4-liner +0 memiliki 5 upgrade substat dari +0 ke +20.
- 3-liner +0 tanpa unactivated known memiliki 1 new substat di +4, lalu 4 upgrade substat dari +8 ke +20.
- 3-liner +0 dengan unactivated known memiliki substat ke-4 yang sudah diketahui, aktif di +4, lalu 4 upgrade substat dari +8 ke +20.

#### 6.3.7 Distribusi Roll ke Target

Jika ada `k` substat target dari 4 substat aktif, maka peluang satu upgrade masuk target:

```text
p = k / 4
```

Untuk `n` upgrade tersisa, jumlah roll target mengikuti distribusi binomial:

```text
P(X = x) = C(n, x) * p^x * (1 - p)^(n - x)
```

Contoh:

Artefak punya CRIT Rate, CRIT DMG, ATK%, DEF. Target = CRIT Rate + CRIT DMG. Maka `k = 2`, `p = 0.5`.

Jika upgrade tersisa 5 kali:

| Target rolls | Probability |
|---:|---:|
| 0 | 3.125% |
| 1 | 15.625% |
| 2 | 31.250% |
| 3 | 31.250% |
| 4 | 15.625% |
| 5 | 3.125% |

Jika upgrade tersisa 4 kali:

| Target rolls | Probability |
|---:|---:|
| 0 | 6.250% |
| 1 | 25.000% |
| 2 | 37.500% |
| 3 | 25.000% |
| 4 | 6.250% |

---

## 7. Core Product Concept

Aplikasi akan menilai artefak dari dua sisi:

1. Current quality: seberapa bagus artefak saat ini berdasarkan main stat, substat, value roll, dan scoring profile.
2. Future potential: peluang artefak menjadi bagus setelah dinaikkan ke level tertentu.

Output tidak boleh hanya berupa angka CV. Banyak karakter tidak hanya butuh CRIT. Misalnya:

- Support tertentu sangat butuh Energy Recharge.
- Dendro reaction trigger bisa sangat menghargai Elemental Mastery.
- DEF-scaling DPS bisa menghargai DEF%.
- HP-scaling support/DPS bisa menghargai HP%.

Maka aplikasi harus mendukung scoring profile per kebutuhan.

---

## 8. MVP Scope

### 8.1 Input Manual Artefak

User mengisi:

- Artifact set name, optional
- Piece/slot: Flower, Feather, Sands, Goblet, Circlet
- Rarity: default 5★
- Level: +0, +4, +8, +12, +16, +20
- Main stat
- Active substats: name + displayed value
- Unactivated substat: name + displayed value, optional
- Artifact source, optional: Domain, Boss, Strongbox, Reliquary

### 8.2 Target Evaluation

User memilih target preset:

- Generic DPS Crit
- ATK-scaling DPS
- HP-scaling DPS
- DEF-scaling DPS
- EM Reaction Trigger
- ER Support
- Custom

Setiap preset memiliki weight scoring.

Contoh Generic DPS Crit:

```json
{
  "CRIT_RATE": 2.0,
  "CRIT_DMG": 1.0,
  "ATK_PERCENT": 0.8,
  "ENERGY_RECHARGE": 0.5,
  "ELEMENTAL_MASTERY": 0.3,
  "HP_PERCENT": 0.0,
  "DEF_PERCENT": 0.0,
  "FLAT_ATK": 0.1,
  "FLAT_HP": 0.0,
  "FLAT_DEF": 0.0
}
```

### 8.3 Probability Output

Aplikasi menampilkan:

1. Current score
2. Current CV, jika ada CRIT Rate/CRIT DMG
3. Expected final score at +20
4. Probability to reach score threshold
5. Probability to reach CV threshold
6. Probability of at least `N` target rolls
7. Suggested stopping point
8. Recommendation label

### 8.4 Decision Recommendation

Contoh label:

- `Excellent: upgrade to +20`
- `Good: continue to next checkpoint`
- `Promising but risky`
- `Stop unless specific character needs this`
- `Keep as off-piece candidate`
- `Fodder / Strongbox candidate`

---

## 9. Future Scope

1. OCR dari screenshot artefak.
2. Import dari GOOD format / Genshin Optimizer artifact export.
3. Batch artifact evaluation.
4. Character-aware scoring profiles.
5. Artifact inventory cleanup recommendations.
6. Compare two artifacts.
7. Resin efficiency estimator.
8. Sanctifying Elixir / Artifact Definition mode.
9. Artifact Reshaping / Dust of Enlightenment mode if mechanic needs modeling.
10. PWA mobile-first interface.

---

## 10. User Stories

### US-001 — Evaluate +0 Artifact

As a player, I want to input a +0 artifact so that I know whether it is worth upgrading.

Acceptance criteria:

- User can select piece, main stat, and substats.
- User can input unactivated substat.
- App returns current score and probability to become good at +20.

### US-002 — Stop/Continue Decision

As a player, I want to evaluate an artifact at +4/+8/+12/+16 so that I know whether to continue.

Acceptance criteria:

- App calculates remaining upgrade count based on current level.
- App shows expected final score and risk.
- App gives recommendation.

### US-003 — Crit Probability

As a DPS player, I want to know the chance my artifact gets at least 2 more CRIT rolls.

Acceptance criteria:

- User selects CRIT Rate and CRIT DMG as target stats.
- App displays exact probability for 0, 1, 2, ... target rolls.

### US-004 — Custom Build Profile

As a player building a non-crit support, I want to value ER and EM more than CRIT.

Acceptance criteria:

- User can change stat weights.
- App recalculates score and recommendation using custom weights.

### US-005 — Batch Evaluation

As an advanced player, I want to paste multiple artifacts so that I can rank them.

Acceptance criteria for future version:

- App accepts JSON artifact list.
- App returns sorted list by expected score and probability threshold.

---

## 11. Functional Requirements

### FR-001 — Artifact Input Validation

The app must validate:

- Main stat is valid for selected piece.
- Substat does not duplicate main stat.
- Substats are unique.
- Active substats count is 0–4 depending on rarity and level.
- Unactivated substat is only allowed when active substat count is 3 and artifact is 5★.
- Unactivated substat must not duplicate main stat or existing substats.

### FR-002 — Remaining Upgrade Count

The app must determine remaining upgrade events.

For 5★ artifact:

```text
Upgrade events happen at +4, +8, +12, +16, +20.
```

Rules:

- If level is +0 and artifact has 4 active substats: 5 upgrade events remain.
- If level is +0 and artifact has 3 active substats + known unactivated: +4 activates the known substat, then 4 upgrade events remain.
- If level is +0 and artifact has 3 active substats without known unactivated: +4 rolls a new substat from weighted pool, then 4 upgrade events remain.
- If level is +4 and artifact already has 4 active substats: 4 upgrade events remain.
- If level is +8: 3 remain.
- If level is +12: 2 remain.
- If level is +16: 1 remains.
- If level is +20: 0 remain.

### FR-003 — Exact Probability Engine

The app must calculate exact probability where feasible.

Must support:

- Binomial probability for number of target slot hits.
- Enumeration over possible upgrade paths.
- Enumeration over possible roll values.
- Weighted distribution for unknown added substat.

### FR-004 — Monte Carlo Engine

The app must simulate upgrade outcomes.

Config:

- Default trials: 100,000
- User-selectable trials: 10,000 / 100,000 / 1,000,000
- Optional random seed

Output:

- Estimated probability of reaching thresholds
- Expected final score
- Percentiles: P10, P25, P50, P75, P90, P95
- Histogram data

### FR-005 — Scoring Engine

The app must calculate:

- CV = CRIT Rate × 2 + CRIT DMG
- Roll Value (RV) optional
- Custom weighted score
- Effective useful rolls
- Dead stat count

### FR-006 — Recommendation Engine

The app must map probability and expected score to recommendation.

Default generic thresholds:

| Recommendation | Condition Example |
|---|---|
| Excellent | Current score already high and P(good) ≥ 70% |
| Good | P(good) ≥ 50% or high expected score |
| Risky | P(good) 25–50% |
| Stop | P(good) < 25% and low current score |
| Keep niche | Low generic score but high custom profile score |
| Fodder | Wrong main stat and low useful substats |

Threshold must be configurable.

---

## 12. Non-Functional Requirements

### NFR-001 — Performance

- Single artifact exact calculation should complete under 200 ms for standard scenarios.
- Monte Carlo 100,000 trials should complete under 1 second on modern desktop browser.
- UI must remain responsive; use Web Worker for large simulations.

### NFR-002 — Accuracy

- Exact engine must be covered by unit tests.
- Monte Carlo estimates must be compared against exact results for simple binomial scenarios.
- All displayed percentages should be rounded consistently.

### NFR-003 — Transparency

- Every recommendation must expose why it was given.
- App must display assumptions and source links.
- App must include disclaimer that data is community-derived and not official HoYoverse probability data.

### NFR-004 — Portability

- Logic package should be framework-agnostic TypeScript.
- UI can be Next.js/React.

---

## 13. Recommended Tech Stack

### 13.1 Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui optional
- Zustand or Jotai for lightweight state

### 13.2 Calculation Logic

- TypeScript pure functions
- Vitest for unit tests
- fast-check optional for property-based tests

### 13.3 Visualization

- Recharts or lightweight SVG components
- Histogram for final score distribution
- Probability table for roll count

### 13.4 Persistence

MVP:

- LocalStorage

Future:

- IndexedDB for artifact inventory
- Export/import JSON

---

## 14. Data Model

### 14.1 Stat Enum

```ts
export enum StatType {
  FLAT_HP = "FLAT_HP",
  FLAT_ATK = "FLAT_ATK",
  FLAT_DEF = "FLAT_DEF",
  HP_PERCENT = "HP_PERCENT",
  ATK_PERCENT = "ATK_PERCENT",
  DEF_PERCENT = "DEF_PERCENT",
  ELEMENTAL_MASTERY = "ELEMENTAL_MASTERY",
  ENERGY_RECHARGE = "ENERGY_RECHARGE",
  CRIT_RATE = "CRIT_RATE",
  CRIT_DMG = "CRIT_DMG",
  PYRO_DMG = "PYRO_DMG",
  HYDRO_DMG = "HYDRO_DMG",
  ELECTRO_DMG = "ELECTRO_DMG",
  CRYO_DMG = "CRYO_DMG",
  ANEMO_DMG = "ANEMO_DMG",
  GEO_DMG = "GEO_DMG",
  DENDRO_DMG = "DENDRO_DMG",
  PHYSICAL_DMG = "PHYSICAL_DMG",
  HEALING_BONUS = "HEALING_BONUS"
}
```

### 14.2 Artifact Piece Enum

```ts
export enum ArtifactPiece {
  FLOWER = "FLOWER",
  FEATHER = "FEATHER",
  SANDS = "SANDS",
  GOBLET = "GOBLET",
  CIRCLET = "CIRCLET"
}
```

### 14.3 Substat

```ts
export interface Substat {
  stat: StatType;
  value: number;
  active: boolean;
  source?: "VISIBLE" | "UNACTIVATED" | "SIMULATED";
}
```

### 14.4 Artifact

```ts
export interface Artifact {
  id?: string;
  setName?: string;
  piece: ArtifactPiece;
  rarity: 3 | 4 | 5;
  level: 0 | 4 | 8 | 12 | 16 | 20;
  mainStat: StatType;
  substats: Substat[];
  source?: "DOMAIN" | "BOSS" | "STRONGBOX" | "RELIQUARY" | "UNKNOWN";
}
```

### 14.5 Scoring Profile

```ts
export interface ScoringProfile {
  id: string;
  name: string;
  description?: string;
  statWeights: Partial<Record<StatType, number>>;
  targetStats: StatType[];
  thresholds: {
    goodScore: number;
    excellentScore: number;
    minProbabilityToContinue: number;
  };
}
```

### 14.6 Probability Result

```ts
export interface ProbabilityResult {
  currentScore: number;
  currentCV: number;
  expectedFinalScore: number;
  expectedFinalCV: number;
  probabilityByTargetRollCount: Record<number, number>;
  probabilityReachScoreThreshold: Record<number, number>;
  probabilityReachCVThreshold: Record<number, number>;
  percentiles?: Record<"p10" | "p25" | "p50" | "p75" | "p90" | "p95", number>;
  recommendation: Recommendation;
  explanation: string[];
}
```

---

## 15. Rule Configuration

### 15.1 Minor Affix Weights

```ts
export const MINOR_AFFIX_WEIGHTS: Record<StatType, number> = {
  [StatType.FLAT_HP]: 6,
  [StatType.FLAT_ATK]: 6,
  [StatType.FLAT_DEF]: 6,
  [StatType.HP_PERCENT]: 4,
  [StatType.ATK_PERCENT]: 4,
  [StatType.DEF_PERCENT]: 4,
  [StatType.ENERGY_RECHARGE]: 4,
  [StatType.ELEMENTAL_MASTERY]: 4,
  [StatType.CRIT_RATE]: 3,
  [StatType.CRIT_DMG]: 3
};
```

### 15.2 Valid Main Stats by Piece

```ts
export const VALID_MAIN_STATS_BY_PIECE: Record<ArtifactPiece, StatType[]> = {
  [ArtifactPiece.FLOWER]: [StatType.FLAT_HP],
  [ArtifactPiece.FEATHER]: [StatType.FLAT_ATK],
  [ArtifactPiece.SANDS]: [
    StatType.HP_PERCENT,
    StatType.ATK_PERCENT,
    StatType.DEF_PERCENT,
    StatType.ENERGY_RECHARGE,
    StatType.ELEMENTAL_MASTERY
  ],
  [ArtifactPiece.GOBLET]: [
    StatType.HP_PERCENT,
    StatType.ATK_PERCENT,
    StatType.DEF_PERCENT,
    StatType.ELEMENTAL_MASTERY,
    StatType.PYRO_DMG,
    StatType.HYDRO_DMG,
    StatType.ELECTRO_DMG,
    StatType.CRYO_DMG,
    StatType.ANEMO_DMG,
    StatType.GEO_DMG,
    StatType.DENDRO_DMG,
    StatType.PHYSICAL_DMG
  ],
  [ArtifactPiece.CIRCLET]: [
    StatType.HP_PERCENT,
    StatType.ATK_PERCENT,
    StatType.DEF_PERCENT,
    StatType.ELEMENTAL_MASTERY,
    StatType.CRIT_RATE,
    StatType.CRIT_DMG,
    StatType.HEALING_BONUS
  ]
};
```

### 15.3 Minor Roll Values 5★

```ts
export const MINOR_ROLL_VALUES_5_STAR: Record<StatType, number[]> = {
  [StatType.FLAT_HP]: [209.13, 239.00, 268.88, 298.75],
  [StatType.FLAT_ATK]: [13.62, 15.56, 17.51, 19.45],
  [StatType.FLAT_DEF]: [16.20, 18.52, 20.83, 23.15],
  [StatType.HP_PERCENT]: [4.08, 4.66, 5.25, 5.83],
  [StatType.ATK_PERCENT]: [4.08, 4.66, 5.25, 5.83],
  [StatType.DEF_PERCENT]: [5.10, 5.83, 6.56, 7.29],
  [StatType.ELEMENTAL_MASTERY]: [16.32, 18.65, 20.98, 23.31],
  [StatType.ENERGY_RECHARGE]: [4.53, 5.18, 5.83, 6.48],
  [StatType.CRIT_RATE]: [2.72, 3.11, 3.50, 3.89],
  [StatType.CRIT_DMG]: [5.44, 6.22, 6.99, 7.77]
};
```

---

## 16. Core Algorithms

### 16.1 Get Available Minor Affixes

```ts
function getAvailableMinorAffixes(artifact: Artifact): StatType[] {
  const existing = new Set(artifact.substats.map(s => s.stat));
  return Object.keys(MINOR_AFFIX_WEIGHTS)
    .map(key => key as StatType)
    .filter(stat => stat !== artifact.mainStat)
    .filter(stat => !existing.has(stat));
}
```

### 16.2 Weighted Probability for New Substat

```ts
function getNewSubstatDistribution(artifact: Artifact): Array<{ stat: StatType; probability: number }> {
  const available = getAvailableMinorAffixes(artifact);
  const totalWeight = available.reduce((sum, stat) => sum + MINOR_AFFIX_WEIGHTS[stat], 0);

  return available.map(stat => ({
    stat,
    probability: MINOR_AFFIX_WEIGHTS[stat] / totalWeight
  }));
}
```

### 16.3 Remaining Upgrade Events

```ts
function getRemainingMilestones(level: Artifact["level"]): Artifact["level"][] {
  return [4, 8, 12, 16, 20].filter(milestone => milestone > level) as Artifact["level"][];
}
```

### 16.4 Apply Milestone Logic

Pseudo:

```text
for each remaining milestone:
  if activeSubstatCount < 4:
    if there is unactivated substat:
      activate it
    else:
      roll new substat by weighted distribution
      roll initial value tier uniformly among 4 values
  else:
    choose one of 4 substat slots uniformly
    choose roll value tier uniformly among 4 values
    add value to selected substat
```

### 16.5 Exact Enumeration

Exact enumeration should recursively branch over:

1. Unknown new substat distribution, if applicable.
2. Slot upgrade distribution, 4 branches each with 25%.
3. Roll value distribution, 4 branches each with 25%.

Pseudo:

```ts
interface OutcomeState {
  artifact: Artifact;
  probability: number;
}

function enumerateOutcomes(initial: Artifact): OutcomeState[] {
  let states: OutcomeState[] = [{ artifact: initial, probability: 1 }];

  for (const milestone of getRemainingMilestones(initial.level)) {
    const nextStates: OutcomeState[] = [];

    for (const state of states) {
      const active = state.artifact.substats.filter(s => s.active);
      const unactivated = state.artifact.substats.find(s => !s.active);

      if (active.length < 4) {
        if (unactivated) {
          const newArtifact = activateUnactivated(state.artifact);
          nextStates.push({ artifact: newArtifact, probability: state.probability });
        } else {
          for (const candidate of getNewSubstatDistribution(state.artifact)) {
            for (const value of getRollValues(candidate.stat, state.artifact.rarity)) {
              const newArtifact = addSubstat(state.artifact, candidate.stat, value);
              nextStates.push({
                artifact: newArtifact,
                probability: state.probability * candidate.probability * 0.25
              });
            }
          }
        }
      } else {
        for (const slotIndex of [0, 1, 2, 3]) {
          const stat = active[slotIndex].stat;
          for (const value of getRollValues(stat, state.artifact.rarity)) {
            const newArtifact = upgradeSubstat(state.artifact, slotIndex, value);
            nextStates.push({
              artifact: newArtifact,
              probability: state.probability * 0.25 * 0.25
            });
          }
        }
      }
    }

    states = mergeEquivalentStates(nextStates);
  }

  return states;
}
```

Optimization:

- Merge equivalent states by normalized substat values.
- For simple target roll count, use binomial instead of full enumeration.
- For score threshold with value rolls, enumeration is still manageable for one artifact.

### 16.6 Monte Carlo Simulation

Pseudo:

```ts
function simulateArtifact(initial: Artifact, rng: RNG): Artifact {
  let artifact = cloneArtifact(initial);

  for (const milestone of getRemainingMilestones(artifact.level)) {
    const active = artifact.substats.filter(s => s.active);
    const unactivated = artifact.substats.find(s => !s.active);

    if (active.length < 4) {
      if (unactivated) {
        unactivated.active = true;
      } else {
        const stat = weightedRandom(getNewSubstatDistribution(artifact), rng);
        const value = randomChoice(getRollValues(stat, artifact.rarity), rng);
        artifact.substats.push({ stat, value, active: true, source: "SIMULATED" });
      }
    } else {
      const slotIndex = randomInt(0, 3, rng);
      const stat = artifact.substats[slotIndex].stat;
      const value = randomChoice(getRollValues(stat, artifact.rarity), rng);
      artifact.substats[slotIndex].value += value;
    }
  }

  artifact.level = 20;
  return artifact;
}
```

---

## 17. Scoring Definitions

### 17.1 Crit Value

```text
CV = CRIT Rate × 2 + CRIT DMG
```

Examples:

```text
CRIT Rate 3.1% + CRIT DMG 7.0%
CV = 3.1 × 2 + 7.0 = 13.2
```

### 17.2 Weighted Score

```text
score = Σ value(stat) × weight(stat)
```

For display, weights should be user-editable.

### 17.3 Roll Value

RV compares actual roll value against max possible roll for that stat.

```text
RV(stat roll) = actualRollValue / maxRollValue
```

For an artifact:

```text
Total RV = sum(useful roll RVs)
```

MVP may calculate approximate RV from displayed total value by inferring roll counts, but exact RV is easier if user enters roll history or if app enumerates possible histories.

### 17.4 Effective Useful Rolls

A useful roll is a roll into any stat with profile weight > 0.

```text
EffectiveUsefulRolls = sum(normalized contribution of useful stats)
```

---

## 18. Recommendation Logic

### 18.1 Default DPS Crit Thresholds

Suggested default for generic DPS:

| Artifact Level | Continue if... |
|---|---|
| +0 | Has at least 2 useful substats or strong main stat + 1 crit |
| +4 | Has 2 crit/useful stats and P(30 CV) reasonable |
| +8 | At least 1 roll hit useful stat, or current CV ≥ 20 |
| +12 | Continue if current CV ≥ 25 or P(35 CV) ≥ 25% |
| +16 | Continue if current CV ≥ 30 or artifact fills niche need |
| +20 | Final evaluation only |

These thresholds are defaults, not universal. App must allow custom threshold.

### 18.2 Recommendation Pseudo

```ts
function recommend(result: ProbabilityResult, profile: ScoringProfile): Recommendation {
  const pGood = result.probabilityReachScoreThreshold[profile.thresholds.goodScore] ?? 0;
  const pExcellent = result.probabilityReachScoreThreshold[profile.thresholds.excellentScore] ?? 0;

  if (result.currentScore >= profile.thresholds.excellentScore) {
    return "EXCELLENT";
  }

  if (pExcellent >= 0.25 || pGood >= 0.7) {
    return "UPGRADE";
  }

  if (pGood >= 0.4) {
    return "UPGRADE_CAUTIOUSLY";
  }

  if (pGood >= 0.2) {
    return "RISKY_KEEP";
  }

  return "STOP_OR_FODDER";
}
```

### 18.3 Recommendation Explanation

Every recommendation must include explanation lines, for example:

```text
- This artifact has 2 useful substats: CRIT Rate and CRIT DMG.
- From +8 to +20, 3 upgrade events remain.
- Each upgrade has 50% chance to hit a CRIT substat.
- Probability to get at least 2 more CRIT rolls: 50.00%.
- Expected final CV: 33.8.
```

---

## 19. UI/UX Specification

### 19.1 Main Page Layout

Sections:

1. Artifact Input Panel
2. Scoring Profile Panel
3. Result Summary Card
4. Probability Details
5. Outcome Distribution Chart
6. Recommendation Explanation
7. Theory/Assumptions Link

### 19.2 Artifact Input Panel

Fields:

- Piece selector
- Main stat selector filtered by piece
- Level selector
- Rarity selector
- Source selector optional
- Substat rows:
  - Stat dropdown
  - Value input
  - Active / Unactivated toggle

Validation should happen live.

### 19.3 Result Summary Card

Display:

```text
Recommendation: Upgrade cautiously
Current CV: 13.2
Expected Final CV: 31.4
Chance ≥ 30 CV: 54.8%
Chance ≥ 35 CV: 26.1%
Chance ≥ 40 CV: 7.4%
Chance ≥ 2 target rolls: 68.8%
```

### 19.4 Probability Details

Table:

| Target Rolls | Probability |
|---:|---:|
| 0 | x% |
| 1 | x% |
| 2 | x% |
| 3 | x% |
| 4 | x% |
| 5 | x% |

### 19.5 Outcome Distribution Chart

Histogram:

- X-axis: final score or final CV
- Y-axis: probability

Percentile markers:

- P10
- P50
- P90

### 19.6 Theory Page

Must explain:

- Data source status
- Substat weight
- Uniform slot upgrade
- Roll values
- Unactivated substat handling
- Limitations

---

## 20. Example Calculation Using Screenshot Artifact

Input:

```json
{
  "piece": "GOBLET",
  "rarity": 5,
  "level": 0,
  "mainStat": "DEF_PERCENT",
  "substats": [
    { "stat": "CRIT_DMG", "value": 7.0, "active": true },
    { "stat": "ELEMENTAL_MASTERY", "value": 23, "active": true },
    { "stat": "FLAT_DEF", "value": 23, "active": true },
    { "stat": "CRIT_RATE", "value": 3.1, "active": false, "source": "UNACTIVATED" }
  ]
}
```

Interpretation:

- At +4, CRIT Rate becomes active.
- At +8, +12, +16, +20, one of 4 substats upgrades.
- Target stats for generic DPS: CRIT Rate and CRIT DMG.
- Target slot count after +4: 2 out of 4.
- Probability one upgrade hits target: 50%.
- Remaining upgrade rolls after +4: 4.

Distribution:

| CRIT target hits from +8 to +20 | Probability |
|---:|---:|
| 0 | 6.25% |
| 1 | 25.00% |
| 2 | 37.50% |
| 3 | 25.00% |
| 4 | 6.25% |

Current visible CV after activation:

```text
CV = 3.1 × 2 + 7.0 = 13.2
```

If all 4 future rolls hit CRIT and average roll value is used:

```text
Average CRIT Rate roll = (2.72 + 3.11 + 3.50 + 3.89) / 4 = 3.305
Average CRIT DMG roll = (5.44 + 6.22 + 6.99 + 7.77) / 4 = 6.605
Average CV contribution per CRIT slot hit depends on whether selected stat is CRIT Rate or CRIT DMG.
Since CRIT Rate and CRIT DMG each have equal slot chance among target stats:
Average target CV roll ≈ ((3.305 × 2) + 6.605) / 2 = 6.6075 CV
```

Expected additional CV from 4 future upgrade events:

```text
Expected target hits = 4 × 0.5 = 2
Expected additional CV ≈ 2 × 6.6075 = 13.215
Expected final CV ≈ 13.2 + 13.215 = 26.415
```

This goblet has crit potential, but because the main stat is DEF%, recommendation depends on target character:

- For DEF-scaling character: potentially useful.
- For generic DPS needing elemental goblet: likely not a priority.
- As off-piece: only worth if character can use DEF% or if substat result becomes exceptional.

---

## 21. Edge Cases

1. Main stat equals substat: invalid.
2. Duplicate substats: invalid.
3. 3 active + 1 unactivated at +4 or higher: usually invalid unless representing pre-activation state manually.
4. Level +20 with unactivated substat: invalid.
5. Rarity below 5★: supported later with different max level and roll values.
6. Artifact with wrong main stat but high substat: recommendation should say “niche/off-piece only,” not simply “good.”
7. Character-specific scaling: generic profile may misjudge HP/DEF/EM pieces.

---

## 22. Testing Plan

### 22.1 Unit Tests

Test files:

```text
src/lib/artifact/validation.test.ts
src/lib/artifact/distribution.test.ts
src/lib/artifact/enumeration.test.ts
src/lib/artifact/scoring.test.ts
src/lib/artifact/recommendation.test.ts
```

### 22.2 Required Test Cases

#### TC-001 — Main Stat Exclusion

Input:

```text
Main stat: DEF%
Existing substats: CRIT DMG, EM, Flat DEF
```

Expected:

```text
DEF% not available as new substat.
Flat DEF remains valid.
```

#### TC-002 — Unactivated Handling

Input:

```text
+0 artifact, 3 active substats, 1 unactivated CRIT Rate
```

Expected:

```text
+4 activates CRIT Rate with probability 100%.
No weighted new substat roll occurs.
```

#### TC-003 — Uniform Slot Upgrade

Input:

```text
4 active substats, 1 upgrade event
```

Expected:

```text
Each slot probability = 25%.
```

#### TC-004 — Binomial Crit Target

Input:

```text
4 active substats, target stats = CRIT Rate + CRIT DMG, 4 upgrades remain
```

Expected:

```text
P(0) = 6.25%
P(1) = 25.00%
P(2) = 37.50%
P(3) = 25.00%
P(4) = 6.25%
```

#### TC-005 — Weighted New Substat

Input:

```text
Main stat: FLAT_ATK
Existing substats: ATK%, ER, CRIT Rate
Candidate: CRIT DMG
```

Expected:

```text
Available = HP, DEF, HP%, DEF%, EM, CRIT DMG
P(CRIT DMG) = 3 / 27
```

#### TC-006 — CV Calculation

Input:

```text
CRIT Rate = 3.1
CRIT DMG = 7.0
```

Expected:

```text
CV = 13.2
```

### 22.3 Monte Carlo Validation

For simple binomial case:

- 4 active substats
- 2 target stats
- 4 upgrades remain
- 1,000,000 trials

Expected estimated distribution close to:

```text
[6.25%, 25.00%, 37.50%, 25.00%, 6.25%]
```

Tolerance:

```text
±0.2 percentage points for 1,000,000 trials
```

---

## 23. Suggested Folder Structure

```text
genshin-artifact-probability/
  README.md
  package.json
  tsconfig.json
  src/
    app/
      page.tsx
      theory/page.tsx
      compare/page.tsx
    components/
      ArtifactForm.tsx
      ScoringProfileForm.tsx
      ResultSummary.tsx
      ProbabilityTable.tsx
      DistributionChart.tsx
      RecommendationCard.tsx
    lib/
      artifact/
        constants.ts
        types.ts
        validation.ts
        distribution.ts
        upgrade.ts
        scoring.ts
        exact.ts
        monteCarlo.ts
        recommendation.ts
        formatting.ts
      profiles/
        defaultProfiles.ts
      workers/
        monteCarlo.worker.ts
    tests/
      validation.test.ts
      distribution.test.ts
      exact.test.ts
      monteCarlo.test.ts
      scoring.test.ts
```

---

## 24. Coding Agent Implementation Plan

### Phase 1 — Core Engine

1. Create TypeScript types.
2. Create constants for stats, roll values, weights, and valid main stats.
3. Implement validation.
4. Implement weighted distribution.
5. Implement CV and custom score.
6. Implement binomial target roll probability.
7. Implement exact enumeration for one artifact.
8. Add unit tests.

### Phase 2 — Basic UI

1. Create artifact input form.
2. Create scoring profile selector.
3. Show result summary.
4. Show probability table.
5. Show recommendation explanation.

### Phase 3 — Simulation and Chart

1. Add Monte Carlo engine.
2. Move heavy simulation to Web Worker.
3. Add final score histogram.
4. Add percentile output.

### Phase 4 — Persistence

1. Save recent artifacts to LocalStorage.
2. Add export/import JSON.
3. Add compare mode.

### Phase 5 — Polish

1. Add Theory page.
2. Add source links and disclaimer.
3. Improve mobile layout.
4. Add README.

---

## 25. README Draft

```md
# Genshin Artifact Probability Calculator

A web calculator for evaluating Genshin Impact artifact upgrade probability.

This app helps players decide whether an artifact is worth upgrading by calculating:

- Current CV and weighted score
- Expected final score
- Probability of hitting target substats
- Probability of reaching CV/score thresholds
- Upgrade/stop recommendation

## Disclaimer

This project is not affiliated with HoYoverse. Artifact probability assumptions are based on community-derived data from Genshin Wiki, KeqingMains resources, datamine references, and community research. HoYoverse has not officially published every artifact probability table used here.

## Key Features

- Supports 5-star artifacts
- Supports unactivated 4th substat from newer Genshin UI
- Exact probability mode
- Monte Carlo simulation mode
- Custom scoring profiles
- Crit Value and weighted score calculation

## Formula

Crit Value:

```text
CV = CRIT Rate × 2 + CRIT DMG
```

New substat probability:

```text
P(stat) = weight(stat) / sum(weight(availableStats))
```

When artifact already has 4 substats:

```text
P(each substat upgrade slot) = 25%
```

## Development

```bash
npm install
npm run dev
npm run test
```
```

---

## 26. Known Limitations

1. Probability model is community-derived, not official HoYoverse-published data.
2. Generic scoring cannot perfectly judge every character.
3. CV is not universally valid; it overvalues crit for non-crit or reaction-focused builds.
4. Displayed values in-game are rounded, so reverse-engineering exact roll history from screenshot can be ambiguous.
5. UI changes and new mechanics may require rule updates.

---

## 27. Product Decision: MVP Recommendation

MVP should focus on this exact flow:

```text
Input one artifact → choose target profile → calculate probability → show upgrade/stop recommendation.
```

Do not start from OCR, inventory import, or full build optimizer. Those features are valuable but will delay the core product. The unique value of this app is fast artifact decision-making, especially with support for `unactivated` substat shown in newer Genshin UI.

---

## 28. Definition of Done

MVP is considered done when:

1. User can input a 5★ artifact manually.
2. App validates stat legality.
3. App supports active and unactivated substats.
4. App calculates CV and custom weighted score.
5. App calculates target roll probability exactly.
6. App calculates expected final score.
7. App gives recommendation with explanation.
8. Unit tests pass for core probability logic.
9. Theory page explains assumptions and sources.
10. README clearly states that the model is community-derived and not official HoYoverse data.
