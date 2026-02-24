import type { ChangeEvent } from "react";
import { useProject } from "../../../context/useProject";
import type { DoorOrDrawerOpenDirection } from "../../../models/DoorOrDrawer";
import Panel from "../../ui/Panel";

const openDirections: DoorOrDrawerOpenDirection[] = ["left", "right", "up", "down", "pull"];

export default function DoorsAndDrawersPanel() {
  const { project, actions } = useProject();
  const selectedBox =
    project.workspaceBoxes.find((box) => box.id === project.selectedWorkspaceBoxId) ??
    project.workspaceBoxes[0];
  const items = selectedBox?.doorsAndDrawers ?? [];

  const handleNumber =
    (id: string, field: "width" | "height" | "depth" | "thickness") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      actions.updateDoorOrDrawer(id, { [field]: Number(event.target.value) || 0 });
    };

  if (!selectedBox) {
    return (
      <Panel title="Portas e Gavetas" description="Selecione uma caixa para configurar.">
        <p className="muted-text" style={{ margin: 0 }}>Nenhuma caixa selecionada.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Portas e Gavetas"
      description="Gerencie elementos frontais da caixa selecionada."
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="button button-ghost" onClick={() => actions.addDoorOrDrawer("door")}>
          Adicionar Porta
        </button>
        <button type="button" className="button button-ghost" onClick={() => actions.addDoorOrDrawer("drawer")}>
          Adicionar Gaveta
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={() => actions.generateDoorsAndDrawersForSelectedBox()}
        >
          Gerar Automaticamente
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.length === 0 ? (
          <div className="muted-text">Sem portas/gavetas nesta caixa.</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 12 }}>
                  {item.type === "door" ? "Porta" : "Gaveta"}
                </strong>
                <select
                  className="select select-xs"
                  value={item.openDirection}
                  onChange={(e) =>
                    actions.updateDoorOrDrawer(item.id, {
                      openDirection: e.target.value as DoorOrDrawerOpenDirection,
                    })
                  }
                >
                  {openDirections.map((dir) => (
                    <option key={dir} value={dir}>
                      {dir}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid">
                <input className="input input-xs" type="number" value={item.width} onChange={handleNumber(item.id, "width")} placeholder="Largura" />
                <input className="input input-xs" type="number" value={item.height} onChange={handleNumber(item.id, "height")} placeholder="Altura" />
                <input className="input input-xs" type="number" value={item.depth} onChange={handleNumber(item.id, "depth")} placeholder="Profundidade" />
                <input className="input input-xs" type="number" value={item.thickness} onChange={handleNumber(item.id, "thickness")} placeholder="Espessura" />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => actions.toggleDoorOrDrawer(item.id)}
                >
                  {item.isOpen ? "Fechar" : "Abrir"}
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => actions.removeDoorOrDrawer(item.id)}
                >
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
