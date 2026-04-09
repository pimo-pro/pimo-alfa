import { useEffect, useMemo, useState } from "react";
import { useProject } from "../../context/useProject";
import type { SavedProjectInfo } from "../../context/projectTypes";
import { useToast } from "../../context/ToastContext";
import { useToolbarModal } from "../../context/ToolbarModalContext";
import Piece3DModal from "../modals/Piece3DModal";
import { RESET_SEND_EVENT } from "../modals/SendProjectPackageForm";
import { buildViewerDrillMarkersByPanel } from "../../modules/drilling/drillingAdapter";

/**
 * Renderiza os modais abertos pela ViewerToolbar (Projetos, Integração, etc.).
 * Envio de pacote: apenas no painel unificado (UnifiedExportPanel).
 */
export default function ToolbarModals() {
  const { actions, project } = useProject();
  const { showToast } = useToast();
  const { modal, closeModal, integrationMessage } = useToolbarModal();
  const [savedProjects, setSavedProjects] = useState<SavedProjectInfo[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showPiece3DModal, setShowPiece3DModal] = useState(false);
  const modalTitle = useMemo(() => {
    if (modal === "projects") return "Projetos salvos";
    if (modal === "integration") return "Integração";
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
  const refreshSavedProjects = async () => {
    setLoadingProjects(true);
    try {
      const items = await actions.listSavedProjects("mine");
      setSavedProjects(items);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (modal === "projects") {
      void refreshSavedProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  const handleCloseModal = () => {
    if (modal === "projects") {
      setRenamingId(null);
      setRenameValue("");
    }
    if (modal === "integration") {
      window.dispatchEvent(new Event(RESET_SEND_EVENT));
    }
    closeModal();
  };

  return (
    <>
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
                    void actions.createNewProject().then((created) => {
                      if (created) {
                        showToast("Novo projeto criado e guardado.", "info");
                      } else {
                        showToast("Falha ao criar projeto.", "error");
                      }
                      void refreshSavedProjects();
                    });
                  }}
                >
                  Criar novo projeto
                </button>
                {loadingProjects ? (
                  <div className="modal-empty">A carregar projetos...</div>
                ) : savedProjects.length === 0 ? (
                  <div className="modal-empty">Nenhum projeto salvo ainda.</div>
                ) : (
                  savedProjects.map((projectItem) => (
                    <div key={projectItem.id} className="modal-list-item">
                      <div className="modal-list-info">
                        {renamingId === projectItem.id ? (
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
                                  void actions.renameProject(projectItem.id, renameValue).then(() => {
                                    void refreshSavedProjects();
                                  });
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
                            <div className="modal-list-title">{projectItem.name}</div>
                            <div className="modal-list-meta">
                              Criado: {new Date(projectItem.createdAt).toLocaleString("pt-PT")}
                            </div>
                            <div className="modal-list-meta">
                              Atualizado: {new Date(projectItem.updatedAt).toLocaleString("pt-PT")}
                            </div>
                          </>
                        )}
                      </div>
                      {renamingId !== projectItem.id && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="modal-action"
                            onClick={() => {
                              void actions.loadProjectSnapshot(projectItem.id);
                              void refreshSavedProjects();
                              closeModal();
                            }}
                          >
                            Carregar
                          </button>
                          <button
                            type="button"
                            className="modal-action"
                            onClick={() => {
                              setRenamingId(projectItem.id);
                              setRenameValue(projectItem.name);
                            }}
                          >
                            Renomear
                          </button>
                          <button
                            type="button"
                            className="modal-action"
                            style={{ borderColor: "rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.18)" }}
                            onClick={() => {
                              void actions.deleteProject(projectItem.id).then(() => {
                                void refreshSavedProjects();
                              });
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
            ) : modal === "integration" ? (
              <div className="modal-placeholder">{integrationMessage}</div>
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
