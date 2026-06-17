import { useState } from "react";
import { useProject } from "../../../context/useProject";
import { getSettings } from "../../../core/settings/settingsService";
import { DRAWER_HEIGHT_MODES } from "../../../core/drawers/drawerUiConstants";
import { validateBoxDrawerConfiguration } from "../../../core/drawers/drawerUiValidation";
import Panel from "../../ui/Panel";
import DrawerConfigPanel, {
  DrawerCustomHeightsTable,
  getDrawerStatusBadges,
} from "../../panels/DrawerConfigPanel";

type BoxLayersPanelProps = {
  embedded?: boolean;
};

const alertStyle = (level: "warning" | "error") => ({
  fontSize: 11,
  padding: "8px 10px",
  borderRadius: 6,
  marginBottom: 8,
  background: level === "error" ? "rgba(239,68,68,0.12)" : "rgba(234,179,8,0.12)",
  color: level === "error" ? "#fca5a5" : "#fde68a",
  border: `1px solid ${level === "error" ? "rgba(239,68,68,0.35)" : "rgba(234,179,8,0.35)"}`,
});

const badgeStyle = {
  fontSize: 10,
  padding: "2px 6px",
  borderRadius: 4,
  background: "rgba(255,255,255,0.08)",
  color: "var(--text-muted)",
};

