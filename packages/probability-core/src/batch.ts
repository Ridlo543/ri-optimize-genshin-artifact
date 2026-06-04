import {
  ArtifactInput,
  GoodArtifact,
  GoodNormalizationWarning,
  goodArtifactToArtifactInput,
  normalizeGoodArtifact
} from "@ri-genshin/artifact-schema";
import { EvaluationOptions, evaluateArtifactExact, ProbabilityResult } from "./exact";
import { ScoringProfile } from "./scoring";
import { validateArtifact } from "./validation";

export interface BatchEvaluatedArtifact {
  index: number;
  id?: string | number;
  artifact: ArtifactInput;
  result: ProbabilityResult;
  warnings: GoodNormalizationWarning[];
}

export interface BatchSkippedArtifact {
  index: number;
  id?: string | number;
  reason: string;
  warnings: GoodNormalizationWarning[];
}

export interface BatchEvaluationResult {
  evaluated: BatchEvaluatedArtifact[];
  skipped: BatchSkippedArtifact[];
  summary: {
    total: number;
    evaluated: number;
    skipped: number;
    warningCount: number;
  };
}

export function evaluateGoodArtifactBatch(
  artifacts: GoodArtifact[],
  profile: ScoringProfile,
  options: EvaluationOptions = {}
): BatchEvaluationResult {
  const evaluated: BatchEvaluatedArtifact[] = [];
  const skipped: BatchSkippedArtifact[] = [];
  let warningCount = 0;

  artifacts.forEach((good, index) => {
    const normalized = normalizeGoodArtifact(good);
    warningCount += normalized.warnings.length;
    const id = normalized.artifact?.id ?? good.id;

    if (!normalized.artifact) {
      skipped.push({
        index,
        reason: normalized.skipReason ?? "GOOD artifact could not be normalized.",
        warnings: normalized.warnings,
        ...optionalId(id)
      });
      return;
    }

    let artifact: ArtifactInput;
    try {
      artifact = goodArtifactToArtifactInput(normalized.artifact);
    } catch (error) {
      skipped.push({
        index,
        reason: error instanceof Error ? error.message : "GOOD artifact could not be mapped.",
        warnings: normalized.warnings,
        ...optionalId(id)
      });
      return;
    }

    const validation = validateArtifact(artifact);
    if (!validation.valid) {
      skipped.push({
        index,
        reason: validation.errors.join(" "),
        warnings: normalized.warnings,
        ...optionalId(id)
      });
      return;
    }

    evaluated.push({
      index,
      artifact,
      result: evaluateArtifactExact(artifact, profile, options),
      warnings: normalized.warnings,
      ...optionalId(id)
    });
  });

  return {
    evaluated,
    skipped,
    summary: {
      total: artifacts.length,
      evaluated: evaluated.length,
      skipped: skipped.length,
      warningCount
    }
  };
}

function optionalId(id: string | number | undefined): { id?: string | number } {
  return id === undefined ? {} : { id };
}
