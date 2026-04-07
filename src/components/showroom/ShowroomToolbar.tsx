import type { CSSProperties, ReactNode } from "react";

import { useShowroomStore, type ShowroomTool } from "./showroomStore";

// ---------------------------------------------------------------------------
// Ícones SVG inline — 20×20, stroke-based
// ---------------------------------------------------------------------------

function Icon({
  d,
  size = 18,
  extra,
}: {
  d: string | string[];
  size?: number;
  extra?: ReactNode;
}) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      {paths.map((p, i) => (
        <path key={i} d={p} />
      ))}
      {extra}
    </svg>
  );
}

// Ícones por ação
const ICONS = {
  move: [
    "M5 9l-3 3 3 3",
    "M9 5l3-3 3 3",
    "M15 19l-3 3-3-3",
    "M19 9l3 3-3 3",
    "M2 12h20",
    "M12 2v20",
  ],
  rotate: [
    "M21 12a9 9 0 1 1-9-9",
    "M21 3v4h-4",
  ],
  measure: [
    "M3 3h18",
    "M3 21h18",
    "M8 3v3",
    "M16 3v3",
    "M8 18v3",
    "M16 18v3",
    "M12 3v18",
  ],
  rotateMinus: ["M1 4v6h6", "M3.51 15a9 9 0 1 0 .49-3.5"],
  rotatePlus: ["M23 4v6h-6", "M20.49 15a9 9 0 1 1-.49-3.5"],
  freeRotate: ["M12 2a10 10 0 0 1 7.38 16.75", "M12 2v4", "M12 22v-4", "M4.93 4.93l2.83 2.83", "M16.24 16.24l2.83 2.83"],
  zoomIn: ["M11 8v6", "M8 11h6", "M21 21l-4.35-4.35", "M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"],
  zoomOut: ["M8 11h6", "M21 21l-4.35-4.35", "M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"],
  reset: [
    "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
    "M21 3v5h-5",
    "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
    "M8 16H3v5",
  ],
  clearRuler: [
    "M3 3h18",
    "M3 21h18",
    "M18 3v18",
    "M3 3l18 18",
  ],
};

// ---------------------------------------------------------------------------
// ToolButton — botão de ícone compacto
// ---------------------------------------------------------------------------

type ToolBtnProps = {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ToolBtn({ title, active = false, disabled = false, onClick, children }: ToolBtnProps) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 6,
    border: active
      ? "2px solid var(--ui-color-primary, #2563eb)"
      : "1px solid var(--border, #d4d4d8)",
    background: active
      ? "var(--ui-color-primary-light, rgba(37,99,235,0.08))"
      : "var(--ui-color-bg, #fff)",
    color: active
      ? "var(--ui-color-primary, #2563eb)"
      : disabled
      ? "var(--ui-color-muted, #a1a1aa)"
      : "var(--ui-color-text, #18181b)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "background 0.12s, border-color 0.12s, color 0.12s",
    padding: 0,
    outline: "none",
    flexShrink: 0,
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={base}
      onMouseEnter={(e) => {
        if (!disabled && !active) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--ui-color-surface, #f4f4f5)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--ui-color-bg, #fff)";
        }
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      style={{ width: 1, height: 20, background: "var(--border, #d4d4d8)", flexShrink: 0 }}
    />
  );
}

// ---------------------------------------------------------------------------
// ShowroomToolbar
// ---------------------------------------------------------------------------

export function ShowroomToolbar() {
  const activeTool = useShowroomStore((s) => s.activeTool);
  const setActiveTool = useShowroomStore((s) => s.setActiveTool);
  const selectedId = useShowroomStore((s) => s.selectedId);
  const rotateProject90 = useShowroomStore((s) => s.rotateProject90);
  const clearMeasurement = useShowroomStore((s) => s.clearMeasurement);
  const resetCamera = useShowroomStore((s) => s.resetCamera);
  const adjustCameraZoom = useShowroomStore((s) => s.adjustCameraZoom);
  const measurePointA = useShowroomStore((s) => s.measurePointA);
  const measurePointB = useShowroomStore((s) => s.measurePointB);

  const setTool = (t: ShowroomTool) => {
    setActiveTool(t);
    if (t !== "measure") clearMeasurement();
  };

  const hasMeasure = Boolean(measurePointA || measurePointB);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        alignItems: "center",
        marginBottom: 6,
        padding: "5px 8px",
        background: "var(--ui-color-surface, #f4f4f5)",
        borderRadius: 8,
        border: "1px solid var(--border, #d4d4d8)",
      }}
    >
      {/* Ferramentas principais */}
      <ToolBtn title="Mover" active={activeTool === "move"} onClick={() => setTool("move")}>
        <Icon d={ICONS.move} size={17} />
      </ToolBtn>
      <ToolBtn title="Rodar" active={activeTool === "rotate"} onClick={() => setTool("rotate")}>
        <Icon d={ICONS.rotate} size={17} />
      </ToolBtn>
      <ToolBtn title="Régua" active={activeTool === "measure"} onClick={() => setTool("measure")}>
        <Icon d={ICONS.measure} size={17} />
      </ToolBtn>

      <Divider />

      {/* Rotações */}
      <ToolBtn
        title="Rotação −90°"
        disabled={!selectedId}
        onClick={() => selectedId && rotateProject90(selectedId, -1)}
      >
        <Icon d={ICONS.rotateMinus} size={17} />
      </ToolBtn>
      <ToolBtn
        title="Rotação +90°"
        disabled={!selectedId}
        onClick={() => selectedId && rotateProject90(selectedId, 1)}
      >
        <Icon d={ICONS.rotatePlus} size={17} />
      </ToolBtn>
      <ToolBtn title="Rodar livre (Shift + arrastar)" disabled onClick={() => {}}>
        <Icon d={ICONS.freeRotate} size={17} />
      </ToolBtn>

      <Divider />

      {/* Câmara */}
      <ToolBtn title="Zoom +" onClick={() => adjustCameraZoom(0.9)}>
        <Icon d={ICONS.zoomIn} size={17} />
      </ToolBtn>
      <ToolBtn title="Zoom −" onClick={() => adjustCameraZoom(1.1)}>
        <Icon d={ICONS.zoomOut} size={17} />
      </ToolBtn>
      <ToolBtn title="Reset câmara" onClick={() => resetCamera()}>
        <Icon d={ICONS.reset} size={17} />
      </ToolBtn>

      <Divider />

      {/* Régua */}
      <ToolBtn
        title="Limpar régua"
        disabled={!hasMeasure}
        onClick={() => clearMeasurement()}
      >
        <Icon d={ICONS.clearRuler} size={17} />
      </ToolBtn>

      {/* Legenda compacta */}
      <span
        style={{
          marginLeft: 4,
          fontSize: 10,
          color: "var(--ui-color-muted, #a1a1aa)",
          whiteSpace: "nowrap",
        }}
      >
        Shift + arrastar = rodar livre · ↑↓←→ = ajuste fino
      </span>
    </div>
  );
}
