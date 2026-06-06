import { ArtifactInput, StatType, SubstatInput } from "@ri-genshin/artifact-schema";
import { getNewSubstatDistribution, getRemainingMilestones, getRollValues } from "./distribution";
import { recommendArtifact, Recommendation } from "./recommendation";
import {
  assessMainStatFit,
  calculateCV,
  calculateUsefulRollValue,
  calculateWeightedScore,
  MainStatFit,
  round,
  ScoringProfile
} from "./scoring";
import { validateArtifact } from "./validation";

export interface OutcomeState {
  artifact: ArtifactInput;
  probability: number;
  targetRolls: number;
}

export interface ProbabilityResult {
  /** @deprecated Use usefulRollValue for profile-based decisions. */
  currentScore: number;
  /** @deprecated Use knownCritValue. */
  currentCV: number;
  activeCritValue: number;
  knownCritValue: number;
  expectedFinalCritValue: number;
  usefulRollValue: number;
  activeUsefulRollValue: number;
  expectedFinalUsefulRollValue: number;
  probabilityReachProfileTarget: number;
  modelVersion: string;
  profileContext: {
    id: string;
    name: string;
    targetUsefulRollValue: number;
    mainStatFit: MainStatFit;
    setFit: "not-evaluated";
  };
  /** @deprecated Legacy raw weighted score for advanced diagnostics. */
  expectedFinalScore: number;
  /** @deprecated Use expectedFinalCritValue. */
  expectedFinalCV: number;
  probabilityByTargetRollCount: Record<number, number>;
  /** @deprecated Legacy raw weighted-score thresholds for advanced diagnostics. */
  probabilityReachScoreThreshold: Record<number, number>;
  probabilityReachCVThreshold: Record<number, number>;
  remainingUpgradeEvents: number;
  outcomeCount: number;
  recommendation: Recommendation;
}

export interface EvaluationOptions {
  scoreThresholds?: number[];
  cvThresholds?: number[];
}

const DEFAULT_SCORE_THRESHOLDS = [20, 25, 30, 35, 40];
const DEFAULT_CV_THRESHOLDS = [20, 25, 30, 35, 40];
export const PROBABILITY_MODEL_VERSION = "artifact-exact-v2";

export function evaluateArtifactExact(
  artifact: ArtifactInput,
  profile: ScoringProfile,
  options: EvaluationOptions = {}
): ProbabilityResult {
  const validation = validateArtifact(artifact);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  const outcomes = enumerateOutcomes(artifact, profile.targetStats);
  const scoreThresholds = uniqueSorted([...(options.scoreThresholds ?? DEFAULT_SCORE_THRESHOLDS), profile.thresholds.goodScore, profile.thresholds.excellentScore]);
  const cvThresholds = uniqueSorted(options.cvThresholds ?? DEFAULT_CV_THRESHOLDS);
  const probabilityByTargetRollCount: Record<number, number> = {};
  const probabilityReachScoreThreshold = Object.fromEntries(scoreThresholds.map((threshold) => [threshold, 0])) as Record<number, number>;
  const probabilityReachCVThreshold = Object.fromEntries(cvThresholds.map((threshold) => [threshold, 0])) as Record<number, number>;

  let expectedFinalScore = 0;
  let expectedFinalCV = 0;
  let expectedFinalUsefulRollValue = 0;
  let probabilityReachProfileTarget = 0;

  for (const outcome of outcomes) {
    const score = calculateWeightedScore(outcome.artifact, profile, false);
    const cv = calculateCV(outcome.artifact.substats, false);
    const usefulRollValue = calculateUsefulRollValue(outcome.artifact, profile, false);
    expectedFinalScore += score * outcome.probability;
    expectedFinalCV += cv * outcome.probability;
    expectedFinalUsefulRollValue += usefulRollValue * outcome.probability;
    if (usefulRollValue >= profile.thresholds.goodUsefulRollValue) {
      probabilityReachProfileTarget += outcome.probability;
    }
    probabilityByTargetRollCount[outcome.targetRolls] = (probabilityByTargetRollCount[outcome.targetRolls] ?? 0) + outcome.probability;

    for (const threshold of scoreThresholds) {
      if (score >= threshold) {
        probabilityReachScoreThreshold[threshold] = (probabilityReachScoreThreshold[threshold] ?? 0) + outcome.probability;
      }
    }
    for (const threshold of cvThresholds) {
      if (cv >= threshold) {
        probabilityReachCVThreshold[threshold] = (probabilityReachCVThreshold[threshold] ?? 0) + outcome.probability;
      }
    }
  }

  const remainingUpgradeEvents = countRemainingStatRollEvents(artifact);
  const activeCritValue = calculateCV(artifact.substats, false);
  const knownCritValue = calculateCV(artifact.substats, true);
  const usefulRollValue = calculateUsefulRollValue(artifact, profile, true);
  const activeUsefulRollValue = calculateUsefulRollValue(artifact, profile, false);

  const resultForRecommendation = {
    currentScore: calculateWeightedScore(artifact, profile, true),
    currentCV: knownCritValue,
    activeCritValue,
    knownCritValue,
    usefulRollValue,
    expectedFinalUsefulRollValue: round(expectedFinalUsefulRollValue, 3),
    probabilityReachProfileTarget: round(probabilityReachProfileTarget, 8),
    expectedFinalScore: round(expectedFinalScore, 3),
    expectedFinalCV: round(expectedFinalCV, 3),
    probabilityReachScoreThreshold: roundRecord(probabilityReachScoreThreshold, 8),
    probabilityReachCVThreshold: roundRecord(probabilityReachCVThreshold, 8),
    remainingUpgradeEvents,
    rarity: artifact.rarity
  };

  return {
    ...resultForRecommendation,
    activeUsefulRollValue,
    expectedFinalCritValue: resultForRecommendation.expectedFinalCV,
    modelVersion: PROBABILITY_MODEL_VERSION,
    profileContext: {
      id: profile.id,
      name: profile.name,
      targetUsefulRollValue: profile.thresholds.goodUsefulRollValue,
      mainStatFit: assessMainStatFit(artifact, profile),
      setFit: "not-evaluated"
    },
    probabilityByTargetRollCount: roundRecord(probabilityByTargetRollCount, 8),
    outcomeCount: outcomes.length,
    recommendation: recommendArtifact(resultForRecommendation, profile)
  };
}

