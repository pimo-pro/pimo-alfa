/**
 * Toolbar superior do Viewer.
 * Ações principais do projeto + controle de Photo Mode via popover no ícone da câmera.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "../../../context/useProject";
import { useToolbarModal } from "../../../context/ToolbarModalContext";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import { VIEWER_TOOLBAR_ITEMS } from "../../../constants/toolbarConfig";
import {
  getProjectsSyncStatus,
  subscribeProjectsSyncStatus,
  type ProjectsSyncStatus,
} from "../../../core/projects/projectsClient";
import type { ToolbarActionId } from "../../../constants/toolbarConfig";
import RoomIconButton from "../../viewer/toolbar/RoomIconButton";
import DisplayMenuButton from "../topbar/DisplayMenuButton";
import PhotoModePopoverContent from "./PhotoModePopoverContent";
import ConfirmNewProjectModal from "../../modals/ConfirmNewProjectModal";

export default function ViewerToolbar() {
  const { actions, project } = useProject();
  const { openModal } = useToolbarModal();
  const { viewerApi } = usePimoViewerContext();
  const [photoModeOpen, setPhotoModeOpen] = useState(false);
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<ProjectsSyncStatus>(() => getProjectsSyncStatus());
  const photoModeContainerRef = useRef<HTMLDivElement | null>(null);
  const visibilityMenuRef = useRef<HTMLDivElement | null>(null);
  const autosaveRunningRef = useRef(false);

  const actionsRef = useRef(actions);
  const viewerApiRef = useRef(viewerApi);
  useEffect(() => {
    actionsRef.current = actions;
    viewerApiRef.current = viewerApi;
  }, [actions, viewerApi]);

  // Sincronizar photoModeOpen com viewer e projeto apenas quando photoModeOpen mudar (não quando actions/viewerApi mudarem, para evitar loop).
  useEffect(() => {
    viewerApiRef.current?.setPhotoModeEnabled?.(photoModeOpen);
    actionsRef.current.setViewerSettings({ photoModeEnabled: photoModeOpen });
  }, [photoModeOpen]);

  useEffect(() => {
    if (!photoModeOpen && !visibilityMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!photoModeContainerRef.current?.contains(event.target as Node)) {
        setPhotoModeOpen(false);
      }
      if (!visibilityMenuRef.current?.contains(event.target as Node)) {
        setVisibilityMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [photoModeOpen, visibilityMenuOpen]);

  // Cleanup apenas no unmount: desativar photo mode. Refs evitam dep de actions/viewerApi que mudam a cada render.
  useEffect(() => {
    return () => {
      viewerApiRef.current?.setPhotoModeEnabled?.(false);
      actionsRef.current.setViewerSettings({ photoModeEnabled: false });
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeProjectsSyncStatus((status) => setSyncStatus(status));
    return () => unsub();
  }, []);

  const hasUnsavedChanges = useMemo(() => {
    if (!project.lastAutosaveTime) return true;
    const savedAt = Date.parse(project.lastAutosaveTime);
    if (!Number.isFinite(savedAt)) return true;
    return project.changelog.some((entry) => {
      const ts = entry.timestamp instanceof Date ? entry.timestamp.getTime() : Date.parse(String(entry.timestamp));
      return Number.isFinite(ts) && ts > savedAt;
    });
  }, [project.lastAutosaveTime, project.changelog]);

  const saveButtonMiniStatus = useMemo(() => {
    if (syncStatus.state === "syncing") return "A sincronizar...";
    if (!syncStatus.online || syncStatus.state === "awaiting_network") return "Offline (guardado localmente)";
    return "Guardado";
  }, [syncStatus]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (autosaveRunningRef.current) return;
      if (project.estaCarregando) return;
      if (confirmNewOpen) return;
      if (!hasUnsavedChanges) return;
      autosaveRunningRef.current = true;
      Promise.resolve(actions.gerarESalvarDesign())
        .catch(() => {
          /* autosave silencioso */
        })
        .finally(() => {
          autosaveRunningRef.current = false;
        });
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [actions, project.estaCarregando, hasUnsavedChanges, confirmNewOpen]);

  const handleAction = (id: ToolbarActionId) => {
    if (id === "reset-camera") {
      viewerApi?.resetCamera?.();
      return;
    }
    if (id === "projeto") {
      openModal("projects");
      return;
    }
    if (id === "novo") {
      if (hasUnsavedChanges) {
        setConfirmNewOpen(true);
      } else {
        void actions.createNewProject();
      }
      return;
    }
    if (id === "desfazer") {
      actions.undo();
      return;
    }
    if (id === "refazer") {
      actions.redo();
      return;
    }
    if (id === "enviar") {
      openModal("send");
      return;
    }
  };

  const handleSaveBeforeNew = async () => {
    await actions.gerarESalvarDesign();
    await actions.createNewProject();
    setConfirmNewOpen(false);
  };

  const handleDiscardBeforeNew = async () => {
    await actions.createNewProject();
    setConfirmNewOpen(false);
  };

  const handleCancelBeforeNew = () => {
    setConfirmNewOpen(false);
  };

  const togglePhotoMenu = () => {
    setPhotoModeOpen((prev) => {
      const next = !prev;
      if (next) {
        setVisibilityMenuOpen(false);
      }
      return next;
    });
  };

  const toggleVisibilityMenu = () => {
    setVisibilityMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setPhotoModeOpen(false);
      }
      return next;
    });
  };

  return (
    <div className="viewer-toolbar" role="toolbar" aria-label="Ações do Viewer">
      {VIEWER_TOOLBAR_ITEMS.map((item) => {
        if (item.id === "imagem") {
          return (
            <div key={item.id} ref={photoModeContainerRef} className="viewer-toolbar-popover-anchor">
              <button
                type="button"
                title={item.tooltip}
                aria-label={item.tooltip}
                aria-haspopup="dialog"
                aria-expanded={photoModeOpen}
                aria-pressed={photoModeOpen}
                onClick={togglePhotoMenu}
                style={{ fontSize: 12 }}
              >
                <span className="viewer-toolbar-icon" aria-hidden>
                  {item.icon}
                </span>
              </button>
              {photoModeOpen && (
                <div className="viewer-toolbar-popover-panel photo-mode-panel" role="dialog" aria-label="Photo Mode">
                  <PhotoModePopoverContent onClose={() => setPhotoModeOpen(false)} />
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            title={item.tooltip}
            aria-label={item.tooltip}
            onClick={() => handleAction(item.id)}
            style={{ fontSize: 12 }}
          >
            <span className="viewer-toolbar-icon" aria-hidden>
              {item.icon}
            </span>
          </button>
        );
      })}
      <RoomIconButton />
      <DisplayMenuButton />
      <div ref={visibilityMenuRef} className="viewer-toolbar-popover-anchor">
        <button
          type="button"
          title="Opções de visualização"
          aria-label="Opções de visualização"
          aria-haspopup="dialog"
          aria-expanded={visibilityMenuOpen}
          aria-pressed={visibilityMenuOpen}
          onClick={toggleVisibilityMenu}
          style={{ fontSize: 12 }}
        >
          <span className="viewer-toolbar-icon" aria-hidden>
            ☑
          </span>
        </button>
        {visibilityMenuOpen && (
          <div className="viewer-toolbar-popover-panel" role="dialog" aria-label="Opções de visualização">
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 260 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={project.viewerSettings.showPanelEdges}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    actions.setViewerSettings({ showPanelEdges: checked });
                    viewerApi?.setPanelEdgesVisible?.(checked);
                  }}
                />
                Mostrar arestas dos painéis
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={project.viewerSettings.hideAllPanels}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    actions.setViewerSettings({ hideAllPanels: checked });
                    viewerApi?.setAllPanelsHidden?.(checked);
                  }}
                />
                Esconder todos os painéis
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={project.viewerSettings.showCeiling}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    actions.setViewerSettings({ showCeiling: checked });
                    viewerApi?.setRoomCeilingVisible?.(checked);
                  }}
                />
                Mostrar teto da sala
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={project.viewerSettings.wallEditMode}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    actions.setViewerSettings({ wallEditMode: checked });
                    viewerApi?.setWallEditMode?.(checked);
                  }}
                />
                Modo edição de paredes
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={project.viewerSettings.enableReflections}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    actions.setViewerSettings({ enableReflections: checked });
                    viewerApi?.setReflectionsEnabled?.(checked);
                  }}
                />
                Reflexos dinâmicos (probe)
              </label>
            </div>
          </div>
        )}
      </div>
      <div className="viewer-toolbar-action-container" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          className="button button-primary viewer-action-button"
          onClick={() => void actions.gerarESalvarDesign()}
          disabled={project.estaCarregando}
          style={{
            background: "var(--blue-light)",
            opacity: project.estaCarregando ? 0.7 : 1,
            cursor: project.estaCarregando ? "not-allowed" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            lineHeight: 1.1,
          }}
        >
          <span>{project.estaCarregando ? "A calcular..." : "Gerar e Salvar Design"}</span>
          <span style={{ fontSize: 11, opacity: 0.9 }}>{saveButtonMiniStatus}</span>
        </button>
        <span
          title={`${syncStatus.pending} operação(ões) pendente(s)`}
          aria-label={`${syncStatus.pending} operação(ões) pendente(s)`}
          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              display: "inline-block",
              background:
                syncStatus.state === "error"
                  ? "#ef4444"
                  : syncStatus.state === "awaiting_network"
                    ? "#f59e0b"
                    : "#22c55e",
            }}
          />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{syncStatus.pending}</span>
        </span>
      </div>
      <ConfirmNewProjectModal
        open={confirmNewOpen}
        onSave={() => void handleSaveBeforeNew()}
        onDiscard={() => void handleDiscardBeforeNew()}
        onCancel={handleCancelBeforeNew}
      />
    </div>
  );
}
