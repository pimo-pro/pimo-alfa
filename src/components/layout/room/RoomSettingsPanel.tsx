import { useCallback } from "react";
import { useProject } from "../../../context/useProject";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import Panel from "../../ui/Panel";
import type { ProjectRoomConfig, ProjectRoomOpening } from "../../../3d/viewer-engine/room/roomEngineTypes";
import { WALL_LABEL_TITLES } from "../../../3d/viewer-engine/room/RoomEngine";
import { RoomFloorModeSelect } from "./RoomFloorModeSelect";

function numInput(
  label: string,
  value: number,
  onChange: (v: number) => void,
  min = 100,
  max = 20000
) {
  return (
    <div className="panel-field-row" key={label}>
      <label className="panel-label" style={{ minWidth: 120 }}>
        {label}
      </label>
      <input
        type="number"
        min={min}
        max={max}
        step={10}
        value={Math.round(value)}
        onChange={(e) => {
          const parsed = Number.parseFloat(e.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        className="input input-sm"
        style={{ width: 90 }}
      />
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>mm</span>
    </div>
  );
}

export default function RoomSettingsPanel() {
  const { project, actions } = useProject();
  const { viewerApi } = usePimoViewerContext();
  const room = project.room;

  const patchRoom = useCallback(
    (patch: Partial<ProjectRoomConfig>) => {
      actions.updateProjectRoom(patch);
    },
    [actions]
  );

  const patchOpening = useCallback(
    (openingId: string, patch: Partial<ProjectRoomOpening>) => {
      if (!room) return;
      const openings = room.openings.map((o) => (o.id === openingId ? { ...o, ...patch } : o));
      patchRoom({ openings });
    },
    [room, patchRoom]
  );

  const door = room?.openings.find((o) => o.type === "door");
  const windowOpening = room?.openings.find((o) => o.type === "window");

  return (
    <aside className="panel-content panel-content--side">
      <div className="design-panel-header">
        <div className="section-title">Configurações da Sala</div>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }} className="design-panel-subtitle">
        Room 2.0 — sala visual centrada na origem. Dimensões em milímetros.
      </p>

      {!room ? (
        <button
          type="button"
          className="button button-primary"
          style={{ width: "100%" }}
          onClick={() => actions.createDefaultProjectRoom()}
        >
          Criar sala (4000×2500×2600 mm)
        </button>
      ) : (
        <>
          <Panel title="Dimensões">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {numInput("Largura", room.widthMm, (v) => patchRoom({ widthMm: v }))}
              {numInput("Profundidade", room.depthMm, (v) => patchRoom({ depthMm: v }))}
              {numInput("Altura", room.heightMm, (v) => patchRoom({ heightMm: v }))}
              {numInput("Espessura paredes", room.wallThicknessMm, (v) =>
                patchRoom({ wallThicknessMm: v }), 50, 500)}
            </div>
          </Panel>

          <Panel title="Visualização">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <RoomFloorModeSelect
                value={room.floorMode}
                labelMinWidth={120}
                onChange={(mode) => {
                  patchRoom({ floorMode: mode });
                  viewerApi?.setRoomFloorMode?.(mode);
                }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={room.ceilingVisible !== false}
                  onChange={(e) => {
                    patchRoom({ ceilingVisible: e.target.checked });
                    viewerApi?.setRoomCeilingVisible?.(e.target.checked);
                  }}
                />
                Mostrar teto
              </label>
            </div>
          </Panel>

          <Panel title="Paredes">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {room.walls.map((wall) => (
                <div
                  key={wall.id}
                  style={{
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    padding: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    {WALL_LABEL_TITLES[wall.label]}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={!(room.hiddenWalls ?? []).includes(wall.id)}
                      onChange={(e) => {
                        const current = new Set(room.hiddenWalls ?? []);
                        if (e.target.checked) current.delete(wall.id);
                        else current.add(wall.id);
                        patchRoom({ hiddenWalls: [...current] });
                      }}
                    />
                    Mostrar parede
                  </label>
                  {numInput("Comprimento", wall.lengthMm, (v) => {
                    const walls = room.walls.map((w) =>
                      w.id === wall.id ? { ...w, lengthMm: v } : w
                    );
                    patchRoom({ walls });
                  })}
                  {numInput("Altura", wall.heightMm, (v) => {
                    const walls = room.walls.map((w) =>
                      w.id === wall.id ? { ...w, heightMm: v } : w
                    );
                    patchRoom({ walls });
                  })}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Aberturas">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {door && (
                <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 6, padding: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Porta</div>
                  <div className="panel-field-row" style={{ marginBottom: 6 }}>
                    <label className="panel-label" style={{ minWidth: 80 }}>
                      Parede
                    </label>
                    <select
                      className="input input-sm"
                      value={door.wallId}
                      onChange={(e) => patchOpening(door.id, { wallId: e.target.value })}
                    >
                      {room.walls.map((w) => (
                        <option key={w.id} value={w.id}>
                          {WALL_LABEL_TITLES[w.label]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {numInput("Posição X", door.xPosMm, (v) => patchOpening(door.id, { xPosMm: v }), 0)}
                  {numInput("Largura", door.widthMm, (v) => patchOpening(door.id, { widthMm: v }))}
                  {numInput("Altura", door.heightMm, (v) => patchOpening(door.id, { heightMm: v }))}
                </div>
              )}
              {windowOpening && (
                <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 6, padding: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Janela</div>
                  <div className="panel-field-row" style={{ marginBottom: 6 }}>
                    <label className="panel-label" style={{ minWidth: 80 }}>
                      Parede
                    </label>
                    <select
                      className="input input-sm"
                      value={windowOpening.wallId}
                      onChange={(e) => patchOpening(windowOpening.id, { wallId: e.target.value })}
                    >
                      {room.walls.map((w) => (
                        <option key={w.id} value={w.id}>
                          {WALL_LABEL_TITLES[w.label]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {numInput("Posição X", windowOpening.xPosMm, (v) =>
                    patchOpening(windowOpening.id, { xPosMm: v }), 0)}
                  {numInput("Largura", windowOpening.widthMm, (v) =>
                    patchOpening(windowOpening.id, { widthMm: v }))}
                  {numInput("Altura", windowOpening.heightMm, (v) =>
                    patchOpening(windowOpening.id, { heightMm: v }))}
                  {numInput("Offset piso", windowOpening.floorOffsetMm, (v) =>
                    patchOpening(windowOpening.id, { floorOffsetMm: v }), 0)}
                </div>
              )}
            </div>
          </Panel>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              className="button button-ghost"
              style={{ width: "100%" }}
              onClick={() => {
                const visible = room.visible !== false;
                patchRoom({ visible: !visible });
                if (visible) viewerApi?.hideRoom?.();
                else viewerApi?.showRoom?.();
              }}
            >
              {room.visible !== false ? "Ocultar sala" : "Mostrar sala"}
            </button>
            <button
              type="button"
              className="button button-ghost"
              style={{ width: "100%" }}
              onClick={() => {
                patchRoom({ locked: !room.locked });
                viewerApi?.setRoomLocked?.(!room.locked);
              }}
            >
              {room.locked ? "Desbloquear sala" : "Bloquear sala"}
            </button>
            <button
              type="button"
              className="button button-ghost"
              style={{ width: "100%" }}
              onClick={() => {
                patchRoom({ visible: true, locked: false });
                viewerApi?.showRoom?.();
                viewerApi?.setRoomLocked?.(false);
              }}
            >
              Mostrar tudo
            </button>
            <button
              type="button"
              className="button button-ghost"
              style={{ width: "100%" }}
              onClick={() => {
                actions.removeProjectRoom();
                viewerApi?.removeRoom?.();
              }}
            >
              Remover sala
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
