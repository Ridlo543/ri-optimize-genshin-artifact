import { CSSProperties, KeyboardEvent, PointerEvent, useRef } from "react";
import { Eye, Gem, GripVertical, List, Maximize2, Minus, Power, RotateCcw, ScanLine, SlidersHorizontal, Square } from "lucide-react";
import { AssistantSummary } from "./assistantSummary";
import { InfoTooltip } from "./InfoTooltip";
import {
  ARTIFACT_LEVEL_OPTIONS,
  ARTIFACT_SLOT_OPTIONS,
  ArtifactMainStatCorrectionSelection,
  ArtifactSlotCorrectionSelection,
  getArtifactMainStatOptions
} from "./scannerCorrection";

export interface AssistantLevelCorrection {
  available: boolean;
  level: number;
  slotKey: ArtifactSlotCorrectionSelection;
  mainStatKey: ArtifactMainStatCorrectionSelection;
  reason: string;
  needsLevel?: boolean;
  needsSlotKey?: boolean;
  needsMainStatKey?: boolean;
  onLevelChange: (level: number) => void;
  onSlotKeyChange: (slotKey: ArtifactSlotCorrectionSelection) => void;
  onMainStatKeyChange: (mainStatKey: ArtifactMainStatCorrectionSelection) => void;
  onApply: () => void;
}

export interface AssistantBubbleSurfaceProps {
  summary: AssistantSummary;
  collapsed: boolean;
  busy: boolean;
  watching: boolean;
  detailsOpen: boolean;
  error?: string;
  hash?: string;
  style?: CSSProperties | undefined;
  levelCorrection?: AssistantLevelCorrection | undefined;
  onToggleCollapsed: () => void;
  onScan: () => void;
  onToggleWatch: () => void;
  onEditRoi: () => void;
  onToggleDetails: () => void;
  onOpenPanel?: () => void;
  onMove?: () => void;
  onResetPosition?: () => void;
  onQuit?: () => void;
}

