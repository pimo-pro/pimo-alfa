import { useState } from "react";
import { useProject } from "../../../context/useProject";
import { resolveDoorLabel } from "../../../core/doors/doorLabels";
import Panel from "../../ui/Panel";

type BoxLayersPanelProps = {
  embedded?: boolean;
};

export default function BoxLayersPanel({ embedded = false }: BoxLayersPanelProps) {
  const { project, actions } = useProject();
  const [expandedDoorIds, setExpandedDoorIds] = useState<Record<string, boolean>>({});

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
      <Panel title="Portas" description="Selecione uma caixa para configurar as camadas.">
        <p className="muted-text" style={{ margin: 0 }}>
          Nenhuma caixa selecionada.
        </p>
      </Panel>
    );
  }

  const doors = selectedBox.doorsLayer ?? [];

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
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {item.openDirection === "left"
                    ? "Abertura: para a esquerda"
                    : item.openDirection === "right"
                      ? "Abertura: para a direita"
                      : item.openDirection === "up"
                        ? "Abertura: para cima"
                        : "Abertura: para baixo"}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
                  {expandedDoorIds[item.id] ? "Ocultar" : "Detalhes"}
                </span>
              </button>

              {expandedDoorIds[item.id] && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {selectedBox.portaTipo !== "porta_correr" ? (
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Orientação da porta
                      </span>
                      <select
                        className="select select-xs"
                        value={item.openDirection}
                        disabled={
                          selectedBox.portaTipo === "porta_dupla" || item.groupType === "dupla"
                        }
                        onChange={(e) =>
                          actions.setDoorLayerItemDirection(
                            item.id,
                            e.target.value as "left" | "right" | "up" | "down"
                          )
                        }
                        title="Lado da porta / abertura para cima ou baixo"
                      >
                        <option value="left">Lado: esquerda</option>
                        <option value="right">Lado: direita</option>
                        <option value="up">Abertura: para cima</option>
                        <option value="down">Abertura: para baixo</option>
                      </select>
                    </label>
                  ) : null}
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
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <Panel title="Portas" description="Camadas independentes com pivôs próprios e materiais.">
      {content}
    </Panel>
  );
}
