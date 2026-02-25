import type { ChangeEvent } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";

export default function BoxLayersPanel() {
  const { project, actions } = useProject();
  const selectedBox =
    project.workspaceBoxes.find((box) => box.id === project.selectedWorkspaceBoxId) ??
    project.workspaceBoxes[0];

  if (!selectedBox) {
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

  const onNumberDoor =
    (id: string, field: "width" | "height" | "thickness") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      actions.updateDoorLayerItem(id, { [field]: Number(event.target.value) || 1 });
    };

  const onNumberDrawer =
    (id: string, field: "width" | "height" | "depth" | "frontThickness" | "pullDistanceMm") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      actions.updateDrawerLayerItem(id, { [field]: Number(event.target.value) || 1 });
    };

  return (
    <Panel title="Portas e Gavetas" description="Camadas independentes com pivôs próprios e materiais.">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="button button-ghost" onClick={() => actions.addDoorLayerItem()}>
          Adicionar Porta
        </button>
        <button type="button" className="button button-ghost" onClick={() => actions.addDrawerLayerItem()}>
          Adicionar Gaveta
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={() => actions.regenerateBoxLayersForSelectedBox()}
        >
          Regenerar Camadas
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <strong style={{ fontSize: 12 }}>DoorsLayer</strong>
        {doors.length === 0 ? (
          <div className="muted-text">Sem portas.</div>
        ) : (
          doors.map((item) => (
            <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10 }}>
              <div className="form-grid">
                <input className="input input-xs" type="number" value={item.width} onChange={onNumberDoor(item.id, "width")} placeholder="Largura" />
                <input className="input input-xs" type="number" value={item.height} onChange={onNumberDoor(item.id, "height")} placeholder="Altura" />
                <input className="input input-xs" type="number" value={item.thickness} onChange={onNumberDoor(item.id, "thickness")} placeholder="Espessura" />
                <input className="input input-xs" value={item.materialId ?? ""} onChange={(e) => actions.setDoorLayerItemMaterial(item.id, e.target.value)} placeholder="Material ID" />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <select
                  className="select select-xs"
                  value={item.openDirection}
                  onChange={(e) => actions.setDoorLayerItemDirection(item.id, e.target.value as "left" | "right" | "up" | "down")}
                >
                  <option value="left">left</option>
                  <option value="right">right</option>
                  <option value="up">up</option>
                  <option value="down">down</option>
                </select>
                <button type="button" className="button button-ghost" onClick={() => actions.setDoorLayerItemOpen(item.id, !item.isOpen)}>
                  {item.isOpen ? "Fechar" : "Abrir"}
                </button>
                <button type="button" className="button button-ghost" onClick={() => actions.removeDoorLayerItem(item.id)}>
                  Remover
                </button>
              </div>
            </div>
          ))
        )}

        <strong style={{ fontSize: 12, marginTop: 4 }}>DrawersLayer</strong>
        {drawers.length === 0 ? (
          <div className="muted-text">Sem gavetas.</div>
        ) : (
          drawers.map((item) => (
            <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10 }}>
              <div className="form-grid">
                <input className="input input-xs" type="number" value={item.width} onChange={onNumberDrawer(item.id, "width")} placeholder="Largura" />
                <input className="input input-xs" type="number" value={item.height} onChange={onNumberDrawer(item.id, "height")} placeholder="Altura" />
                <input className="input input-xs" type="number" value={item.depth} onChange={onNumberDrawer(item.id, "depth")} placeholder="Profundidade" />
                <input className="input input-xs" type="number" value={item.frontThickness} onChange={onNumberDrawer(item.id, "frontThickness")} placeholder="Frente" />
                <input className="input input-xs" type="number" value={item.pullDistanceMm} onChange={onNumberDrawer(item.id, "pullDistanceMm")} placeholder="Curso (mm)" />
                <input className="input input-xs" value={item.materialId ?? ""} onChange={(e) => actions.setDrawerLayerItemMaterial(item.id, e.target.value)} placeholder="Material ID" />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" className="button button-ghost" onClick={() => actions.setDrawerLayerItemOpen(item.id, !item.isOpen)}>
                  {item.isOpen ? "Fechar" : "Abrir"}
                </button>
                <button type="button" className="button button-ghost" onClick={() => actions.removeDrawerLayerItem(item.id)}>
                  Remover
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
