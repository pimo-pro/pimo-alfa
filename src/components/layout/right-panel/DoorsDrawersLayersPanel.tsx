/**
 * Doors & Drawers Layers Panel
 * UI لcomunication de controle de portas e gavetas
 */

import React, { useMemo } from "react";
import { useProject } from "../../../context/useProject";
import type { DoorLayerItem, DrawerLayerItem } from "../../../models/BoxLayers";
import { resolveMaterial, getDefaultOfficialMaterial } from "../../../core/materials/materials.api";

export function DoorsDrawersLayersPanel() {
  const { project, actions } = useProject();

  const selectedBox = useMemo(() => {
    return project.workspaceBoxes.find((b) => b.id === project.selectedWorkspaceBoxId);
  }, [project.workspaceBoxes, project.selectedWorkspaceBoxId]);

  const doorsLayer = selectedBox?.doorsLayer ?? [];
  const drawersLayer = selectedBox?.drawersLayer ?? [];
  const drawerHeightMode = selectedBox?.drawerHeightMode ?? "equal";
  const drawerHeightsTotal = drawersLayer.reduce(
    (sum, item) => sum + (Number.isFinite(item.height) ? item.height : 0),
    0
  );
  const drawerAvailableHeight = selectedBox
    ? Math.max(0, selectedBox.dimensoes.altura - 10)
    : 0;
  const exceedsDrawerSpace =
    drawerHeightMode === "custom" && drawerHeightsTotal > drawerAvailableHeight;

  if (!selectedBox) {
    return (
      <div style={{ padding: "16px", fontSize: 12, color: "#666" }}>
        Selecione uma caixa para gerenciar portas e gavetas
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header com botão Auto */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Camadas</h3>
        <button
          onClick={() => actions.regenerateBoxLayersForSelectedBox?.()}
          className="button button-ghost"
          style={{ fontSize: 11, padding: "4px 8px" }}
          title="Regenerar automaticamente"
        >
          ↻ Auto
        </button>
      </div>

      {/* Seção Portas */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <h4 style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>Portas ({doorsLayer.length})</h4>
          <button
            onClick={() => actions.addDoorLayerItem?.()}
            className="button button-ghost"
            style={{ fontSize: 11, padding: "2px 6px" }}
            title="Adicionar porta"
          >
            + Porta
          </button>
        </div>

        {doorsLayer.length === 0 ? (
          <p style={{ fontSize: 11, color: "#999", fontStyle: "italic", margin: 0 }}>Nenhuma porta</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {doorsLayer.map((door, index) => (
              <DoorLayerRow key={door.id} door={door} index={index} actions={actions} />
            ))}
          </div>
        )}
      </div>

      {/* Seção Gavetas */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <h4 style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>Gavetas ({drawersLayer.length})</h4>
          <button
            onClick={() => actions.addDrawerLayerItem?.()}
            className="button button-ghost"
            style={{ fontSize: 11, padding: "2px 6px" }}
            title="Adicionar gaveta"
          >
            + Gaveta
          </button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
            <span style={{ color: "#666" }}>Distribuicao de alturas</span>
            <select
              className="input input-xs"
              value={drawerHeightMode}
              onChange={(e) => actions.setDrawerHeightMode?.(e.target.value as "equal" | "top_small_mid_medium_bottom_large" | "custom")}
            >
              <option value="equal">Todas iguais</option>
              <option value="top_small_mid_medium_bottom_large">Topo pequeno, meio medio, baixo grande</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>

        {drawerHeightMode === "custom" && exceedsDrawerSpace ? (
          <div style={{ fontSize: 11, color: "#b45309", marginBottom: 8 }}>
            Soma das alturas ({drawerHeightsTotal.toFixed(0)}mm) excede a altura interna disponivel ({drawerAvailableHeight.toFixed(0)}mm).
          </div>
        ) : null}

        {drawersLayer.length === 0 ? (
          <p style={{ fontSize: 11, color: "#999", fontStyle: "italic", margin: 0 }}>Nenhuma gaveta</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {drawersLayer.map((drawer, index) => (
              <DrawerLayerRow key={drawer.id} drawer={drawer} index={index} actions={actions} drawerHeightMode={drawerHeightMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
const DoorLayerRow: React.FC<{
  door: DoorLayerItem;
  index: number;
  actions: ReturnType<typeof useProject>["actions"];
}> = ({ door, index, actions }) => {
  const materialLabel = resolveMaterial(door.material ?? "")?.label ?? door.material ?? getDefaultOfficialMaterial().label;
  const label = `Porta ${String(index + 1).padStart(2, "0")} — ${materialLabel}`;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px",
        background: "rgba(0,0,0,0.02)",
        borderRadius: "4px",
        border: "1px solid rgba(0,0,0,0.05)",
        fontSize: 11,
      }}
    >
      {/* Toggle Open */}
      <button
        onClick={() => actions.setDoorLayerItemOpen?.(door.id, !door.isOpen)}
        className="button button-ghost"
        style={{
          padding: "2px 4px",
          minWidth: "24px",
          fontSize: 12,
          fontWeight: "bold",
        }}
        title={door.isOpen ? "Fechar" : "Abrir"}
      >
        {door.isOpen ? "◐" : "○"}
      </button>

      {/* Info: nome + material e dimensões */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: "#666", marginLeft: "4px", fontSize: 10 }}>
          {door.width.toFixed(0)}×{door.height.toFixed(0)} ({door.openDirection})
        </span>
      </div>

      {/* Delete */}
      <button
        onClick={() => actions.removeDoorLayerItem?.(door.id)}
        className="button button-ghost"
        style={{
          padding: "2px 4px",
          color: "#d32f2f",
          fontSize: 14,
          fontWeight: "bold",
        }}
        title="Remover"
      >
        ×
      </button>
    </div>
  );
};

const DrawerLayerRow: React.FC<{
  drawer: DrawerLayerItem;
  index: number;
  actions: ReturnType<typeof useProject>["actions"];
  drawerHeightMode: "equal" | "top_small_mid_medium_bottom_large" | "custom";
}> = ({ drawer, index, actions, drawerHeightMode }) => {
  const drawerType = drawer.type ?? drawer.drawerType ?? "normal";
  const materialLabel = resolveMaterial(drawer.material ?? "")?.label ?? drawer.material ?? getDefaultOfficialMaterial().label;
  const label = `Gaveta ${String(index + 1).padStart(2, "0")} — ${materialLabel}`;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px",
        background: "rgba(0,0,0,0.02)",
        borderRadius: "4px",
        border: "1px solid rgba(0,0,0,0.05)",
        fontSize: 11,
      }}
    >
      {/* Toggle Open */}
      <button
        onClick={() => actions.setDrawerLayerItemOpen?.(drawer.id, !drawer.isOpen)}
        className="button button-ghost"
        style={{
          padding: "2px 4px",
          minWidth: "24px",
          fontSize: 12,
          fontWeight: "bold",
        }}
        title={drawer.isOpen ? "Fechar" : "Abrir"}
      >
        {drawer.isOpen ? "◐" : "○"}
      </button>

      {/* Info: nome + material e dimensões */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: "#666", marginLeft: "4px", fontSize: 10 }}>
          {drawer.width.toFixed(0)}×{drawer.height.toFixed(0)} x{drawer.pullDistanceMm.toFixed(0)}mm
        </span>
      </div>

      {drawerHeightMode === "custom" ? (
        <input
          className="input input-xs"
          type="number"
          value={drawer.height}
          onChange={(e) => actions.updateDrawerLayerItem?.(drawer.id, { height: Number(e.target.value) })}
          title="Altura da gaveta (mm)"
          style={{ width: 72 }}
        />
      ) : null}

      <select
        className="input input-xs"
        value={drawerType}
        onChange={(e) => actions.updateDrawerLayerItem?.(drawer.id, { type: e.target.value as "normal" | "pro" })}
        title="Tipo de gaveta"
      >
        <option value="normal">Normal</option>
        <option value="pro">PRO</option>
      </select>

      {/* Delete */}
      <button
        onClick={() => actions.removeDrawerLayerItem?.(drawer.id)}
        className="button button-ghost"
        style={{
          padding: "2px 4px",
          color: "#d32f2f",
          fontSize: 14,
          fontWeight: "bold",
        }}
        title="Remover"
      >
        ×
      </button>
    </div>
  );
};
