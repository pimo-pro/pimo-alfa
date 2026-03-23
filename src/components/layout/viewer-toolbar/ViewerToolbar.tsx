/**
 * Toolbar superior do Viewer.
 * Ações principais do projeto + Photo Mode (abre painel esquerdo).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "../../../context/useProject";
import { defaultState } from "../../../context/projectState";
import { useWallStore } from "../../../stores/wallStore";
import { useToast } from "../../../context/ToastContext";
import { useToolbarModal } from "../../../context/ToolbarModalContext";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import { uiStore, useUiStore } from "../../../stores/uiStore";
import { VIEWER_TOOLBAR_ITEMS } from "../../../constants/toolbarConfig";
import { subscribeProjectsSyncStatus } from "../../../core/projects/projectsClient";
import type { ToolbarActionId } from "../../../constants/toolbarConfig";
import RoomIconButton from "../../viewer/toolbar/RoomIconButton";
import DisplayMenuButton from "../topbar/DisplayMenuButton";
import ConfirmNewProjectModal from "../../modals/ConfirmNewProjectModal";

export default function ViewerToolbar() {
  const { actions, project } = useProject();
  const { showToast } = useToast();
  const { openModal } = useToolbarModal();
  const { viewerApi } = usePimoViewerContext();
  const photoModePanelOpen = useUiStore((s) => s.photoModePanelOpen);
  const setPhotoModePanelOpen = useUiStore((s) => s.setPhotoModePanelOpen);
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const visibilityMenuRef = useRef<HTMLDivElement | null>(null);
  const autosaveRunningRef = useRef(false);
  const lastErrorToastAtRef = useRef(0);
  const lastPendingToastAtRef = useRef(0);
  const lastOfflineToastAtRef = useRef(0);
  const lastSavedLocalToastKeyRef = useRef<string>("");
  const previousSyncStateRef = useRef<string>("");

  const actionsRef = useRef(actions);
  const viewerApiRef = useRef(viewerApi);
  useEffect(() => {
    actionsRef.current = actions;
    viewerApiRef.current = viewerApi;
  }, [actions, viewerApi]);

  // Sincronizar painel foto com viewer e projeto (evitar loop: só quando photoModePanelOpen mudar).
  useEffect(() => {
    viewerApiRef.current?.setPhotoModeEnabled?.(photoModePanelOpen);
    actionsRef.current.setViewerSettings({ photoModeEnabled: photoModePanelOpen });
  }, [photoModePanelOpen]);

  useEffect(() => {
    if (!visibilityMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!visibilityMenuRef.current?.contains(event.target as Node)) {
        setVisibilityMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [visibilityMenuOpen]);

  // Cleanup no unmount: fechar painel foto e desativar no viewer.
  useEffect(() => {
    return () => {
      viewerApiRef.current?.setPhotoModeEnabled?.(false);
      actionsRef.current.setViewerSettings({ photoModeEnabled: false });
      uiStore.getState().setPhotoModePanelOpen(false);
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeProjectsSyncStatus((status) => {
      const now = Date.now();
      const syncStateKey = `${status.state}|${status.pending}|${status.online}`;
      const isStateTransition = previousSyncStateRef.current !== syncStateKey;
      previousSyncStateRef.current = syncStateKey;

      if (status.state === "saved_local") {
        const baseKey = `${status.state}|${status.message}`;
        if (lastSavedLocalToastKeyRef.current === baseKey) return;
        lastSavedLocalToastKeyRef.current = baseKey;
        showToast("Guardado", "info", 2200);
        if (status.message === "Projeto guardado localmente" || status.message === "Snapshot criado") {
          showToast(status.message, "info", 2800);
        }
        return;
      }

      if (!status.online || status.state === "awaiting_network") {
        if (now - lastOfflineToastAtRef.current >= 60000) {
          lastOfflineToastAtRef.current = now;
          showToast("Offline (guardado localmente)", "warning", 3200);
        }
        return;
      }

      if (status.state === "error") {
        if (isStateTransition || now - lastErrorToastAtRef.current >= 60000) {
          lastErrorToastAtRef.current = now;
          showToast("Erro ao sincronizar", "error", 4000);
        }
        return;
      }

      if (status.state === "idle" && status.pending > 0) {
        if (isStateTransition || now - lastPendingToastAtRef.current >= 60000) {
          lastPendingToastAtRef.current = now;
          showToast(`${status.pending} operação(ões) pendente(s)`, "warning", 3200);
        }
        return;
      }

      if (status.state === "synced" && status.pending === 0 && isStateTransition) {
        showToast("Sincronizado", "info", 2200);
      }
    });
    return () => unsub();
  }, [showToast]);

  const wallCount = useWallStore((s) => s.walls.length);

  const hasUnsavedChanges = useMemo(() => {
    if (!project.lastAutosaveTime) return true;
    const savedAt = Date.parse(project.lastAutosaveTime);
    if (!Number.isFinite(savedAt)) return true;
    return project.changelog.some((entry) => {
      const ts = entry.timestamp instanceof Date ? entry.timestamp.getTime() : Date.parse(String(entry.timestamp));
      return Number.isFinite(ts) && ts > savedAt;
    });
  }, [project.lastAutosaveTime, project.changelog]);

  /** Modal "Novo Projeto" quando há conteúdo real, não só changelog/autosave. */
  const projectHasNonDefaultState = useMemo(() => {
    if (project.workspaceBoxes.length > 0) return true;
    if ((project.projectName?.trim() || "") !== defaultState.projectName) return true;
    if (wallCount >= 3) return true;
    return false;
  }, [project.workspaceBoxes.length, project.projectName, wallCount]);

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
      if (projectHasNonDefaultState) {
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
    setPhotoModePanelOpen(!photoModePanelOpen);
    setVisibilityMenuOpen(false);
  };

  const toggleVisibilityMenu = () => {
    setVisibilityMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setPhotoModePanelOpen(false);
      }
      return next;
    });
  };

  return (
    <div className="viewer-toolbar" role="toolbar" aria-label="Ações do Viewer">
      {VIEWER_TOOLBAR_ITEMS.map((item) => {
        if (item.id === "imagem") {
          return (
            <button
              key={item.id}
              type="button"
              title={item.tooltip}
              aria-label={item.tooltip}
              aria-pressed={photoModePanelOpen}
              onClick={togglePhotoMenu}
              style={{ fontSize: 12 }}
            >
              <span className="viewer-toolbar-icon" aria-hidden>
                {item.icon}
              </span>
            </button>
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
          }}
        >
          Gerar e Salvar Design
        </button>
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
