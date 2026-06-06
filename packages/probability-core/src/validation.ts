import { ArtifactInput, getMaxArtifactLevel, isArtifactRarity, StatType, SubstatInput } from "@ri-genshin/artifact-schema";
import { MINOR_STATS, VALID_MAIN_STATS_BY_PIECE } from "./constants";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateArtifact(artifact: ArtifactInput): ValidationResult {
  const errors: string[] = [];
  const validMainStats = VALID_MAIN_STATS_BY_PIECE[artifact.piece] ?? [];

  if (!validMainStats.includes(artifact.mainStat)) {
    errors.push(`Main stat ${artifact.mainStat} is not valid for ${artifact.piece}.`);
  }

  if (!isArtifactRarity(artifact.rarity)) {
    errors.push("Artifact rarity must be an integer from 2 to 5.");
  }

  if (!Number.isInteger(artifact.level) || artifact.level < 0 || artifact.level > 20) {
    errors.push("Artifact level must be an integer from 0 to 20.");
  } else if (isArtifactRarity(artifact.rarity) && artifact.level > getMaxArtifactLevel(artifact.rarity)) {
    errors.push(`Artifact level must be at most +${getMaxArtifactLevel(artifact.rarity)} for ${artifact.rarity}-star artifacts.`);
  }

  const seen = new Set<StatType>();
  for (const substat of artifact.substats) {
    if (!MINOR_STATS.includes(substat.stat)) {
      errors.push(`Substat ${substat.stat} is not a valid minor affix.`);
    }
    if (substat.stat === artifact.mainStat) {
      errors.push(`Substat ${substat.stat} duplicates the main stat.`);
    }
    if (seen.has(substat.stat)) {
      errors.push(`Duplicate substat ${substat.stat}.`);
    }
    seen.add(substat.stat);
    if (!Number.isFinite(substat.value) || substat.value < 0) {
      errors.push(`Substat ${substat.stat} has an invalid value.`);
    }
  }

  const activeCount = countActiveSubstats(artifact.substats);
  const inactiveCount = artifact.substats.length - activeCount;
  if (activeCount > 4) {
    errors.push("Artifact cannot have more than 4 active substats.");
  }
  if (inactiveCount > 1) {
    errors.push("Artifact cannot have more than 1 unactivated substat.");
  }
  if (inactiveCount === 1 && !(artifact.rarity === 5 && artifact.level === 0 && activeCount === 3)) {
    errors.push("Unactivated substat is only valid on a 5-star +0 artifact with 3 active substats.");
  }
  if (artifact.substats.length > 4) {
    errors.push("Artifact cannot have more than 4 known substats.");
  }
  if (isArtifactRarity(artifact.rarity) && artifact.level === getMaxArtifactLevel(artifact.rarity) && inactiveCount > 0) {
    errors.push(`+${getMaxArtifactLevel(artifact.rarity)} artifact cannot have an unactivated substat.`);
  }

  return { valid: errors.length === 0, errors };
}

export function countActiveSubstats(substats: SubstatInput[]): number {
  return substats.filter((substat) => substat.active).length;
}
