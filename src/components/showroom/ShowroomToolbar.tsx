import type { CSSProperties } from "react";

import Button from "../ui/Button";

import { useShowroomStore, type ShowroomTool } from "./showroomStore";

const btnStyle = (active: boolean): CSSProperties => ({
  fontWeight: active ? 700 : 500,
  borderWidth: 2,
  borderColor: active ? "var(--ui-color-primary, #2563eb)" : undefined,
});

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

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        marginBottom: 10,
        padding: "10px 12px",
        background: "var(--ui-color-surface, #f4f4f5)",
        borderRadius: 8,
        border: "1px solid var(--border, #ddd)",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-muted, #666)", marginRight: 4 }}>Ferramenta:</span>
      <Button type="button" variant="outline" style={btnStyle(activeTool === "move")} onClick={() => setTool("move")}>
        Mover
      </Button>
      <Button
        type="button"
        variant="outline"
        style={btnStyle(activeTool === "rotate")}
        onClick={() => setTool("rotate")}
      >
        Rodar
      </Button>
      <Button
        type="button"
        variant="outline"
        style={btnStyle(activeTool === "measure")}
        onClick={() => setTool("measure")}
      >
        Régua
      </Button>

      <span style={{ width: 1, height: 24, background: "var(--border,#ccc)", margin: "0 4px" }} aria-hidden />

      <Button
        type="button"
        variant="outline"
        disabled={!selectedId}
        title="Rotação −90° em Y"
        onClick={() => selectedId && rotateProject90(selectedId, -1)}
      >
        −90°
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!selectedId}
        title="Rotação +90° em Y"
        onClick={() => selectedId && rotateProject90(selectedId, 1)}
      >
        +90°
      </Button>
      <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>
        Rodar livre: Shift + arrastar
      </span>

      <span style={{ width: 1, height: 24, background: "var(--border,#ccc)", margin: "0 4px" }} aria-hidden />

      <Button type="button" variant="outline" onClick={() => adjustCameraZoom(0.9)} title="Aproximar">
        Zoom +
      </Button>
      <Button type="button" variant="outline" onClick={() => adjustCameraZoom(1.1)} title="Afastar">
        Zoom −
      </Button>
      <Button type="button" variant="outline" onClick={() => resetCamera()}>
        Reset câmara
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() => clearMeasurement()}
        disabled={!measurePointA && !measurePointB}
      >
        Limpar régua
      </Button>
    </div>
  );
}
