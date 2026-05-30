/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useProject } from "../../../context/useProject";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import Panel from "../../ui/Panel";
import { useWallStore, wallStore } from "../../../stores/wallStore";

/** Dimensões padrão da sala em centímetros */
const DEFAULT_ROOM_WIDTH_CM  = 400;  // 4 m
const DEFAULT_ROOM_DEPTH_CM  = 500;  // 5 m
const DEFAULT_ROOM_HEIGHT_CM = 270;  // 2.7 m

/** Limites em cm */
const MIN_WD_CM = 50;    // 0.5 m
const MAX_WD_CM = 5000;  // 50 m
const MIN_H_CM  = 50;    // 0.5 m
const MAX_H_CM  = 1000;  // 10 m

type RoomType = "closed" | "open";

export function PainelSala() {
  const { viewerApi } = usePimoViewerContext();
  const { actions } = useProject();
  const mainWallIndex = useWallStore((state) => state.mainWallIndex);
  const setMainWallIndex = useWallStore((state) => state.setMainWallIndex);

  // Estado em centímetros — conversão para metros só nas chamadas ao viewer
  const [widthCm,  setWidthCm]  = useState(DEFAULT_ROOM_WIDTH_CM);
  const [depthCm,  setDepthCm]  = useState(DEFAULT_ROOM_DEPTH_CM);
  const [heightCm, setHeightCm] = useState(DEFAULT_ROOM_HEIGHT_CM);
  const [roomType, setRoomType] = useState<RoomType>("closed");
  const [roomExistsState, setRoomExistsState] = useState(false);
  const [roomVisibleState, setRoomVisibleState] = useState(true);

  const roomExists  = viewerApi?.getRoomExists?.()  ?? roomExistsState;
  const roomVisible = viewerApi?.getRoomVisible?.()  ?? roomVisibleState;
  const locked      = viewerApi?.getRoomLocked?.()   ?? false;

  useEffect(() => {
    setRoomExistsState(viewerApi?.getRoomExists?.() ?? false);
    setRoomVisibleState(viewerApi?.getRoomVisible?.() ?? true);
  }, [viewerApi]);

  // Ao detectar sala existente, lê dimensões do viewer (metros) e converte para cm
  useEffect(() => {
    if (!roomExists) return;
    const dims = viewerApi?.getRoomDimensions?.();
    if (dims) {
      setWidthCm(Math.round(dims.width  * 100));
      setDepthCm(Math.round(dims.depth  * 100));
      setHeightCm(Math.round(dims.height * 100));
    }
  }, [roomExists, viewerApi]);

  // Clamp e conversão cm → metros
  const toMeters = (widthCm: number, depthCm: number, heightCm: number) => ({
    w: Math.max(MIN_WD_CM, Math.min(MAX_WD_CM, widthCm))  / 100,
    d: Math.max(MIN_WD_CM, Math.min(MAX_WD_CM, depthCm))  / 100,
    h: Math.max(MIN_H_CM,  Math.min(MAX_H_CM,  heightCm)) / 100,
  });

  const handleCreate = () => {
    const { w, d, h } = toMeters(widthCm, depthCm, heightCm);
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
    const { w, d, h } = toMeters(widthCm, depthCm, heightCm);
    wallStore.getState().updateRoomDimensionsMeters(w, d, h);
    viewerApi?.setRoomDimensions?.(w, d, h);
  };

  return (
    <aside className="panel-content panel-content--side">
      <div className="design-panel-header">
        <div className="section-title">Sala</div>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }} className="design-panel-subtitle">
        Dimensões em centímetros. Crie a sala para ter 4 paredes principais e piso.
      </p>

      <Panel title="Dimensões (cm)">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="panel-field-row">
            <label className="panel-label" style={{ minWidth: 80 }}>Largura</label>
            <input
              type="number"
              min={MIN_WD_CM}
              max={MAX_WD_CM}
              step={10}
              value={widthCm}
              onChange={(e) => setWidthCm(Number(e.target.value) || 0)}
              onBlur={roomExists ? handleDimensionsChange : undefined}
              className="input input-sm"
              style={{ width: 90 }}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>cm</span>
          </div>
          <div className="panel-field-row">
            <label className="panel-label" style={{ minWidth: 80 }}>Profundidade</label>
            <input
              type="number"
              min={MIN_WD_CM}
              max={MAX_WD_CM}
              step={10}
              value={depthCm}
              onChange={(e) => setDepthCm(Number(e.target.value) || 0)}
              onBlur={roomExists ? handleDimensionsChange : undefined}
              className="input input-sm"
              style={{ width: 90 }}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>cm</span>
          </div>
          <div className="panel-field-row">
            <label className="panel-label" style={{ minWidth: 80 }}>Altura</label>
            <input
              type="number"
              min={MIN_H_CM}
              max={MAX_H_CM}
              step={5}
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value) || 0)}
              onBlur={roomExists ? handleDimensionsChange : undefined}
              className="input input-sm"
              style={{ width: 90 }}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>cm</span>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
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
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-main)", cursor: "pointer" }}>
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
