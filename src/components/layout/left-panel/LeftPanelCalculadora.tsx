import { useMemo, useState } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import { LEFT_TOOLBAR_IDS } from "../left-toolbar/LeftToolbar";
import { useUiStore } from "../../../stores/uiStore";
import { cutlistComPrecoFromBoxes, ferragensFromBoxes } from "../../../core/manufacturing/cutlistFromBoxes";

export function LeftPanelCalculadora() {
  const setSelectedObject = useUiStore((state) => state.setSelectedObject);
  const setSelectedTool = useUiStore((state) => state.setSelectedTool);
  const { project, actions } = useProject();
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [editingBoxName, setEditingBoxName] = useState("");

  const boxes = useMemo(() => project.boxes ?? [], [project.boxes]);
  const cutlistFromBoxes = useMemo(() => {
    const parametric = cutlistComPrecoFromBoxes(
      boxes,
      project.rules,
      project.materialId,
      project.projectName
    );
    const extracted = boxes.flatMap((box) =>
      Object.values(project.extractedPartsByBoxId?.[box.id] ?? {}).flat()
    );
    return [...parametric, ...extracted];
  }, [boxes, project.extractedPartsByBoxId, project.materialId, project.projectName, project.rules]);
  const ferragensFromBoxesList = useMemo(
    () => ferragensFromBoxes(boxes, project.rules),
    [boxes, project.rules]
  );
  const totalPecas = cutlistFromBoxes.reduce((sum, item) => sum + item.quantidade, 0);
  const totalFerragens = ferragensFromBoxesList.reduce((sum, item) => sum + item.quantidade, 0);
  const totalItens = totalPecas + totalFerragens;

  return (
    <div className="left-panel-content">
      <div className="left-panel-scroll">
        <aside className="panel-content panel-content--side">
          <Panel title="Resultados Atuais" description="Resumo rápido do projeto em edição.">
            <div className="panel-field-row">
              <span className="panel-label">Peças</span>
              <strong style={{ fontSize: 12, fontWeight: 600 }}>{totalPecas}</strong>
            </div>
            <div className="panel-field-row">
              <span className="panel-label">Ferragens</span>
              <strong style={{ fontSize: 12, fontWeight: 600 }}>{totalFerragens}</strong>
            </div>
            <div className="panel-field-row">
              <span className="panel-label">Total de itens</span>
              <strong style={{ fontSize: 12, fontWeight: 600 }}>{totalItens}</strong>
            </div>
          </Panel>

          <div className="design-panel-header">
            <div className="section-title">Calculadora</div>
            <p className="design-panel-subtitle">
              Criar, renomear e organizar caixas do projeto.
            </p>
          </div>
          <Panel title="Caixas">
            <button
              type="button"
              onClick={() => actions.addWorkspaceBox()}
              className="button button-ghost"
              style={{ width: "100%", marginBottom: 12 }}
            >
              Adicionar caixote
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {project.workspaceBoxes.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Nenhuma caixa. Clique em &quot;Adicionar caixote&quot;.
                </p>
              ) : (
                project.workspaceBoxes.map((box) => {
                  const isSelected = box.id === project.selectedWorkspaceBoxId;
                  const isEditing = editingBoxId === box.id;
                  return (
                    <div
                      key={box.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        background: isSelected ? "rgba(56, 189, 248, 0.12)" : "var(--surface)",
                        border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 6,
                      }}
                    >
                      {isEditing ? (
                        <div style={{ flex: 1, display: "flex", gap: 4 }}>
                          <input
                            type="text"
                            value={editingBoxName}
                            onChange={(e) => setEditingBoxName(e.target.value)}
                            className="input input-xs"
                            style={{ flex: 1 }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                actions.setWorkspaceBoxNome(box.id, editingBoxName.trim() || box.nome);
                                setEditingBoxId(null);
                              } else if (e.key === "Escape") setEditingBoxId(null);
                            }}
                            autoFocus
                          />
                          <button type="button" className="panel-button" style={{ fontSize: 11 }} onClick={() => { actions.setWorkspaceBoxNome(box.id, editingBoxName.trim() || box.nome); setEditingBoxId(null); }}>OK</button>
                          <button type="button" className="panel-button" style={{ fontSize: 11 }} onClick={() => setEditingBoxId(null)}>✕</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            actions.selectBox(box.id);
                            setSelectedTool(LEFT_TOOLBAR_IDS.HOME);
                            setSelectedObject({ type: "box", id: box.id });
                          }}
                          onDoubleClick={() => { setEditingBoxId(box.id); setEditingBoxName(box.nome); }}
                          className="panel-button"
                          title="Duplo-clique para editar nome"
                          style={{
                            flex: 1,
                            textAlign: "left",
                            padding: "6px 8px",
                            background: "transparent",
                            border: "none",
                          }}
                        >
                          {box.nome} — {box.dimensoes.largura}×{box.dimensoes.altura}×{box.dimensoes.profundidade} mm
                        </button>
                      )}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => actions.removeWorkspaceBoxById(box.id)}
                          className="panel-button"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          title="Apagar caixa"
                        >
                          Apagar
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Panel>
          <button
            type="button"
            onClick={() => void actions.gerarESalvarDesign()}
            disabled={project.estaCarregando}
            className="button button-primary"
            style={{ width: "100%", marginTop: 8 }}
          >
            Gerar e Salvar Design
          </button>
        </aside>
      </div>
    </div>
  );
}
