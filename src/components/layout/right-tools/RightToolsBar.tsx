import { useEffect, useMemo, useState } from "react";
import { useProject } from "../../../context/useProject";
import { useToast } from "../../../context/ToastContext";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import { useToolbarModal } from "../../../context/ToolbarModalContext";
import {
  cutlistComPrecoFromBoxes,
  ferragensFromBoxes,
} from "../../../core/manufacturing/cutlistFromBoxes";
import {
  calcularPrecoTotalPecas,
  calcularPrecoTotalProjeto,
} from "../../../core/pricing/pricing";
import Piece3DModal from "../../modals/Piece3DModal";
import { buildViewerDrillMarkersByPanel } from "../../../modules/drilling/drillingAdapter";
import type {
  UltraPerformanceInternalMode,
  ViewerBackgroundMode,
  ViewerMaterialQuality,
} from "../../../context/projectTypes";

type SendMethod = "whatsapp" | "email" | "download";

type SendSelections = {
  image: boolean;
  viewerSnapshot: boolean;
  projectSnapshot: boolean;
  cutlist: boolean;
  ferragens: boolean;
  precos: boolean;
};

const defaultSendSelections: SendSelections = {
  image: true,
  viewerSnapshot: true,
  projectSnapshot: true,
  cutlist: true,
  ferragens: true,
  precos: true,
};

const boxCardStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  marginBottom: 8,
};
const boxCardTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-main)",
  marginBottom: 6,
};
const boxCardDimsStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginBottom: 8,
};
const boxCardRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const panelLabels: Record<"left" | "right" | "top" | "bottom" | "back", string> = {
  left: "Lateral Esq",
  right: "Lateral Dir",
  top: "Topo",
  bottom: "Fundo",
  back: "Costa",
};

const panelKeyByType = {
  left: "lateral_esquerda",
  right: "lateral_direita",
  top: "cima",
  bottom: "fundo",
  back: "costa",
} as const;

