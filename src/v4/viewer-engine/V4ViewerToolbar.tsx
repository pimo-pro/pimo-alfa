import { V4Icon } from "../icons/Icon";
import type { V4ActiveTool } from "./useV4ViewerState";

interface V4ViewerToolbarProps {
  activeTool: V4ActiveTool;
  showGrid: boolean;
  showDimensions: boolean;
  hasSelection: boolean;
  onTool: (tool: V4ActiveTool) => void;
  onToggleGrid: () => void;
  onToggleDimensions: () => void;
  onResetCamera: () => void;
}

interface ToolBtnProps {
  icon: Parameters<typeof V4Icon>[0]["name"];
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolBtn({ icon, label, active, disabled, onClick }: ToolBtnProps) {
  return (
    <button
      type="button"
      className={`v4-vtb-btn${active ? " v4-vtb-btn--active" : ""}${disabled ? " v4-vtb-btn--disabled" : ""}`}
      title={label}
      data-tip={label}
      onClick={onClick}
      disabled={disabled}
    >
      <V4Icon name={icon} size={14} />
    </button>
  );
}

function Sep() {
  return <div className="v4-vtb-sep" />;
}

/**
 * Compact toolbar rendered ABOVE the 3D canvas.
 * Groups: Selection tools | Transform tools | View tools | Camera
 */
export function V4ViewerToolbar({
  activeTool,
  showGrid,
  showDimensions,
  hasSelection,
  onTool,
  onToggleGrid,
  onToggleDimensions,
  onResetCamera,
}: V4ViewerToolbarProps) {
  return (
    <div className="v4-vtb">

      {/* Group 1: Selection */}
      <ToolBtn
        icon="select"
        label="Selecionar  (S)"
        active={activeTool === "select"}
        onClick={() => onTool("select")}
      />

      <Sep />

      {/* Group 2: Transform — active only when object is selected */}
      <ToolBtn
        icon="move"
        label="Mover  (M)"
        active={activeTool === "translate"}
        disabled={!hasSelection}
        onClick={() => onTool("translate")}
      />
      <ToolBtn
        icon="rotate"
        label="Rodar  (R)"
        active={activeTool === "rotate"}
        disabled={!hasSelection}
        onClick={() => onTool("rotate")}
      />

      <Sep />

      {/* Group 3: Measurement & view aids */}
      <ToolBtn
        icon="ruler"
        label="Medições  (D)"
        active={showDimensions || activeTool === "ruler"}
        onClick={() => {
          onTool("ruler");
          onToggleDimensions();
        }}
      />
      <ToolBtn
        icon="grid"
        label="Grelha  (G)"
        active={showGrid}
        onClick={onToggleGrid}
      />

      <Sep />

      {/* Group 4: Camera */}
      <ToolBtn
        icon="camera"
        label="Repor câmera  (Home)"
        onClick={onResetCamera}
      />

    </div>
  );
}
