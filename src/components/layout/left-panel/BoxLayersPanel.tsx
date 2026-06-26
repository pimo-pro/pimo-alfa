import { useState } from "react";
import { useProject } from "../../../context/useProject";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import { getViewerMaterialId } from "../../../core/materials/service";
import { getSettings } from "../../../core/settings/settingsService";
import { DRAWER_HEIGHT_MODES } from "../../../core/drawers/drawerUiConstants";
import type { DrawerHeightMode } from "../../../core/drawers/drawerHeightModeTypes";
import { validateBoxDrawerConfiguration } from "../../../core/drawers/drawerUiValidation";
import {
  resolveDrawerBodyHeightMm,
  resolveDrawerDisplayName,
} from "../../../core/drawers/drawerLayerCustomization";
import { resolveDoorLabel } from "../../../core/doors/doorLabels";
import { normalizeDrawerPresets } from "../../../core/drawers/drawerPresets";
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
  const { viewerApi } = usePimoViewerContext();
  const [expandedDoorIds, setExpandedDoorIds] = useState<Record<string, boolean>>({});
  const [expandedDrawerIds, setExpandedDrawerIds] = useState<Record<string, boolean>>({});
  const [showHeightEditor, setShowHeightEditor] = useState(false);
  const [showAllHardware, setShowAllHardware] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");

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
  const drawerPresets = normalizeDrawerPresets(project.drawerPresets);
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
            {resolveDoorLabel(item, index, doors)}: {item.isOpen ? "Fechar" : "Abrir"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <strong style={{ fontSize: 12 }}>Portas</strong>
        {doors.length === 0 ? (
          <div className="muted-text">Sem portas.</div>
        ) : (
          doors.map((item, index) => (
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
                  {resolveDoorLabel(item, index, doors)}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {Math.round(item.width)}×{Math.round(item.height)} mm
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
                  {expandedDoorIds[item.id] ? "Ocultar" : "Detalhes"}
                </span>
              </button>

              {expandedDoorIds[item.id] && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Largura da porta (mm)</span>
                    <input
                      className="input input-xs"
                      type="number"
                      min={40}
                      value={Math.round(item.width)}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (!Number.isFinite(value)) return;
                        actions.updateDoorLayerItem(item.id, { width: value });
                      }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Altura da porta (mm)</span>
                    <input
                      className="input input-xs"
                      type="number"
                      min={80}
                      value={Math.round(item.height)}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (!Number.isFinite(value)) return;
                        actions.updateDoorLayerItem(item.id, { height: value });
                      }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Ajuste vertical (mm)</span>
                    <input
                      className="input input-xs"
                      type="number"
                      placeholder="Ex.: -20 ou +40"
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        const value = Number((e.target as HTMLInputElement).value);
                        if (!Number.isFinite(value) || value === 0) return;
                        actions.updateDoorLayerItem(item.id, { applyVerticalAdjustMm: value });
                        (e.target as HTMLInputElement).value = "";
                      }}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (!Number.isFinite(value) || value === 0) return;
                        actions.updateDoorLayerItem(item.id, { applyVerticalAdjustMm: value });
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Origem do ajuste vertical</span>
                    <select
                      className="select select-xs"
                      value={item.verticalAdjustOrigin ?? "top"}
                      onChange={(e) =>
                        actions.updateDoorLayerItem(item.id, {
                          verticalAdjustOrigin: e.target.value as "top" | "bottom",
                        })
                      }
                    >
                      <option value="top">Aplicar ajuste a partir de cima</option>
                      <option value="bottom">Aplicar ajuste a partir de baixo</option>
                    </select>
                  </label>
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
                  actions.setDrawerHeightMode(e.target.value as DrawerHeightMode)
                }
              >
                {DRAWER_HEIGHT_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <strong style={{ fontSize: 11, color: "var(--text-muted)" }}>Presets de gavetas</strong>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Nome do preset</span>
                <input
                  className="input input-xs"
                  type="text"
                  value={presetName}
                  placeholder="Ex.: Cozinha 3 gavetas"
                  onChange={(e) => setPresetName(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="button button-ghost"
                disabled={!presetName.trim()}
                onClick={() => {
                  const name = presetName.trim();
                  if (!name) return;
                  actions.saveDrawerPresetFromBox(selectedBox.id, name);
                  setPresetName("");
                }}
              >
                Guardar como preset
              </button>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Aplicar preset</span>
                <select
                  className="select select-xs"
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                >
                  <option value="">— Selecionar preset —</option>
                  {drawerPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.nome} ({preset.drawerCount} gav., {preset.drawerHeightMode})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button-primary"
                disabled={!selectedPresetId}
                onClick={() => {
                  if (!selectedPresetId) return;
                  actions.applyDrawerPresetToBox(selectedBox.id, selectedPresetId);
                }}
              >
                Aplicar preset
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="button button-ghost"
                style={{ flex: 1, minWidth: 120 }}
                onClick={() => {
                  if (heightMode !== "custom") {
                    actions.setDrawerHeightMode("custom");
                  }
                  setShowHeightEditor(true);
                }}
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

            {showHeightEditor && (
              <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10 }}>
                <DrawerCustomHeightsTable
                  box={selectedBox}
                  onHeightChange={(drawerId, height) => {
                    const drawer = drawers.find((d) => d.id === drawerId);
                    const frontOverride = drawer?.metadata?.frontHeightMm;
                    actions.updateDrawerLayerItem(drawerId, {
                      bodyHeight: height,
                      height:
                        frontOverride != null && frontOverride > 0 ? frontOverride : height,
                    });
                  }}
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
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {resolveDrawerDisplayName(item, index)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {Math.round(item.width)}×{Math.round(item.height)} mm
                    {item.metadata?.frontHeightMm != null &&
                    item.metadata.frontHeightMm > 0 &&
                    Math.round(item.metadata.frontHeightMm) !==
                      Math.round(resolveDrawerBodyHeightMm(item))
                      ? ` (corpo ${Math.round(resolveDrawerBodyHeightMm(item))} mm)`
                      : ""}
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
                      onFrontMaterialChange={(materialId) => {
                        viewerApi?.updateDrawerMaterial?.(
                          selectedBox.id,
                          item.id,
                          getViewerMaterialId(materialId)
                        );
                      }}
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