export function AssistantBubbleSurface({
  summary,
  collapsed,
  busy,
  watching,
  detailsOpen,
  error,
  hash,
  style,
  levelCorrection,
  onToggleCollapsed,
  onScan,
  onToggleWatch,
  onEditRoi,
  onToggleDetails,
  onOpenPanel,
  onMove,
  onResetPosition,
  onQuit
}: AssistantBubbleSurfaceProps) {
  const launcherGesture = useLauncherGesture(onToggleCollapsed, onMove);

  if (collapsed) {
    return (
      <button
        type="button"
        className={`assistant-launcher assistant-launcher--${summary.state}`}
        style={style}
        aria-label={`Open artifact assistant: ${summary.title}`}
        {...launcherGesture}
      >
        <AssistantLogoMark />
        <span className="assistant-launcher__dot" aria-hidden="true" />
      </button>
    );
  }

  return (
    <main className={`assistant-bubble assistant-bubble--${summary.state}`} style={style}>
      <header className={`assistant-bubble__header ${onMove ? "assistant-bubble__header--draggable" : ""}`} onPointerDown={headerDragAction(onMove)}>
        <span className="assistant-drag-grip" title={onMove ? "Drag assistant" : undefined} aria-hidden="true">
          <GripVertical size={16} />
        </span>
        <div className="assistant-title">
          <b>{summary.title}</b>
          <span>{error || summary.detail}</span>
        </div>
        <button className="icon-button assistant-collapse-button" title="Minimize to bubble" aria-label="Minimize to bubble" {...buttonAction(onToggleCollapsed)}>
          <Minus className="assistant-collapse-icon" size={16} />
        </button>
      </header>

      {summary.metrics.length > 0 ? (
        <div className="assistant-metrics">
          {summary.metrics.map((metric) => (
            <div key={metric.label}>
              <span>
                {metric.label}
                <InfoTooltip label={metric.label} content={metric.help} size={10} />
              </span>
              <b>{metric.value}</b>
            </div>
          ))}
        </div>
      ) : null}

      {levelCorrection?.available ? (
        <div className="assistant-level-correction">
          {levelCorrection.needsSlotKey ? (
            <label>
              <span>Slot</span>
              <select value={levelCorrection.slotKey} onChange={(event) => levelCorrection.onSlotKeyChange(event.target.value as ArtifactSlotCorrectionSelection)}>
                <option value="">Select slot</option>
                {ARTIFACT_SLOT_OPTIONS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slotLabel(slot)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {levelCorrection.needsMainStatKey ? (
            <label>
              <span>Main</span>
              <select
                value={levelCorrection.mainStatKey}
                onChange={(event) => levelCorrection.onMainStatKeyChange(event.target.value as ArtifactMainStatCorrectionSelection)}
                disabled={getArtifactMainStatOptions(levelCorrection.slotKey).length === 0}
              >
                <option value="">Select main stat</option>
                {getArtifactMainStatOptions(levelCorrection.slotKey).map((stat) => (
                  <option key={stat} value={stat}>
                    {statLabel(stat)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {levelCorrection.needsLevel ? (
            <label>
              <span>Level</span>
              <select value={levelCorrection.level} onChange={(event) => levelCorrection.onLevelChange(Number(event.target.value))}>
                {ARTIFACT_LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    +{level}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button className="primary" disabled={!canApplyCorrection(levelCorrection)} {...buttonAction(levelCorrection.onApply)}>
            Apply
          </button>
        </div>
      ) : null}

      <footer className="assistant-actions">
        <button className="primary" disabled={busy} {...buttonAction(onScan)}>
          <ScanLine size={15} />
          {busy ? "OCR" : "Analyze"}
        </button>
        <button className="icon-button" title={watching ? "Stop Watch" : "Watch"} {...buttonAction(onToggleWatch)}>
          {watching ? <Square size={15} /> : <Eye size={15} />}
        </button>
        <button className="icon-button" title="Edit ROI" {...buttonAction(onEditRoi)}>
          <SlidersHorizontal size={15} />
        </button>
        <button className="icon-button" title="Details" {...buttonAction(onToggleDetails)}>
          <List size={15} />
        </button>
        {onOpenPanel ? (
          <button className="icon-button" title="Open Panel" {...buttonAction(onOpenPanel)}>
            <Maximize2 size={15} />
          </button>
        ) : null}
      </footer>

      {detailsOpen ? (
        <div className="assistant-details">
          {summary.details.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {onQuit ? (
            <div className="assistant-details__actions">
              {onResetPosition ? (
                <button title="Reset assistant position" {...buttonAction(onResetPosition)}>
                  <RotateCcw size={15} />
                  Reset position
                </button>
              ) : null}
              <button className="assistant-quit" {...buttonAction(onQuit)}>
                <Power size={15} />
                Quit
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="assistant-footnote">
        <span>OCR {summary.confidence}</span>
        <span>{hash ? hash.slice(0, 8) : "no hash"}</span>
      </div>
    </main>
  );
}

function canApplyCorrection(correction: AssistantLevelCorrection): boolean {
  if (correction.needsSlotKey && !correction.slotKey) {
    return false;
  }
  if (correction.needsMainStatKey && !correction.mainStatKey) {
    return false;
  }
  return true;
}

function slotLabel(value: string): string {
  return ({ flower: "Flower", plume: "Plume", sands: "Sands", goblet: "Goblet", circlet: "Circlet" } as Record<string, string>)[value] ?? value;
}

function statLabel(value: string): string {
  return (
    {
      hp: "HP",
      atk: "ATK",
      hp_: "HP%",
      atk_: "ATK%",
      def_: "DEF%",
      eleMas: "Elemental Mastery",
      enerRech_: "Energy Recharge",
      critRate_: "CRIT Rate",
      critDMG_: "CRIT DMG",
      pyro_dmg_: "Pyro DMG",
      hydro_dmg_: "Hydro DMG",
      electro_dmg_: "Electro DMG",
      cryo_dmg_: "Cryo DMG",
      anemo_dmg_: "Anemo DMG",
      geo_dmg_: "Geo DMG",
      dendro_dmg_: "Dendro DMG",
      physical_dmg_: "Physical DMG",
      heal_: "Healing Bonus"
    } as Record<string, string>
  )[value] ?? value;
}

function useLauncherGesture(toggle: () => void, move?: () => void) {
  const gesture = useRef<{ pointerId: number; x: number; y: number; dragging: boolean } | null>(null);
  return {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId || current.dragging || !move) {
        return;
      }
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) {
        return;
      }
      current.dragging = true;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released by the native drag handoff.
      }
      move();
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      const current = gesture.current;
      gesture.current = null;
      if (current && !current.dragging) {
        toggle();
      }
    },
    onPointerCancel: () => {
      gesture.current = null;
    },
    onKeyDown: keyboardAction(toggle)
  };
}

function headerDragAction(move?: () => void) {
  return (event: PointerEvent<HTMLElement>) => {
    if (!move || event.button !== 0 || (event.target as Element).closest("button, select, input")) {
      return;
    }
    event.preventDefault();
    move();
  };
}

function AssistantLogoMark() {
  return (
    <span className="assistant-logo-mark" aria-hidden="true">
      <Gem className="assistant-logo-mark__gem" size={29} />
      <ScanLine className="assistant-logo-mark__scan" size={15} />
    </span>
  );
}

function buttonAction(action: () => void) {
  return {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      action();
    },
    onKeyDown: keyboardAction(action)
  };
}

function keyboardAction(action: () => void) {
  return (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    action();
  };
}
