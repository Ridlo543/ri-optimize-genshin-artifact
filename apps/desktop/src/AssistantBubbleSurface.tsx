import { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, PointerEvent, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { Eye, GripVertical, Info, Maximize2, Minus, Power, RotateCcw, ScanLine, SlidersHorizontal, Square } from "lucide-react";
import { AssistantSummary } from "./assistantSummary";
import { InfoTooltip } from "./InfoTooltip";
import {
  ARTIFACT_LEVEL_OPTIONS,
  ARTIFACT_SLOT_OPTIONS,
  ArtifactMainStatCorrectionSelection,
  ArtifactSlotCorrectionSelection,
  getArtifactMainStatOptions
} from "./scannerCorrection";
import { GOOD_SLOT_KEY_TO_LABEL, GOOD_STAT_KEY_TO_LABEL } from "@ri-genshin/artifact-schema";

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
  roiAttention?: boolean;
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
  roiAttention = false,
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
  const passiveMode = isTauri();
  const passiveFocusProps = passiveMode ? createPassiveFocusProps() : undefined;

  if (collapsed) {
    return (
      <div
        role="button"
        className={`assistant-launcher assistant-launcher--${summary.state}`}
        data-testid="assistant-launcher"
        style={style}
        aria-label={`Open artifact assistant: ${summary.title}`}
        tabIndex={passiveMode ? -1 : 0}
        {...passiveFocusProps}
        {...launcherGesture}
      >
        <AssistantLogoMark />
        <span className="assistant-launcher__dot" aria-hidden="true" />
      </div>
    );
  }

  return (
    <main className={`assistant-bubble assistant-bubble--${summary.state}`} data-testid="assistant-bubble" style={style}>
      <header className={`assistant-bubble__header ${onMove ? "assistant-bubble__header--draggable" : ""}`} onPointerDown={headerDragAction(onMove)}>
        <span className="assistant-drag-grip" title={onMove ? "Drag assistant" : undefined} aria-hidden="true">
          <GripVertical size={16} />
        </span>
        <div className="assistant-title">
          <b>{summary.title}</b>
          <span>{error || summary.detail}</span>
        </div>
        <button
          className="icon-button assistant-collapse-button"
          data-testid="assistant-collapse"
          title="Minimize to bubble"
          aria-label="Minimize to bubble"
          tabIndex={passiveMode ? -1 : undefined}
          {...passiveFocusProps}
          {...buttonAction(onToggleCollapsed)}
        >
          <Minus className="assistant-collapse-icon" size={16} />
        </button>
        {onQuit ? (
          <button
            className="icon-button"
            data-testid="assistant-quit"
            title="Quit"
            aria-label="Quit"
            tabIndex={passiveMode ? -1 : undefined}
            {...passiveFocusProps}
            {...buttonAction(onQuit)}
          >
            <Power size={14} />
          </button>
        ) : null}
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
                    {GOOD_SLOT_KEY_TO_LABEL[slot] ?? slot}
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
                    {GOOD_STAT_KEY_TO_LABEL[stat] ?? stat}
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
          <button
            className="primary"
            disabled={!canApplyCorrection(levelCorrection)}
            tabIndex={passiveMode ? -1 : undefined}
            {...passiveFocusProps}
            {...buttonAction(levelCorrection.onApply)}
          >
            Apply
          </button>
        </div>
      ) : null}

      <footer className="assistant-actions">
        <button className="primary" data-testid="assistant-analyze" disabled={busy} tabIndex={passiveMode ? -1 : undefined} {...passiveFocusProps} {...buttonAction(onScan)}>
          <ScanLine size={15} />
          {busy ? "OCR" : "Analyze"}
        </button>
        <button className="icon-button" data-testid="assistant-watch" title={watching ? "Stop Watch" : "Watch"} tabIndex={passiveMode ? -1 : undefined} {...passiveFocusProps} {...buttonAction(onToggleWatch)}>
          {watching ? <Square size={15} /> : <Eye size={15} />}
        </button>
        <button className={`icon-button ${roiAttention ? "assistant-actions__roi--attention" : ""}`} data-testid="assistant-edit-roi" title="Set the scan area over an artifact detail panel" aria-label="Set Area" tabIndex={passiveMode ? -1 : undefined} {...passiveFocusProps} {...buttonAction(onEditRoi)}>
          <SlidersHorizontal size={15} />
        </button>
        <button className="icon-button" data-testid="assistant-toggle-details" title={detailsOpen ? "Hide info" : "Show info"} aria-label={detailsOpen ? "Hide info" : "Show info"} aria-expanded={detailsOpen} tabIndex={passiveMode ? -1 : undefined} {...passiveFocusProps} {...buttonAction(onToggleDetails)}>
          <Info size={15} />
        </button>
        {onOpenPanel ? (
          <button className="icon-button" data-testid="assistant-open-panel" title="Open Panel" tabIndex={passiveMode ? -1 : undefined} {...passiveFocusProps} {...buttonAction(onOpenPanel)}>
            <Maximize2 size={15} />
          </button>
        ) : null}
      </footer>

      {detailsOpen ? (
        <div className="assistant-details" data-testid="assistant-details">
          {summary.details.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {onQuit ? (
            <div className="assistant-details__actions">
              {onResetPosition ? (
                <button title="Reset assistant position" tabIndex={passiveMode ? -1 : undefined} {...passiveFocusProps} {...buttonAction(onResetPosition)}>
                  <RotateCcw size={15} />
                  Reset position
                </button>
              ) : null}
              <button className="assistant-quit" tabIndex={passiveMode ? -1 : undefined} {...passiveFocusProps} {...buttonAction(onQuit)}>
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

function createPassiveFocusProps() {
  return {
    onFocus: (event: FocusEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.blur();
    }
  };
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

function useLauncherGesture(toggle: () => void, move?: () => void) {
  const gesture = useRef<{ pointerId: number; x: number; y: number; dragging: boolean; toggled: boolean } | null>(null);
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false, toggled: false };
    },
    onMouseDown: (event: MouseEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    },
    onMouseUp: (event: MouseEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      const current = gesture.current;
      if (current && !current.dragging && !current.toggled) {
        event.preventDefault();
        event.stopPropagation();
        current.toggled = true;
        toggle();
      }
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
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
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const current = gesture.current;
      if (current && !current.dragging && !current.toggled) {
        event.preventDefault();
        event.stopPropagation();
        current.toggled = true;
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
      <svg viewBox="0 0 64 64" className="assistant-logo-mark__icon" width="100%" height="100%">
        <defs>
          <linearGradient id="logo-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f6e182"/>
            <stop offset="100%" stopColor="#d39d43"/>
          </linearGradient>
          <radialGradient id="logo-core">
            <stop offset="0%" stopColor="#e6f3ff"/>
            <stop offset="50%" stopColor="#8ec5ff"/>
            <stop offset="100%" stopColor="#5299d1"/>
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="29" fill="none" stroke="url(#logo-ring)" strokeWidth="3.5"/>
        <path d="M32 11 Q40 24 53 32 Q40 40 32 53 Q24 40 11 32 Q24 24 32 11 Z" fill="url(#logo-ring)" opacity="0.92"/>
        <circle cx="32" cy="32" r="4" fill="url(#logo-core)"/>
        <circle cx="31" cy="31" r="1.5" fill="#fff" opacity="0.35"/>
      </svg>
    </span>
  );
}

function buttonAction(action: () => void) {
  return {
    onMouseDown: (event: MouseEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    },
    onMouseUp: (event: MouseEvent<HTMLButtonElement>) => {
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
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    action();
  };
}
