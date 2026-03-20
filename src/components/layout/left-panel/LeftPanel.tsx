/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from "react";
import { useProject } from "../../../context/useProject";
import UnifiedPopover, { StepperPopover } from "../../ui/UnifiedPopover";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import Panel from "../../ui/Panel";
import { NumericInput } from "../../ui/NumericInput";
import { LEFT_TOOLBAR_IDS } from "../left-toolbar/LeftToolbar";
import PainelMoveisUnificado from "./PainelMoveisUnificado";
import PainelModelosDaCaixa from "./PainelModelosDaCaixa";
import BoxLayersPanel from "./BoxLayersPanel";
import { useUiStore } from "../../../stores/uiStore";
import { useToast } from "../../../context/ToastContext";
import { getViewerMaterialId, getMaterialByIdOrLabel } from "../../../core/materials";
import { cutlistComPrecoFromBoxes, ferragensFromBoxes } from "../../../core/manufacturing/cutlistFromBoxes";
import type { SavedProjectInfo } from "../../../context/projectTypes";
import {
  defaultIndustrialMaterials,
  fallbackMaterialsFromLocalStorage,
  normalizeApiMaterial,
  type MaterialOption,
} from "./materialOptions";
import { InfoPanelContent } from "./InfoPanelContent";
import { NotesField } from "./NotesField";
import { PlaceholderLeftPanel } from "./PlaceholderLeftPanel";
import { PainelSala } from "./PainelSala";

export type LeftPanelProps = {
  activeTab?: string;
};

