import { PointerEvent, useId } from "react";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  label: string;
  content: string;
  size?: number;
}

export function InfoTooltip({ label, content, size = 12 }: InfoTooltipProps) {
  const id = useId();

  return (
    <span className="info-tooltip">
      <button
        type="button"
        className="metric-help"
        aria-label={`${label}: ${content}`}
        aria-describedby={id}
        onPointerDown={stopPointer}
      >
        <Info size={size} aria-hidden="true" />
      </button>
      <span id={id} role="tooltip" className="info-tooltip__bubble">
        {content}
      </span>
    </span>
  );
}

function stopPointer(event: PointerEvent<HTMLButtonElement>) {
  event.stopPropagation();
}