export default function RightToolsBar() {
  const { actions, project } = useProject();
  const { showToast } = useToast();
  const { viewerApi } = usePimoViewerContext();
  const { modal, openModal, closeModal } = useToolbarModal();
  const workspaceBoxes = project.workspaceBoxes;
  const selectedId = project.selectedWorkspaceBoxId;
  // Single Source of Truth: Resultados Atuais derivados de project.boxes (não project.resultados/acessorios)
  // boxes em useMemo para referência estável e evitar reexecução dos useMemo abaixo a cada render
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
  const totalPecas =
    cutlistFromBoxes.reduce((sum, item) => sum + item.quantidade, 0);
  const totalFerragens =
    ferragensFromBoxesList.reduce((sum, a) => sum + a.quantidade, 0);
  const totalItens = totalPecas + totalFerragens;
  const [savedProjects, setSavedProjects] = useState(() => actions.listSavedProjects());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [photoCaptureUrl, setPhotoCaptureUrl] = useState<string | null>(null);
  const [pieceSearch, setPieceSearch] = useState("");
  const [sendMethod, setSendMethod] = useState<SendMethod>("download");
  const [sendSelections, setSendSelections] = useState<SendSelections>(defaultSendSelections);
  const [integrationMessage, setIntegrationMessage] = useState("");
  const [showPiece3DModal, setShowPiece3DModal] = useState(false);
  const modalTitle = useMemo(() => {
    if (modal === "projects") return "Projetos salvos";
    if (modal === "2d") return "2D Viewer";
    if (modal === "send") return "Enviar";
    if (modal === "integration") return "Integração";
    if (modal === "validation") return "Validação do Projeto";
    return "";
  }, [modal]);
  const selectedWorkspaceBox = useMemo(
    () => project.workspaceBoxes.find((b) => b.id === project.selectedWorkspaceBoxId) ?? null,
    [project.selectedWorkspaceBoxId, project.workspaceBoxes]
  );
  const selectedViewerDrillMarkers = useMemo(() => {
    const selectedBoxCutList = project.boxes.find((b) => b.id === project.selectedWorkspaceBoxId)?.cutList;
    return buildViewerDrillMarkersByPanel(selectedBoxCutList);
  }, [project.boxes, project.selectedWorkspaceBoxId]);
  const toggleHiddenPanel = (panel: "left" | "right" | "top" | "bottom" | "back") => {
    const current = project.viewerSettings.hiddenPanels;
    const next = current.includes(panel)
      ? current.filter((item) => item !== panel)
      : [...current, panel];
    actions.setViewerSettings({ hiddenPanels: next });
  };

  const panelVisibilityEntries = useMemo(() => {
    return workspaceBoxes.flatMap((box) => {
      return (Object.keys(panelLabels) as Array<"left" | "right" | "top" | "bottom" | "back">).map((panel) => {
        const panelKey = panelKeyByType[panel];
        const panelIdFromBox = box.panelIds?.[panelKey];
        const pieceId =
          typeof panelIdFromBox === "string" && panelIdFromBox.trim().length > 0
            ? panelIdFromBox
            : `${box.id}:${panel}`;
        return {
          id: pieceId,
          panel,
          boxId: box.id,
          boxName: box.nome,
          label: panelLabels[panel],
          searchText: `${box.nome} ${panelLabels[panel]} ${box.id}`.toLowerCase(),
        };
      });
    });
  }, [workspaceBoxes]);

  const filteredPanelVisibilityEntries = useMemo(() => {
    const query = pieceSearch.trim().toLowerCase();
    if (!query) return panelVisibilityEntries;
    return panelVisibilityEntries.filter((entry) => entry.searchText.includes(query));
  }, [panelVisibilityEntries, pieceSearch]);

  const toggleHiddenPiece = (pieceId: string) => {
    const current = project.viewerSettings.hiddenPanels;
    const next = current.includes(pieceId)
      ? current.filter((item) => item !== pieceId)
      : [...current, pieceId];
    actions.setViewerSettings({ hiddenPanels: next });
  };

  const isPieceHidden = (pieceId: string, panel: "left" | "right" | "top" | "bottom" | "back") => {
    const hidden = project.viewerSettings.hiddenPanels;
    return hidden.includes(pieceId) || hidden.includes(panel);
  };

  useEffect(() => {
    actions.runProjectValidation();
  }, [actions, project.workspaceBoxes, project.boxes]);

  const refreshSavedProjects = () => {
    setSavedProjects(actions.listSavedProjects());
  };

  const resetSendState = () => {
    setSendMethod("download");
    setSendSelections(defaultSendSelections);
    setIntegrationMessage("");
  };

  const toggleSendSelection = (key: keyof SendSelections) => {
    setSendSelections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const slugifyName = (value: string) => {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const serializeProjectState = () => {
    return JSON.parse(
      JSON.stringify(project, (_key, value) => {
        if (value instanceof Date) {
          return { __date: value.toISOString() };
        }
        return value;
      })
    );
  };

  const buildSendPackage = () => {
    const timestamp = new Date();
    const shouldCaptureViewer = sendSelections.viewerSnapshot || sendSelections.projectSnapshot;
    const viewerSnapshot = shouldCaptureViewer ? null : null;
    const payload: Record<string, unknown> = {};

    if (sendSelections.viewerSnapshot) {
      payload.viewerSnapshot = viewerSnapshot;
    }

    if (sendSelections.projectSnapshot) {
      payload.projectSnapshot = {
        projectState: serializeProjectState(),
        viewerSnapshot,
      };
    }

    if (sendSelections.image) {
      payload.imagem = photoCaptureUrl ?? null;
    }

    // Single Source of Truth: cutlist, ferragens e precos derivados de project.boxes
    const boxes = project.boxes ?? [];
    const cutlistFromBoxes = cutlistComPrecoFromBoxes(
      boxes,
      project.rules,
      project.materialId,
      project.projectName
    );
    const ferragensFromBoxesList = ferragensFromBoxes(boxes, project.rules);
    const totalPecasFromBoxes =
      cutlistFromBoxes.length > 0
        ? calcularPrecoTotalPecas(cutlistFromBoxes)
        : null;
    const totalAcessoriosFromBoxes =
      ferragensFromBoxesList.length > 0
        ? ferragensFromBoxesList.reduce((s, a) => s + a.precoTotal, 0)
        : null;
    const totalProjetoFromBoxes =
      totalPecasFromBoxes != null && totalAcessoriosFromBoxes != null
        ? calcularPrecoTotalProjeto(totalPecasFromBoxes + totalAcessoriosFromBoxes)
        : null;

    if (sendSelections.cutlist) {
      payload.cutlist = cutlistFromBoxes.length > 0 ? cutlistFromBoxes : null;
    }

    if (sendSelections.ferragens) {
      payload.ferragens =
        ferragensFromBoxesList.length > 0 ? ferragensFromBoxesList : null;
    }

    if (sendSelections.precos) {
      payload.precos = {
        cutListComPreco: cutlistFromBoxes.length > 0 ? cutlistFromBoxes : null,
        acessorios: ferragensFromBoxesList.length > 0 ? ferragensFromBoxesList : null,
        totalPecas: totalPecasFromBoxes,
        totalAcessorios: totalAcessoriosFromBoxes,
        totalProjeto: totalProjetoFromBoxes,
      };
    }

    return {
      meta: {
        createdAt: timestamp.toISOString(),
        projectName: project.projectName,
        version: "fase-6-g",
      },
      payload,
    };
  };

  const downloadSendPackage = () => {
    const pacote = buildSendPackage();
    const projectSlug = slugifyName(project.projectName || "projeto");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `pimo-envio-${projectSlug || "projeto"}-${timestamp}.json`;
    const blob = new Blob([JSON.stringify(pacote, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const handleSendPackage = () => {
    if (sendMethod === "download") {
      downloadSendPackage();
      return;
    }
    const channelLabel = sendMethod === "whatsapp" ? "WhatsApp" : "Email";
    setIntegrationMessage(`Integração ${channelLabel} em desenvolvimento.`);
    openModal("integration");
  };

  const handleCloseModal = () => {
    if (modal === "projects") {
      setRenamingId(null);
      setRenameValue("");
    }
    if (modal === "send" || modal === "integration") {
      resetSendState();
    }
    closeModal();
  };

  return (
    <>
      <aside className="right-tools-bar" aria-label="Resultados e modais">
        <div className="right-tools-card" style={{ marginTop: 0 }}>
          <div className="right-tools-card-title">Viewer Settings</div>
          <div className="right-tools-card-description">Controles da Fase 3 (preparação visual).</div>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, marginBottom: 8 }}>
            Background
            <select
              value={project.viewerSettings.backgroundMode}
              onChange={(e) => actions.setViewerSettings({ backgroundMode: e.target.value as ViewerBackgroundMode })}
              className="input input-sm"
            >
              <option value="studio">Studio</option>
              <option value="white">White</option>
              <option value="dark">Dark</option>
              <option value="woodFloor">Wood Floor</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, marginBottom: 8 }}>
            Qualidade de material
            <select
              value={project.viewerSettings.materialQuality}
              onChange={(e) => actions.setViewerSettings({ materialQuality: e.target.value as ViewerMaterialQuality })}
              className="input input-sm"
            >
              <option value="standard">Standard</option>
              <option value="premium">Premium (PBR)</option>
              <option value="lacquered">Lacado</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={project.viewerSettings.showPanelEdges}
              onChange={(e) => actions.setViewerSettings({ showPanelEdges: e.target.checked })}
            />
            Mostrar arestas dos painéis
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={project.viewerSettings.hideAllPanels}
              onChange={(e) => actions.setViewerSettings({ hideAllPanels: e.target.checked })}
            />
            Esconder todos os painéis
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={project.viewerSettings.showCeiling}
              onChange={(e) => actions.setViewerSettings({ showCeiling: e.target.checked })}
            />
            Mostrar teto da sala
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={project.viewerSettings.wallEditMode}
              onChange={(e) => actions.setViewerSettings({ wallEditMode: e.target.checked })}
            />
            Modo edição de paredes
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={project.viewerSettings.enableReflections}
              onChange={(e) => actions.setViewerSettings({ enableReflections: e.target.checked })}
            />
            Reflexos dinâmicos (probe)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={project.viewerSettings.explodedViewEnabled}
              onChange={(e) => actions.setViewerSettings({ explodedViewEnabled: e.target.checked })}
            />
            Exploded View
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, marginBottom: 8 }}>
            Intensidade Exploded ({Math.round(project.viewerSettings.explodedViewIntensity * 100)}%)
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={project.viewerSettings.explodedViewIntensity}
              disabled={!project.viewerSettings.explodedViewEnabled}
              onChange={(e) =>
                actions.setViewerSettings({
                  explodedViewIntensity: Math.max(0, Math.min(1, Number.parseFloat(e.target.value) || 0)),
                })
              }
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={project.viewerSettings.ultraPerformanceModeOptions.enabled}
              onChange={(e) =>
                actions.setViewerSettings({
                  ultraPerformanceModeOptions: {
                    ...project.viewerSettings.ultraPerformanceModeOptions,
                    enabled: e.target.checked,
                  },
                })
              }
            />
            Ultra Performance
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, marginBottom: 8 }}>
            Modo Ultra
            <select
              value={project.viewerSettings.ultraPerformanceModeOptions.mode}
              onChange={(e) =>
                actions.setViewerSettings({
                  ultraPerformanceModeOptions: {
                    ...project.viewerSettings.ultraPerformanceModeOptions,
                    mode: e.target.value as UltraPerformanceInternalMode,
                  },
                })
              }
              className="input input-sm"
            >
              <option value="balanced">Balanced</option>
              <option value="flat2">Flat 2.0</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </label>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <strong style={{ fontSize: 12 }}>Peças (painéis)</strong>
            <button
              type="button"
              className="button button-ghost"
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => actions.setViewerSettings({ hiddenPanels: [] })}
            >
              Mostrar tudo
            </button>
          </div>
          <input
            className="input input-sm"
            placeholder="Buscar peça (caixa ou painel)"
            value={pieceSearch}
            onChange={(event) => setPieceSearch(event.target.value)}
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {(Object.keys(panelLabels) as Array<"left" | "right" | "top" | "bottom" | "back">).map((panel) => {
              const isHidden = project.viewerSettings.hiddenPanels.includes(panel);
              return (
                <button
                  key={`panel-toggle-${panel}`}
                  type="button"
                  className="button button-ghost"
                  style={{ fontSize: 11, padding: "4px 8px", opacity: isHidden ? 0.65 : 1 }}
                  onClick={() => toggleHiddenPanel(panel)}
                >
                  {isHidden ? "Mostrar" : "Esconder"} todas: {panelLabels[panel]}
                </button>
              );
            })}
          </div>
          <div
            style={{
              maxHeight: 180,
              overflowY: "auto",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {filteredPanelVisibilityEntries.length === 0 ? (
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Nenhuma peça encontrada.</div>
            ) : (
              filteredPanelVisibilityEntries.map((entry) => {
                const hiddenGlobally = project.viewerSettings.hiddenPanels.includes(entry.panel);
                const hidden = isPieceHidden(entry.id, entry.panel);
                return (
                  <label
                    key={`panel-piece-${entry.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      fontSize: 11,
                      opacity: hidden ? 0.65 : 1,
                    }}
                  >
                    <span style={{ color: "var(--text-muted)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.boxName} · {entry.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={!hidden}
                      disabled={hiddenGlobally}
                      onChange={() => toggleHiddenPiece(entry.id)}
                      title={
                        hiddenGlobally
                          ? "Tipo de painel está escondido globalmente"
                          : hidden
                            ? "Mostrar peça"
                            : "Esconder peça"
                      }
                    />
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="right-tools-card" style={{ marginTop: 16 }}>
          <div className="right-tools-card-title">Resultados Atuais</div>
          <div className="right-tools-card-description">Resumo rápido do projeto em edição.</div>
          <div className="right-tools-card-row">
            <span>Peças</span>
            <strong>{totalPecas}</strong>
          </div>
          <div className="right-tools-card-row">
            <span>Ferragens</span>
            <strong>{totalFerragens}</strong>
          </div>
          <div className="right-tools-card-row">
            <span>Total de itens</span>
            <strong>{totalItens}</strong>
          </div>
        </div>

        <div className="right-tools-card" style={{ marginTop: 16 }}>
          <div className="right-tools-card-title">Validação do Projeto</div>
          <div className="right-tools-card-description">Erros e avisos estruturais detectados.</div>
          <div className="right-tools-card-row">
            <span>Erros</span>
            <strong>{project.projectValidation.items.filter((item) => item.severity === "error").length}</strong>
          </div>
          <div className="right-tools-card-row">
            <span>Avisos</span>
            <strong>{project.projectValidation.items.filter((item) => item.severity === "warning").length}</strong>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, marginBottom: 8 }}>
            <button
              type="button"
              className="button button-ghost"
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => actions.runProjectValidation()}
            >
              Revalidar
            </button>
            <button
              type="button"
              className="button button-ghost"
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => openModal("validation")}
            >
              Ver lista
            </button>
          </div>
          <div style={{ maxHeight: 120, overflowY: "auto", fontSize: 11, color: "var(--text-muted)" }}>
            {project.projectValidation.items.length === 0 ? (
              <div>Sem avisos no momento.</div>
            ) : (
              project.projectValidation.items.slice(0, 4).map((item) => (
                <div key={`validation-preview-${item.id}`} style={{ marginBottom: 4 }}>
                  [{item.severity === "error" ? "Erro" : "Aviso"}] {item.message}
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
            Último autosave: {project.lastAutosaveTime ? new Date(project.lastAutosaveTime).toLocaleString() : "—"}
          </div>
          <button
            type="button"
            className="button button-ghost"
            style={{ marginTop: 8, fontSize: 11, padding: "4px 8px" }}
            onClick={() => {
              actions.saveManualBackupSnapshot();
              showToast("Backup manual criado.", "info", 1600);
            }}
          >
            Criar Backup Manual
          </button>
        </div>

        {/* Lista de Caixas - último bloco do painel direito */}
        <div className="right-tools-card" style={{ marginTop: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Lista de Caixas</div>
          <div className="right-tools-card-description" style={{ marginBottom: 8 }}>
            Selecione rapidamente uma caixa para editar no workspace.
          </div>
          <div
            className="boxes-list"
            style={{
              maxHeight: 300,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {workspaceBoxes.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>
                Nenhuma caixa. Clique em &quot;Adicionar caixote&quot; ou &quot;Gerar Design 3D&quot;.
              </div>
            ) : (
              workspaceBoxes.map((box) => {
                const d = box.dimensoes;
                const isSelected = box.id === selectedId;
                return (
                  <div
                    key={`box-list-${box.id}`}
                    style={{
                      ...boxCardStyle,
                      borderColor: isSelected ? "var(--blue-light)" : "rgba(255,255,255,0.08)",
                      background: isSelected ? "rgba(59, 130, 246, 0.12)" : "rgba(255,255,255,0.04)",
                    }}
                  >
                    <div style={boxCardTitleStyle}>{box.nome}</div>
                    <div style={boxCardDimsStyle}>
                      {d?.largura != null && d?.altura != null && d?.profundidade != null
                        ? `${d.largura} × ${d.altura} × ${d.profundidade} mm`
                        : "—"}
                    </div>
                    <div style={boxCardRowStyle}>
                      <button
                        type="button"
                        title="Selecionar caixa no workspace"
                        onClick={() => {
                          actions.selectBox(box.id);
                          viewerApi?.highlightBox?.(box.id);
                        }}
                        className="button button-ghost"
                        style={{
                          flex: 1,
                          fontSize: 11,
                          padding: "4px 8px",
                        }}
                      >
                        Selecionar
                      </button>
                      <button
                        type="button"
                        title="Remover caixa do projeto"
                        onClick={() => actions.removeWorkspaceBoxById(box.id)}
                        className="button button-ghost"
                        style={{
                          flex: 1,
                          fontSize: 11,
                          padding: "4px 8px",
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {modal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title">{modalTitle}</div>
              <button type="button" className="modal-close" onClick={handleCloseModal}>
                Fechar
              </button>
            </div>

            {modal === "projects" ? (
              <div className="modal-list">
                <button
                  type="button"
                  className="modal-action"
                  onClick={() => {
                    actions.createNewProject();
                    refreshSavedProjects();
                  }}
                >
                  Criar novo projeto
                </button>
                {savedProjects.length === 0 ? (
                  <div className="modal-empty">Nenhum projeto salvo ainda.</div>
                ) : (
                  savedProjects.map((project) => (
                    <div key={project.id} className="modal-list-item">
                      <div className="modal-list-info">
                        {renamingId === project.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <input
                              className="input input-sm"
                              value={renameValue}
                              onChange={(event) => setRenameValue(event.target.value)}
                              placeholder="Novo nome"
                            />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                className="modal-action"
                                onClick={() => {
                                  actions.renameProject(project.id, renameValue);
                                  refreshSavedProjects();
                                  setRenamingId(null);
                                  setRenameValue("");
                                }}
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                className="modal-close"
                                onClick={() => {
                                  setRenamingId(null);
                                  setRenameValue("");
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="modal-list-title">{project.name}</div>
                            <div className="modal-list-meta">
                              Criado: {new Date(project.createdAt).toLocaleString("pt-PT")}
                            </div>
                            <div className="modal-list-meta">
                              Atualizado: {new Date(project.updatedAt).toLocaleString("pt-PT")}
                            </div>
                          </>
                        )}
                      </div>
                      {renamingId !== project.id && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="modal-action"
                            onClick={() => {
                              actions.loadProjectSnapshot(project.id);
                              refreshSavedProjects();
                              closeModal();
                            }}
                          >
                            Carregar
                          </button>
                          <button
                            type="button"
                            className="modal-action"
                            onClick={() => {
                              setRenamingId(project.id);
                              setRenameValue(project.name);
                            }}
                          >
                            Renomear
                          </button>
                          <button
                            type="button"
                            className="modal-action"
                            style={{ borderColor: "rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.18)" }}
                            onClick={() => {
                              actions.deleteProject(project.id);
                              refreshSavedProjects();
                            }}
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : modal === "2d" ? (
              <div className="modal-list">
                <div className="modal-list-item">
                  <div className="modal-list-title">Selecionar ângulo</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="modal-action"
                    onClick={() => {}}
                  >
                    Top
                  </button>
                  <button
                    type="button"
                    className="modal-action"
                    onClick={() => {}}
                  >
                    Front
                  </button>
                  <button
                    type="button"
                    className="modal-action"
                    onClick={() => {}}
                  >
                    Left
                  </button>
                  <button
                    type="button"
                    className="modal-action"
                    onClick={() => {}}
                  >
                    Right
                  </button>
                </div>
                <button type="button" className="modal-close" onClick={() => {}}>
                  Voltar ao 3D
                </button>
              </div>
            ) : modal === "send" ? (
              <div className="modal-list">
                <div className="modal-list-item">
                  <div className="modal-list-info">
                    <div className="modal-list-title">Conteúdo do pacote</div>
                    <div className="modal-list-meta">Selecione o que deve ser incluído no envio</div>
                  </div>
                </div>
                {(
                  [
                    ["image", "Imagem renderizada"],
                    ["viewerSnapshot", "Snapshot do Viewer (JSON)"],
                    ["projectSnapshot", "Snapshot do Projeto (JSON)"],
                    ["cutlist", "Cutlist"],
                    ["ferragens", "Ferragens"],
                    ["precos", "Preços"],
                  ] as [keyof SendSelections, string][]
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="modal-list-item"
                    style={{ cursor: "pointer", alignItems: "center" }}
                  >
                    <div className="modal-list-info">
                      <div className="modal-list-title">{label}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={sendSelections[key]}
                      onChange={() => toggleSendSelection(key)}
                    />
                  </label>
                ))}
                {sendSelections.image && (
                  <div className="modal-list-item">
                    <div className="modal-list-info">
                      <div className="modal-list-title">Imagem renderizada</div>
                      <div className="modal-list-meta">
                        {photoCaptureUrl
                          ? "Captura pronta para download"
                          : "Capture uma imagem no Photo Mode da toolbar"}
                      </div>
                    </div>
                    {photoCaptureUrl ? (
                      <button
                        type="button"
                        className="modal-action"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = photoCaptureUrl;
                          link.download = photoCaptureUrl.startsWith("data:image/jpeg")
                            ? "pimo-photo.jpg"
                            : "pimo-photo.png";
                          link.click();
                        }}
                      >
                        Pré-visualizar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="modal-action"
                        onClick={() => {
                          const dataUrl = viewerApi?.capturePhotoDataUrl?.("png", 1);
                          if (dataUrl) {
                            setPhotoCaptureUrl(dataUrl);
                            showToast("Captura pronta para envio.", "info", 1400);
                          } else {
                            showToast("Não foi possível capturar a imagem do Viewer.", "warning");
                          }
                        }}
                      >
                        Capturar agora
                      </button>
                    )}
                  </div>
                )}
                <div className="modal-list-item">
                  <div className="modal-list-info">
                    <div className="modal-list-title">Método de envio</div>
                    <div className="modal-list-meta">Escolha como deseja enviar o pacote</div>
                  </div>
                </div>
                {(
                  [
                    ["whatsapp", "WhatsApp"],
                    ["email", "Email"],
                    ["download", "Download local"],
                  ] as [SendMethod, string][]
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="modal-list-item"
                    style={{ cursor: "pointer", alignItems: "center" }}
                  >
                    <div className="modal-list-info">
                      <div className="modal-list-title">{label}</div>
                    </div>
                    <input
                      type="radio"
                      name="send-method"
                      checked={sendMethod === key}
                      onChange={() => setSendMethod(key)}
                    />
                  </label>
                ))}
                <button type="button" className="modal-action" onClick={handleSendPackage}>
                  Preparar envio
                </button>
              </div>
            ) : modal === "integration" ? (
              <div className="modal-placeholder">{integrationMessage}</div>
            ) : modal === "validation" ? (
              <div className="modal-list" style={{ gap: 8 }}>
                {project.projectValidation.items.length === 0 ? (
                  <div className="modal-empty">Sem erros/avisos de validação.</div>
                ) : (
                  project.projectValidation.items.map((item) => (
                    <div key={`validation-item-${item.id}`} className="modal-list-item">
                      <div className="modal-list-info">
                        <strong>{item.severity === "error" ? "Erro" : "Aviso"}</strong>
                        <span>{item.message}</span>
                        {item.boxNome ? <small>Caixa: {item.boxNome}</small> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {showPiece3DModal && (
        <Piece3DModal
          box={selectedWorkspaceBox}
          drillingByPanel={selectedViewerDrillMarkers}
          materialTipo={project.material.tipo}
          open={showPiece3DModal}
          onClose={() => setShowPiece3DModal(false)}
        />
      )}
    </>
  );
}
