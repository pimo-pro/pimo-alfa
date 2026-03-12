import { useProject } from "../../../context/useProject";
import { useSelectedBoxInfo } from "../../../hooks/useSelectedBoxInfo";

/**
 * Overlay no canto inferior esquerdo da área de visualização 3D (viewport).
 * Exibe apenas L, A, P e rotação da peça selecionada (quando disponíveis).
 * O controle de Lock está exclusivamente no menu de contexto (clique direito).
 */
export default function BoxInfoOverlay() {
  const { project, viewerSync } = useProject();
  const info = useSelectedBoxInfo(project, viewerSync);

  if (info == null) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        bottom: 10,
        left: 10,
        zIndex: 5,
        pointerEvents: "none",
        fontSize: 12,
        color: "#fff",
        background: "rgba(0,0,0,0.5)",
        padding: "6px 10px",
        borderRadius: 6,
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      <div>L {info.L.toFixed(2)} m</div>
      <div>A {info.A.toFixed(2)} m</div>
      <div>P {info.P.toFixed(2)} m</div>
      <div>Rotação: {info.rotationDeg.toFixed(0)}°</div>
    </div>
  );
}