export default function LeftPanel({ activeTab = "home" }: LeftPanelProps) {
  const selectedTool = useUiStore((state) => state.selectedTool);
  const setSelectedObject = useUiStore((state) => state.setSelectedObject);
  const setSelectedTool = useUiStore((state) => state.setSelectedTool);
  const { project, actions } = useProject();
  const { showToast } = useToast();
  const selectedBox = project.workspaceBoxes.find(
    (box) => box.id === project.selectedWorkspaceBoxId
  );
  const selectedPrateleiras = selectedBox?.prateleiras ?? 0;
  const selectedGavetas = selectedBox?.gavetas ?? 0;
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [editingBoxName, setEditingBoxName] = useState("");
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialsList, setMaterialsList] = useState<MaterialOption[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [savedRecentProjects, setSavedRecentProjects] = useState<SavedProjectInfo[]>([]);
  const [loadingSavedRecent, setLoadingSavedRecent] = useState(false);
  const { viewerApi } = usePimoViewerContext();
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

  useEffect(() => {
    if (!materialModalOpen) return;
    let active = true;

    const loadMaterials = async () => {
      setMaterialsLoading(true);

      // 1) API real (online)
      try {
        const response = await fetch("/api/materials", { method: "GET" });
        if (response.ok) {
          const payload = (await response.json()) as unknown;
          const rows = payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).materials)
            ? ((payload as Record<string, unknown>).materials as unknown[])
            : Array.isArray(payload)
              ? payload
              : [];
          const normalized = rows.map((row) => normalizeApiMaterial(row)).filter((row): row is MaterialOption => Boolean(row));
          if (normalized.length > 0) {
            if (active) setMaterialsList(normalized);
            if (active) setMaterialsLoading(false);
            return;
          }
        }
      } catch {
        // fallback abaixo
      }

      // 2) localStorage
      const fromLocalStorage = fallbackMaterialsFromLocalStorage();
      if (fromLocalStorage.length > 0) {
        if (active) setMaterialsList(fromLocalStorage);
        if (active) setMaterialsLoading(false);
        return;
      }

      // 3) defaults industriais
      if (active) setMaterialsList(defaultIndustrialMaterials());
      if (active) setMaterialsLoading(false);
    };

    void loadMaterials();
    return () => {
      active = false;
    };
  }, [materialModalOpen]);

  useEffect(() => {
    let active = true;
    const loadRecent = async () => {
      setLoadingSavedRecent(true);
      try {
        const projects = await actions.listSavedProjects("mine");
        if (active) setSavedRecentProjects(projects.slice(0, 4));
      } finally {
        if (active) setLoadingSavedRecent(false);
      }
    };
    void loadRecent();
    return () => {
      active = false;
    };
  }, [actions, project.lastAutosaveTime]);

  // Footer removed - buttons now in main content area

  const resolvedTabRaw = selectedTool ?? activeTab;
  const resolvedTab =
    resolvedTabRaw === LEFT_TOOLBAR_IDS.LAYOUT ? LEFT_TOOLBAR_IDS.HOME : resolvedTabRaw;

  // Móveis = painel unificado
  if (resolvedTab === LEFT_TOOLBAR_IDS.MOVEIS) {
    return <PainelMoveisUnificado />;
  }

  // Modelos = Instâncias dentro da caixa atual
  if (resolvedTab === LEFT_TOOLBAR_IDS.MODELOS) {
    return (
      <div className="left-panel-content">
        <div className="left-panel-scroll">
          <PainelModelosDaCaixa />
        </div>
      </div>
    );
  }

  // Calculadora — criar e apagar caixas
  if (resolvedTab === LEFT_TOOLBAR_IDS.CALCULADORA) {
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

  // Sala — RoomManager: dimensões, criar/remover sala, paredes extras, lock
  if (resolvedTab === LEFT_TOOLBAR_IDS.SALA) {
    return (
      <div className="left-panel-content">
        <div className="left-panel-scroll">
          <PainelSala />
        </div>
      </div>
    );
  }

  // Eletrodomésticos — placeholder
  if (resolvedTab === LEFT_TOOLBAR_IDS.ELETRO) {
    return (
      <PlaceholderLeftPanel
        title="Eletrodomésticos"
        description="Modelos 3D de eletrodomésticos (em breve)."
      />
    );
  }

  // Acessórios — placeholder
  if (resolvedTab === LEFT_TOOLBAR_IDS.ACESSORIOS) {
    return (
      <PlaceholderLeftPanel title="Acessórios" description="Acessórios (em breve)." />
    );
  }

  // Info — ajuda / como funciona (estrutura com tabs para futura Info Técnica)
  if (resolvedTab === LEFT_TOOLBAR_IDS.INFO) {
    return (
      <InfoPanelContent />
    );
  }

  if (resolvedTab === LEFT_TOOLBAR_IDS.HOME && !selectedBox) {
    return (
      <div className="left-panel-content">
        <div className="left-panel-scroll">
          <aside className="panel-content panel-content--side">
            <div className="design-panel-header">
              <div className="section-title">Início</div>
              <p className="design-panel-subtitle">Comece criando uma caixa e definindo os dados básicos do projeto.</p>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Nenhuma caixa selecionada. Defina o nome do projeto abaixo.
            </p>

            <button
              type="button"
              onClick={() => actions.addWorkspaceBox()}
              className="button button-primary"
              style={{ width: "100%", marginBottom: 12 }}
            >
              Criar Caixa
            </button>

            <Panel title="NOME DE PROJETO">
              <input
                type="text"
                value={project.projectName}
                onChange={(e) => actions.setProjectName(e.target.value)}
                placeholder="Nome do projeto"
                className="input input-sm"
              />
            </Panel>

            <Panel title="Notas">
              <NotesField projectName={project.projectName} />
            </Panel>
            <Panel title="Projetos Salvos" description="Últimos 4 projetos do utilizador">
              {loadingSavedRecent ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>A carregar...</p>
              ) : savedRecentProjects.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Sem projetos guardados.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {savedRecentProjects.map((saved) => (
                    <button
                      key={saved.id}
                      type="button"
                      className="panel-button"
                      style={{ textAlign: "left", width: "100%" }}
                      onClick={() => void actions.loadProjectSnapshot(saved.id)}
                    >
                      {saved.name}
                    </button>
                  ))}
                </div>
              )}
            </Panel>
          </aside>
        </div>
      </div>
    );
  }

  // Página inicial (HOME)
  return (
    <div className="left-panel-content">
      <div className="left-panel-scroll">
    <aside className="panel-content panel-content--side">
      <div className="design-panel-header">
        <div className="section-title">Início</div>
        <p className="design-panel-subtitle">Controles principais da caixa selecionada e definição inicial do projeto.</p>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        Crie novas caixas a partir daqui para começar o seu projeto.
      </p>
      
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => actions.addWorkspaceBox()}
          className="button button-primary"
          style={{ flex: 1, minWidth: 140 }}
        >
          Adicionar Caixote
        </button>
        {selectedBox && (
          <button
            type="button"
            onClick={() => actions.duplicateWorkspaceBox()}
            className="button button-ghost"
            style={{ flex: 1, minWidth: 140 }}
          >
            Duplicar Caixa
          </button>
        )}
      </div>

      {selectedBox && (
        <Panel title="NOME DA CAIXA">
          <input
            type="text"
            value={selectedBox.nome}
            onChange={(e) => actions.setWorkspaceBoxNome(selectedBox.id, e.target.value)}
            placeholder="Nome da caixa"
            className="input input-sm"
          />
        </Panel>
      )}

      {!selectedBox && (
        <div className="section-title" style={{ marginTop: 20 }}>Definições</div>
      )}

      {!selectedBox && (
        <Panel title="NOME DE PROJETO">
          <input
            type="text"
            value={project.projectName}
            onChange={(e) => actions.setProjectName(e.target.value)}
            placeholder="Nome do projeto"
            className="input input-sm"
          />
        </Panel>
      )}

      {!selectedBox && (
        <Panel title="Material do projeto" description="Material padrão (somente leitura)">
          <div style={{ fontSize: 12, color: "var(--text-main)" }}>
            {project.materialId
              ? (getMaterialByIdOrLabel(project.materialId)?.label ?? project.material.tipo)
              : project.material.tipo}
          </div>
        </Panel>
      )}

      <Panel title="Dimensões" description="Valores em milímetros">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="panel-field-row">
            <span className="panel-label">Largura:</span>
            <NumericInput
              value={selectedBox?.dimensoes.largura ?? project.dimensoes.largura}
              onChange={(value) => {
                actions.setDimensoes({ largura: value });
              }}
              className="input input-xs"
              unit="mm"
            />
          </div>
          <div className="panel-field-row">
            <span className="panel-label">Altura:</span>
            <NumericInput
              value={selectedBox?.dimensoes.altura ?? project.dimensoes.altura}
              onChange={(value) => {
                actions.setDimensoes({ altura: value });
              }}
              className="input input-xs"
              unit="mm"
            />
          </div>
          <div className="panel-field-row">
            <span className="panel-label">Profundidade:</span>
            <NumericInput
              value={selectedBox?.dimensoes.profundidade ?? project.dimensoes.profundidade}
              onChange={(value) => {
                actions.setDimensoes({ profundidade: value });
              }}
              className="input input-xs"
              unit="mm"
            />
          </div>
        </div>
      </Panel>

      {selectedBox && (
        <button
          type="button"
          className="button button-ghost"
          style={{ width: "100%", marginBottom: 8 }}
          onClick={() => setMaterialModalOpen(true)}
        >
          Selecionar Material
        </button>
      )}

      {materialModalOpen && selectedBox && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setMaterialModalOpen(false)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: 360, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">Selecionar Material</div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setMaterialModalOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div style={{ padding: "0 16px 16px", overflowY: "auto", flex: 1 }}>
              {materialsLoading && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                  A carregar materiais...
                </p>
              )}
              {materialsList.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Nenhum material no registo. Adicione em Admin → Materials.
                </p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {materialsList.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="card"
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          textAlign: "left",
                          cursor: "pointer",
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.04)",
                        }}
                        onClick={() => {
                          actions.setWorkspaceBoxMaterial(selectedBox.id, m.id);
                          viewerApi?.updateBox(selectedBox.id, {
                            materialName: getViewerMaterialId(m.id),
                          });
                          showToast("Material aplicado à caixa.", "info");
                          setMaterialModalOpen(false);
                        }}
                      >
                        {m.color && (
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              background: m.color,
                              border: "1px solid rgba(255,255,255,0.2)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>{m.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {m.espessura ?? "—"} mm · {m.precoPorM2 ?? "—"} €/m²
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedBox && (
        <Panel title="Pés">
          {(() => {
            const feetHeightMm = Math.max(40, selectedBox.feetHeight ?? ((selectedBox.pe_cm ?? 10) * 10));
            const feetOffsetFrontMm = Math.max(0, selectedBox.feetOffsetFront ?? 100);
            const shouldLockY = selectedBox.cabinetType === "lower";
            const feetEnabled = selectedBox.feetEnabled !== false;
            return (
              <>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--text-main)",
            }}
          >
            <input
              type="checkbox"
              checked={feetEnabled}
              onChange={(e) => {
                const nextEnabled = e.target.checked;
                const partial: {
                  feetEnabled: boolean;
                  y_mm?: number;
                  manualPosition?: boolean;
                } = { feetEnabled: nextEnabled };
                if (nextEnabled && shouldLockY) {
                  partial.y_mm = feetHeightMm + selectedBox.dimensoes.altura / 2;
                  partial.manualPosition = true;
                } else if (!nextEnabled && shouldLockY) {
                  partial.manualPosition = true;
                }
                actions.updateWorkspaceBoxTransform(selectedBox.id, partial);
              }}
            />
            Ativar pés
          </label>

          {feetEnabled && (
          <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            <div className="panel-field-row">
              <label className="panel-label" style={{ minWidth: 110 }}>Altura (mm)</label>
              <NumericInput
                value={feetHeightMm}
                min={40}
                onChange={(clamped) => {
                  const partial: {
                    feetHeight: number;
                    y_mm?: number;
                    manualPosition?: boolean;
                  } = { feetHeight: clamped };
                  if (selectedBox.feetEnabled !== false && shouldLockY) {
                    partial.y_mm = clamped + selectedBox.dimensoes.altura / 2;
                    partial.manualPosition = true;
                  }
                  actions.updateWorkspaceBoxTransform(selectedBox.id, partial);
                }}
                className="input input-sm"
                style={{ width: 110 }}
              />
            </div>

            <div className="panel-field-row">
              <label className="panel-label" style={{ minWidth: 110 }}>Recuo frontal (mm)</label>
              <NumericInput
                value={feetOffsetFrontMm}
                min={0}
                onChange={(value) => {
                  actions.updateWorkspaceBoxTransform(selectedBox.id, {
                    feetOffsetFront: Math.max(0, Math.round(value)),
                  });
                }}
                className="input input-sm"
                style={{ width: 110 }}
              />
            </div>
          </div>

          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
            Pés fixos em 4 unidades por caixa (controle de quantidade reservado para futura versão).
          </p>
          </>
          )}
              </>
            );
          })()}
        </Panel>
      )}

      {selectedBox && (
        <Panel title="Opções do box" description="Prateleiras, portas e gavetas no mesmo local.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <StepperPopover
              id="prateleiras-popover"
              label="Prateleiras"
              value={selectedPrateleiras}
              onChange={(v) => actions.setPrateleiras(v)}
            />
            <StepperPopover
              id="gavetas-popover"
              label="Gavetas"
              value={selectedGavetas}
              onChange={(v) => actions.setGavetas(v)}
            />
            <UnifiedPopover trigger={<span>Tipo de porta: <strong>{selectedBox?.portaTipo === "sem_porta" ? "Sem" : selectedBox?.portaTipo === "porta_simples" ? "Simples" : selectedBox?.portaTipo === "porta_correr" ? "Correr" : "Dupla"}</strong></span>}>
              <select
                value={selectedBox?.portaTipo ?? "sem_porta"}
                onChange={(e) => actions.setPortaTipo(e.target.value as "sem_porta" | "porta_simples" | "porta_dupla" | "porta_correr")}
                className="select"
                style={{ width: "100%" }}
              >
                <option value="sem_porta">Sem porta</option>
                <option value="porta_simples">Porta simples</option>
                <option value="porta_dupla">Porta dupla</option>
                <option value="porta_correr">Porta de correr</option>
              </select>
            </UnifiedPopover>
          </div>

          <BoxLayersPanel embedded />
        </Panel>
      )}

    </aside>
      </div>
    </div>
  );
}
