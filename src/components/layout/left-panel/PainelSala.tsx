/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useProject } from "../../../context/useProject";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import Panel from "../../ui/Panel";
import { useWallStore, wallStore } from "../../../stores/wallStore";

/** Dimensões padrão da sala: 4m × 5m × 2.7m */
const DEFAULT_ROOM_WIDTH_M = 4;
const DEFAULT_ROOM_DEPTH_M = 5;
const DEFAULT_ROOM_HEIGHT_M = 2.7;

type RoomType = "closed" | "open";

export function PainelSala() {
  const { viewerApi } = usePimoViewerContext();
  const { actions } = useProject();
  const mainWallIndex = useWallStore((state) => state.mainWallIndex);
  const setMainWallIndex = useWallStore((state) => state.setMainWallIndex);
  const [widthM, setWidthM] = useState(DEFAULT_ROOM_WIDTH_M);
  const [depthM, setDepthM] = useState(DEFAULT_ROOM_DEPTH_M);
  const [heightM, setHeightM] = useState(DEFAULT_ROOM_HEIGHT_M);
  const [roomType, setRoomType] = useState<RoomType>("closed");
  const [roomExistsState, setRoomExistsState] = useState(false);
  const [roomVisibleState, setRoomVisibleState] = useState(true);

  const roomExists = viewerApi?.getRoomExists?.() ?? roomExistsState;
  const roomVisible = viewerApi?.getRoomVisible?.() ?? roomVisibleState;
  const locked = viewerApi?.getRoomLocked?.() ?? false;

  useEffect(() => {
    setRoomExistsState(viewerApi?.getRoomExists?.() ?? false);
    setRoomVisibleState(viewerApi?.getRoomVisible?.() ?? true);
  }, [viewerApi]);

  useEffect(() => {
    if (!roomExists) return;
    const dims = viewerApi?.getRoomDimensions?.();
    if (dims) {
      setWidthM(dims.width);
      setDepthM(dims.depth);
      setHeightM(dims.height);
    }
  }, [roomExists, viewerApi]);

  const handleCreate = () => {
    const w = Math.max(0.5, Math.min(50, widthM));
    const d = Math.max(0.5, Math.min(50, depthM));
    const h = Math.max(0.5, Math.min(10, heightM));
    const numWalls = roomType === "open" ? 3 : 4;
    wallStore.getState().setRoomLayoutFromMeters(w, d, h, numWalls);
    setRoomExistsState(true);
    setRoomVisibleState(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        actions.repositionWorkspaceBoxesInsideRoom();
      });
    });
  };

  const handleRemove = () => {
    wallStore.getState().clearRoom();
    viewerApi?.removeRoom?.();
    setRoomExistsState(false);
    setRoomVisibleState(false);
  };

  const handleDimensionsChange = () => {
    const w = Math.max(0.5, Math.min(50, widthM));
    const d = Math.max(0.5, Math.min(50, depthM));
    const h = Math.max(0.5, Math.min(10, heightM));
    wallStore.getState().updateRoomDimensionsMeters(w, d, h);
    viewerApi?.setRoomDimensions?.(w, d, h);
  };

  return (
    <aside className="panel-content panel-content--side">
      <div className="design-panel-header">
        <div className="section-title">Sala</div>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }} className="design-panel-subtitle">
        Dimensões em metros. Crie a sala para ter 4 paredes principais e piso; pode adicionar paredes extras e bloquear as principais.
      </p>
      <Panel title="Dimensões (m)">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="panel-field-row">
            <label className="panel-label" style={{ minWidth: 60 }}>Largura</label>
            <input
              type="number"
              min={0.5}
              max={50}
              step={0.1}
              value={widthM}
              onChange={(e) => setWidthM(Number(e.target.value) || 0)}
              onBlur={roomExists ? handleDimensionsChange : undefined}
              className="input input-sm"
              style={{ width: 80 }}
            />
          </div>
          <div className="panel-field-row">
            <label className="panel-label" style={{ minWidth: 60 }}>Profundidade</label>
            <input
              type="number"
              min={0.5}
              max={50}
              step={0.1}
              value={depthM}
              onChange={(e) => setDepthM(Number(e.target.value) || 0)}
              onBlur={roomExists ? handleDimensionsChange : undefined}
              className="input input-sm"
              style={{ width: 80 }}
            />
          </div>
          <div className="panel-field-row">
            <label className="panel-label" style={{ minWidth: 60 }}>Altura</label>
            <input
              type="number"
              min={0.5}
              max={10}
              step={0.1}
              value={heightM}
              onChange={(e) => setHeightM(Number(e.target.value) || 0)}
              onBlur={roomExists ? handleDimensionsChange : undefined}
              className="input input-sm"
              style={{ width: 80 }}
            />
          </div>
        </div>
      </Panel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {!roomExists ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "var(--text-main)" }}>Tipo de sala</label>
              <select
                className="input input-sm"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as RoomType)}
              >
                <option value="closed">Sala fechada (4 paredes)</option>
                <option value="open">Sala de estar (3 paredes, aberta)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              className="button button-primary"
              style={{ width: "100%" }}
            >
              Criar Sala
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleRemove}
              className="button button-ghost"
              style={{ width: "100%" }}
            >
              Remover Sala
            </button>
            <button
              type="button"
              onClick={() => viewerApi?.addExtraWall?.()}
              className="button button-ghost"
              style={{ width: "100%" }}
            >
              Adicionar Parede
            </button>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 2,
              }}
            >
              <label style={{ fontSize: 12, color: "var(--text-main)" }}>Parede principal</label>
              <select
                className="input input-sm"
                value={mainWallIndex}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  setMainWallIndex(Math.max(0, Math.min(3, next)) as 0 | 1 | 2 | 3);
                }}
              >
                <option value={0}>Frontal</option>
                <option value={1}>Direita</option>
                <option value={2}>Traseira</option>
                <option value={3}>Esquerda</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                if (roomVisible) {
                  viewerApi?.hideRoom?.();
                  setRoomVisibleState(false);
                } else {
                  viewerApi?.showRoom?.();
                  setRoomVisibleState(true);
                }
              }}
              className="button button-ghost"
              style={{ width: "100%" }}
            >
              {roomVisible ? "Ocultar Sala" : "Mostrar Sala"}
            </button>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--text-main)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={locked}
                onChange={(e) => viewerApi?.setRoomLocked?.(e.target.checked)}
              />
              Lock Walls (paredes principais conectadas)
            </label>
          </>
        )}
      </div>
    </aside>
  );
}
