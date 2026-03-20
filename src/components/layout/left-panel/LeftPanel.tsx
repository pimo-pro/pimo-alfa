/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
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
import type { SavedProjectInfo } from "../../../context/projectTypes";
import { InfoPanelContent } from "./InfoPanelContent";
import { NotesField } from "./NotesField";
import { PlaceholderLeftPanel } from "./PlaceholderLeftPanel";
import { PainelSala } from "./PainelSala";
import { MaterialPickerModal } from "./MaterialPickerModal";
import { useMaterialsForPicker } from "./hooks/useMaterialsForPicker";
import { LeftPanelCalculadora } from "./LeftPanelCalculadora";

export type LeftPanelProps = {
  activeTab?: string;
};

export default function LeftPanel({ activeTab = "home" }: LeftPanelProps) {
  const selectedTool = useUiStore((state) => state.selectedTool);
  const { project, actions } = useProject();
  const { showToast } = useToast();
  const selectedBox = project.workspaceBoxes.find(
    (box) => box.id === project.selectedWorkspaceBoxId
  );
  const selectedPrateleiras = selectedBox?.prateleiras ?? 0;
  const selectedGavetas = selectedBox?.gavetas ?? 0;
  const { materialModalOpen, setMaterialModalOpen, materialsList, materialsLoading } = useMaterialsForPicker();
  const [savedRecentProjects, setSavedRecentProjects] = useState<SavedProjectInfo[]>([]);
  const [loadingSavedRecent, setLoadingSavedRecent] = useState(false);
  const { viewerApi } = usePimoViewerContext();

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
    return <LeftPanelCalculadora />;
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
        <MaterialPickerModal
          materialsLoading={materialsLoading}
          materialsList={materialsList}
          onClose={() => setMaterialModalOpen(false)}
          onSelectMaterial={(m) => {
            actions.setWorkspaceBoxMaterial(selectedBox.id, m.id);
            viewerApi?.updateBox(selectedBox.id, {
              materialName: getViewerMaterialId(m.id),
            });
            showToast("Material aplicado à caixa.", "info");
            setMaterialModalOpen(false);
          }}
        />
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
