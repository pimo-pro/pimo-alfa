import { useMemo, type CSSProperties } from "react";
import { useProject } from "../../../context/useProject";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";

/**
 * Painel mínimo para gerir medições internas da caixa selecionada.
 */
export default function InternalMeasurementsPanel() {
  const { project, actions } = useProject();
  const { viewerApi } = usePimoViewerContext();
  const boxId = project.selectedWorkspaceBoxId;

  const entries = useMemo(
    () => (project.measurements?.internal ?? []).filter((e) => e.boxId === boxId),
    [project.measurements?.internal, boxId]
  );

  const rulerActive =
    viewerApi?.internalRuler?.isActive?.() === true &&
    viewerApi?.internalRuler?.getActiveBoxId?.() === boxId;

  if (!boxId || (entries.length === 0 && !rulerActive)) return null;

  return (
    <div
      role="region"
      aria-label="Medições internas"
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 6,
        pointerEvents: "auto",
        minWidth: 220,
        maxWidth: 280,
        maxHeight: "40vh",
        overflow: "auto",
        fontSize: 12,
        color: "#e2e8f0",
        background: "rgba(15, 23, 42, 0.88)",
        border: "1px solid rgba(56, 189, 248, 0.35)",
        borderRadius: 8,
        padding: "8px 10px",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Medições internas</div>
      {entries.length === 0 ? (
        <div style={{ opacity: 0.75, marginBottom: 6 }}>Clique dois pontos na caixa para medir.</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {entries.map((entry) => (
            <li
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "4px 0",
                borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
              }}
            >
              <span style={{ opacity: entry.visible ? 1 : 0.45 }}>
                {entry.valueMm.toFixed(1)} mm
              </span>
              <span style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => actions.toggleInternalMeasurementVisibility(entry.id)}
                  style={btnStyle}
                  title={entry.visible ? "Ocultar" : "Mostrar"}
                >
                  {entry.visible ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => actions.removeInternalMeasurement(entry.id)}
                  style={btnStyle}
                  title="Apagar"
                >
                  Apagar
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {entries.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          <button type="button" onClick={() => actions.hideAllInternalMeasurements(boxId)} style={btnStyle}>
            Ocultar todas
          </button>
          <button type="button" onClick={() => actions.showAllInternalMeasurements(boxId)} style={btnStyle}>
            Mostrar todas
          </button>
          <button type="button" onClick={() => actions.clearInternalMeasurements(boxId)} style={btnStyle}>
            Apagar todas
          </button>
        </div>
      )}
    </div>
  );
}

const btnStyle: CSSProperties = {
  fontSize: 11,
  padding: "2px 6px",
  borderRadius: 4,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(30, 41, 59, 0.9)",
  color: "#e2e8f0",
  cursor: "pointer",
};
