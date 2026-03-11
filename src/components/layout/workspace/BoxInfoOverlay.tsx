import { useProject } from "../../../context/useProject";
import { useSelectedBoxInfo } from "../../../hooks/useSelectedBoxInfo";

/**
 * Overlay no canto inferior esquerdo da área de visualização 3D (viewport).
 * Exibe texto: L, A, P, rotação da caixa selecionada e botão de lock (travar/destravar peça).
 * Deve ser filho direto do container do viewport (position: relative) para position: absolute funcionar corretamente.
 */
export default function BoxInfoOverlay() {
  const { project, actions, viewerSync } = useProject();
  const isSelectMode = (project.activeViewerTool ?? "select") === "select";
  const info = useSelectedBoxInfo(project, viewerSync);
  const selectedBoxId = project.selectedWorkspaceBoxId;
  const selectedBox = selectedBoxId
    ? project.workspaceBoxes.find((b) => b.id === selectedBoxId)
    : undefined;
  const locked = selectedBox?.locked === true;

  if (!isSelectMode || !info) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: 10,
        zIndex: 5,
        fontSize: 12,
        color: "#fff",
        background: "rgba(0,0,0,0.5)",
        padding: "6px 10px",
        borderRadius: 6,
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        opacity: locked ? 0.85 : 1,
        border: locked ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ pointerEvents: "none" }}>
          <div>L {info.L.toFixed(2)} m</div>
          <div>A {info.A.toFixed(2)} m</div>
          <div>P {info.P.toFixed(2)} m</div>
          <div>Rotação: {info.rotationDeg.toFixed(0)}°</div>
        </div>
        {selectedBoxId && (
          <button
            type="button"
            title={locked ? "Desbloquear peça (permitir mover/redimensionar)" : "Bloquear peça (impedir mover/redimensionar)"}
            aria-label={locked ? "Desbloquear peça" : "Bloquear peça"}
            aria-pressed={locked}
            onClick={() => actions.setWorkspaceBoxLocked(selectedBoxId, !locked)}
            style={{
              padding: "4px 6px",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 4,
              background: locked ? "rgba(255,255,255,0.15)" : "transparent",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            {locked ? "🔒" : "🔓"}
          </button>
        )}
      </div>
    </div>
  );
}
