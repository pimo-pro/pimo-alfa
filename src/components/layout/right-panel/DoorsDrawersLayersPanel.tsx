/**
 * Doors & Drawers Layers Panel
 * UI para controle de portas e gavetas da caixa selecionada.
 */

import React, { useMemo, memo, useCallback } from "react";
import { useProject } from "../../../context/useProject";
import type { DoorLayerItem, DrawerLayerItem } from "../../../models/BoxLayers";
import { resolveMaterial, getDefaultOfficialMaterial } from "../../../core/materials/materials.api";

const emptyStateStyle: React.CSSProperties = {
  padding: 16,
  fontSize: 12,
  color: "var(--text-muted)",
  textAlign: "center",
  background: "rgba(255,255,255,0.02)",
  borderRadius: "var(--radius)",
};

export function DoorsDrawersLayersPanel() {
  const { project, actions } = useProject();

  const selectedBox = useMemo(() => {
    return project.workspaceBoxes.find((b) => b.id === project.selectedWorkspaceBoxId);
  }, [project.workspaceBoxes, project.selectedWorkspaceBoxId]);

  const doorsLayer = selectedBox?.doorsLayer ?? [];
  const drawersLayer = selectedBox?.drawersLayer ?? [];
  const drawerHeightMode = selectedBox?.drawerHeightMode ?? "equal";
  const drawerHeightsTotal = useMemo(
    () =>
      drawersLayer.reduce((sum, item) => sum + (Number.isFinite(item.height) ? item.height : 0), 0),
    [drawersLayer]
  );
  const drawerAvailableHeight = selectedBox
    ? Math.max(0, selectedBox.dimensoes.altura - 10)
    : 0;
  const exceedsDrawerSpace =
    drawerHeightMode === "custom" && drawerHeightsTotal > drawerAvailableHeight;

  const onDoorToggleOpen = useCallback(
    (id: string, isOpen: boolean) => actions.setDoorLayerItemOpen?.(id, isOpen),
    [actions]
  );
  const onDoorRemove = useCallback((id: string) => actions.removeDoorLayerItem?.(id), [actions]);
  const onDrawerToggleOpen = useCallback(
    (id: string, isOpen: boolean) => actions.setDrawerLayerItemOpen?.(id, isOpen),
    [actions]
  );
  const onDrawerUpdateHeight = useCallback(
    (id: string, height: number) => actions.updateDrawerLayerItem?.(id, { height }),
    [actions]
  );
  const onDrawerUpdateType = useCallback(
    (id: string, type: "normal" | "pro") => actions.updateDrawerLayerItem?.(id, { type }),
    [actions]
  );
  const onDrawerRemove = useCallback((id: string) => actions.removeDrawerLayerItem?.(id), [actions]);

  if (!selectedBox) {
    return (
      <div style={emptyStateStyle}>
        Selecione uma caixa no workspace para gerir portas e gavetas.
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
              <DoorLayerRow
                key={door.id}
                door={door}
                index={index}
                onToggleOpen={onDoorToggleOpen}
                onRemove={onDoorRemove}
              />
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
              <DrawerLayerRow
                key={drawer.id}
                drawer={drawer}
                index={index}
                drawerHeightMode={drawerHeightMode}
                onToggleOpen={onDrawerToggleOpen}
                onUpdateHeight={onDrawerUpdateHeight}
                onUpdateType={onDrawerUpdateType}
                onRemove={onDrawerRemove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
interface DoorLayerRowProps {
  door: DoorLayerItem;
  index: number;
  onToggleOpen: (id: string, isOpen: boolean) => void;
  onRemove: (id: string) => void;
}

const DoorLayerRow = memo(function DoorLayerRow({ door, index, onToggleOpen, onRemove }: DoorLayerRowProps) {
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
      <button
        onClick={() => onToggleOpen(door.id, !door.isOpen)}
        className="button button-ghost"
        style={{ padding: "2px 4px", minWidth: "24px", fontSize: 12, fontWeight: "bold" }}
        title={door.isOpen ? "Fechar" : "Abrir"}
      >
        {door.isOpen ? "◐" : "○"}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: "#666", marginLeft: "4px", fontSize: 10 }}>
          {door.width.toFixed(0)}×{door.height.toFixed(0)} ({door.openDirection})
        </span>
      </div>
      <button
        onClick={() => onRemove(door.id)}
        className="button button-ghost"
        style={{ padding: "2px 4px", color: "#d32f2f", fontSize: 14, fontWeight: "bold" }}
        title="Remover"
      >
        ×
      </button>
    </div>
  );
});

interface DrawerLayerRowProps {
  drawer: DrawerLayerItem;
  index: number;
  drawerHeightMode: "equal" | "top_small_mid_medium_bottom_large" | "custom";
  onToggleOpen: (id: string, isOpen: boolean) => void;
  onUpdateHeight: (id: string, height: number) => void;
  onUpdateType: (id: string, type: "normal" | "pro") => void;
  onRemove: (id: string) => void;
}

const DrawerLayerRow = memo(function DrawerLayerRow({
  drawer,
  index,
  drawerHeightMode,
  onToggleOpen,
  onUpdateHeight,
  onUpdateType,
  onRemove,
}: DrawerLayerRowProps) {
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
      <button
        onClick={() => onToggleOpen(drawer.id, !drawer.isOpen)}
        className="button button-ghost"
        style={{ padding: "2px 4px", minWidth: "24px", fontSize: 12, fontWeight: "bold" }}
        title={drawer.isOpen ? "Fechar" : "Abrir"}
      >
        {drawer.isOpen ? "◐" : "○"}
      </button>
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
          onChange={(e) => onUpdateHeight(drawer.id, Number(e.target.value))}
          title="Altura da gaveta (mm)"
          style={{ width: 72 }}
        />
      ) : null}
      <select
        className="input input-xs"
        value={drawerType}
        onChange={(e) => onUpdateType(drawer.id, e.target.value as "normal" | "pro")}
        title="Tipo de gaveta"
      >
        <option value="normal">Normal</option>
        <option value="pro">PRO</option>
      </select>
      <button
        onClick={() => onRemove(drawer.id)}
        className="button button-ghost"
        style={{ padding: "2px 4px", color: "#d32f2f", fontSize: 14, fontWeight: "bold" }}
        title="Remover"
      >
        ×
      </button>
    </div>
  );
});