export function enumerateOutcomes(initial: ArtifactInput, targetStats: StatType[]): OutcomeState[] {
  let states: OutcomeState[] = [
    {
      artifact: cloneArtifact(initial),
      probability: 1,
      targetRolls: 0
    }
  ];

  for (const milestone of getRemainingMilestones(initial.level, initial.rarity)) {
    const nextStates: OutcomeState[] = [];

    for (const state of states) {
      const active = state.artifact.substats.filter((substat) => substat.active);
      const unactivated = state.artifact.substats.find((substat) => !substat.active);

      if (active.length < 4) {
        if (unactivated) {
          const artifact = cloneArtifact(state.artifact);
          artifact.substats = artifact.substats.map((substat) =>
            substat.active ? substat : { ...substat, active: true, source: "VISIBLE" }
          );
          artifact.level = milestone;
          nextStates.push({ ...state, artifact });
        } else {
          for (const candidate of getNewSubstatDistribution(state.artifact)) {
            const rollValues = getRollValues(candidate.stat, state.artifact.rarity);
            for (const value of rollValues) {
              const artifact = cloneArtifact(state.artifact);
              artifact.substats.push({
                stat: candidate.stat,
                value,
                active: true,
                source: "SIMULATED"
              });
              artifact.level = milestone;
              nextStates.push({
                artifact,
                probability: state.probability * candidate.probability * (1 / rollValues.length),
                targetRolls: state.targetRolls
              });
            }
          }
        }
      } else {
        for (let slotIndex = 0; slotIndex < active.length; slotIndex += 1) {
          const selected = active[slotIndex];
          if (!selected) {
            continue;
          }
          const rollValues = getRollValues(selected.stat, state.artifact.rarity);
          for (const value of rollValues) {
            const artifact = cloneArtifact(state.artifact);
            const activeIndexes = artifact.substats
              .map((substat, index) => ({ substat, index }))
              .filter(({ substat }) => substat.active)
              .map(({ index }) => index);
            const sourceIndex = activeIndexes[slotIndex];
            if (sourceIndex === undefined || !artifact.substats[sourceIndex]) {
              continue;
            }
            artifact.substats[sourceIndex] = {
              ...artifact.substats[sourceIndex],
              value: round(artifact.substats[sourceIndex].value + value, 3)
            };
            artifact.level = milestone;
            nextStates.push({
              artifact,
              probability: state.probability * (1 / active.length) * (1 / rollValues.length),
              targetRolls: state.targetRolls + (targetStats.includes(selected.stat) ? 1 : 0)
            });
          }
        }
      }
    }

    states = mergeEquivalentStates(nextStates);
  }

  return states;
}

function countRemainingStatRollEvents(artifact: ArtifactInput): number {
  let activeCount = artifact.substats.filter((substat) => substat.active).length;
  let inactiveCount = artifact.substats.length - activeCount;
  let rollEvents = 0;

  for (const milestone of getRemainingMilestones(artifact.level, artifact.rarity)) {
    if (activeCount < 4) {
      if (inactiveCount > 0) {
        inactiveCount -= 1;
      }
      activeCount += 1;
    } else {
      rollEvents += 1;
    }
  }

  return rollEvents;
}

function cloneArtifact(artifact: ArtifactInput): ArtifactInput {
  return {
    ...artifact,
    substats: artifact.substats.map((substat) => ({ ...substat }))
  };
}

function mergeEquivalentStates(states: OutcomeState[]): OutcomeState[] {
  const merged = new Map<string, OutcomeState>();

  for (const state of states) {
    const key = stateKey(state);
    const existing = merged.get(key);
    if (existing) {
      existing.probability += state.probability;
    } else {
      merged.set(key, cloneState(state));
    }
  }

  return [...merged.values()];
}

function stateKey(state: OutcomeState): string {
  const substats = [...state.artifact.substats]
    .sort((a, b) => a.stat.localeCompare(b.stat))
    .map((substat) => `${substat.stat}:${substat.active ? "1" : "0"}:${substat.value.toFixed(3)}`)
    .join("|");
  return `${state.artifact.level}|${state.targetRolls}|${substats}`;
}

function cloneState(state: OutcomeState): OutcomeState {
  return {
    artifact: cloneArtifact(state.artifact),
    probability: state.probability,
    targetRolls: state.targetRolls
  };
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function roundRecord(record: Record<number, number>, digits: number): Record<number, number> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [Number(key), round(value, digits)])
  ) as Record<number, number>;
}