export default function BoxLayersPanel({ embedded = false }: BoxLayersPanelProps) {
  const { project, actions } = useProject();
  const [expandedDoorIds, setExpandedDoorIds] = useState<Record<string, boolean>>({});
  const [expandedDrawerIds, setExpandedDrawerIds] = useState<Record<string, boolean>>({});
  const [showHeightEditor, setShowHeightEditor] = useState(false);
  const [showAllHardware, setShowAllHardware] = useState(false);

  const selectedBox =
    project.workspaceBoxes.find((box) => box.id === project.selectedWorkspaceBoxId) ??
    project.workspaceBoxes[0];

  if (!selectedBox) {
    if (embedded) {
      return (
        <p className="muted-text" style={{ margin: 0 }}>
          Nenhuma caixa selecionada.
        </p>
      );
    }
    return (
      <Panel title="Portas e Gavetas" description="Selecione uma caixa para configurar as camadas.">
        <p className="muted-text" style={{ margin: 0 }}>
          Nenhuma caixa selecionada.
        </p>
      </Panel>
    );
  }

  const doors = selectedBox.doorsLayer ?? [];
  const drawers = selectedBox.drawersLayer ?? [];
  const settings = getSettings().gavetas;
  const heightMode = selectedBox.drawerHeightMode ?? settings.gavetaAlturaModoPadrao;
  const boxAlerts = validateBoxDrawerConfiguration(selectedBox, settings);
  const errorAlerts = [
    ...(selectedBox.drawerConfigError ? [{ level: "error" as const, message: selectedBox.drawerConfigError }] : []),
    ...boxAlerts.filter((a) => a.level === "error"),
  ];
  const warningAlerts = [
    ...(selectedBox.drawerConfigWarnings ?? []).map((message) => ({ level: "warning" as const, message })),
    ...boxAlerts.filter((a) => a.level === "warning"),
  ];
  const uniqueWarnings = Array.from(new Map(warningAlerts.map((a) => [a.message, a])).values());

  const content = (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          className="button button-primary"
          style={{ width: "100%" }}
          onClick={() => actions.regenerateBoxLayersForSelectedBox()}
        >
          Regenerar Camadas
        </button>

        {doors.map((item, index) => (
          <button
            key={`door-toggle-${item.id}`}
            type="button"
            className="button button-primary"
            style={{ width: "100%" }}
            onClick={() => actions.setDoorLayerItemOpen(item.id, !item.isOpen)}
          >
            Porta {index + 1}: {item.isOpen ? "Fechar" : "Abrir"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <strong style={{ fontSize: 12 }}>Portas</strong>
        {doors.length === 0 ? (
          <div className="muted-text">Sem portas.</div>
        ) : (
          doors.map((item) => (
            <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10 }}>
              <button
                type="button"
                onClick={() =>
                  setExpandedDoorIds((prev) => ({
                    ...prev,
                    [item.id]: !prev[item.id],
                  }))
                }
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  color: "inherit",
                  display: "flex",
                  alignItems: "center",
                  textAlign: "left",
                  cursor: "pointer",
                  padding: 0,
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {Math.round(item.width)}×{Math.round(item.height)}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
                  {expandedDoorIds[item.id] ? "Ocultar" : "Detalhes"}
                </span>
              </button>

              {expandedDoorIds[item.id] && (
                <div className="form-grid" style={{ marginTop: 8 }}>
                  <input className="input input-xs" type="number" value={item.width} readOnly placeholder="Largura" />
                  <input className="input input-xs" type="number" value={item.height} readOnly placeholder="Altura" />
                </div>
              )}
            </div>
          ))
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <strong style={{ fontSize: 12 }}>Gavetas</strong>
          {drawers.length > 0 && (
            <span className="muted-text" style={{ fontSize: 11 }}>
              {drawers.length} un.
            </span>
          )}
        </div>

        {errorAlerts.map((alert, index) => (
          <div key={`err-${index}`} style={alertStyle("error")}>
            {alert.message}
          </div>
        ))}
        {uniqueWarnings.map((alert, index) => (
          <div key={`warn-${index}`} style={alertStyle("warning")}>
            {alert.message}
          </div>
        ))}

        {drawers.length > 0 && (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Modo de altura</span>
              <select
                className="select select-xs"
                value={heightMode}
                onChange={(e) =>
                  actions.setDrawerHeightMode(
                    e.target.value as "equal" | "top_small_mid_medium_bottom_large" | "custom"
                  )
                }
              >
                {DRAWER_HEIGHT_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="button button-ghost"
                style={{ flex: 1, minWidth: 120 }}
                onClick={() => setShowHeightEditor((v) => !v)}
                disabled={heightMode !== "custom"}
              >
                {showHeightEditor ? "Ocultar Alturas" : "Editar Alturas"}
              </button>
              <button
                type="button"
                className="button button-ghost"
                style={{ flex: 1, minWidth: 120 }}
                onClick={() => setShowAllHardware((v) => !v)}
              >
                {showAllHardware ? "Ocultar Ferragens" : "Editar Ferragens"}
              </button>
            </div>

            {showHeightEditor && heightMode === "custom" && (
              <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10 }}>
                <DrawerCustomHeightsTable
                  box={selectedBox}
                  onHeightChange={(drawerId, height) =>
                    actions.updateDrawerLayerItem(drawerId, { height })
                  }
                />
              </div>
            )}
          </>
        )}

        {drawers.length === 0 ? (
          <div className="muted-text">Sem gavetas.</div>
        ) : (
          drawers.map((item, index) => {
            const expanded = expandedDrawerIds[item.id] || showAllHardware;
            const badges = getDrawerStatusBadges(item);
            return (
              <div
                key={item.id}
                style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10 }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedDrawerIds((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: "inherit",
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    textAlign: "left",
                    cursor: "pointer",
                    padding: 0,
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Gaveta {index + 1}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {Math.round(item.width)}×{Math.round(item.height)} mm
                  </span>
                  <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {badges.map((badge) => (
                      <span key={badge} style={badgeStyle}>
                        {badge}
                      </span>
                    ))}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
                    {expanded ? "Ocultar" : "Configurar"}
                  </span>
                </button>

                {expanded && (
                  <>
                    <DrawerConfigPanel
                      drawer={item}
                      index={index}
                      box={selectedBox}
                      showHardware={showAllHardware || expandedDrawerIds[item.id]}
                      onUpdate={(partial) => actions.updateDrawerLayerItem(item.id, partial)}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => actions.setDrawerLayerItemOpen(item.id, !item.isOpen)}
                      >
                        {item.isOpen ? "Fechar" : "Abrir"}
                      </button>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => actions.removeDrawerLayerItem(item.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <Panel title="Portas e Gavetas" description="Camadas independentes com pivôs próprios e materiais.">
      {content}
    </Panel>
  );
}
