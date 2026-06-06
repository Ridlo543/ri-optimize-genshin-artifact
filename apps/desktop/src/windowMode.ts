export type WindowMode = "main" | "roi-overlay" | "assistant-bubble" | "fixture-playground";

const WINDOW_MODES = new Set<WindowMode>(["main", "roi-overlay", "assistant-bubble", "fixture-playground"]);

export function resolveWindowMode(search: string, nativeLabel?: string | null): WindowMode {
  if (nativeLabel && WINDOW_MODES.has(nativeLabel as WindowMode)) {
    return nativeLabel as WindowMode;
  }

  const requested = new URLSearchParams(search).get("window");
  return requested && WINDOW_MODES.has(requested as WindowMode) ? (requested as WindowMode) : "main";
}
