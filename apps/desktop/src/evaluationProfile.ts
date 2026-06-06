import { DEFAULT_PROFILES } from "@ri-genshin/probability-core";
import type { ScoringProfile } from "@ri-genshin/probability-core";

const STORAGE_KEY = "ri-genshin.evaluation.profile.v1";

export function loadEvaluationProfile(): ScoringProfile {
  const id = window.localStorage.getItem(STORAGE_KEY);
  return DEFAULT_PROFILES.find((profile) => profile.id === id) ?? DEFAULT_PROFILES[0];
}

export function saveEvaluationProfile(id: string): void {
  if (DEFAULT_PROFILES.some((profile) => profile.id === id)) {
    window.localStorage.setItem(STORAGE_KEY, id);
  }
}
