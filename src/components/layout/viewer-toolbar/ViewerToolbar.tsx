/**
 * Toolbar superior do Viewer.
 * Ações principais do projeto + controle de Photo Mode via popover no ícone da câmera.
 */

import { useEffect, useRef, useState } from "react";
import { useProject } from "../../../context/useProject";
import { useToolbarModal } from "../../../context/ToolbarModalContext";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import { VIEWER_TOOLBAR_ITEMS } from "../../../constants/toolbarConfig";
import { clearPimoStorage } from "../../../core/persistence/storageKeys";
import type { ToolbarActionId } from "../../../constants/toolbarConfig";
import RoomIconButton from "../../viewer/toolbar/RoomIconButton";
import DisplayMenuButton from "../topbar/DisplayMenuButton";
import PhotoModePopoverContent from "./PhotoModePopoverContent";

export default function ViewerToolbar() {
  const { actions, project } = useProject();
  const { openModal } = useToolbarModal();
  const { viewerApi } = usePimoViewerContext();
  const [photoModeOpen, setPhotoModeOpen] = useState(false);
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false);
  const photoModeContainerRef = useRef<HTMLDivElement | null>(null);
  const visibilityMenuRef = useRef<HTMLDivElement | null>(null);

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
      clearPimoStorage();
      window.location.reload();
      return;
    }
    if (id === "salvar") {
      actions.saveProjectSnapshot();
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
                  onChange={(e) => actions.setViewerSettings({ showPanelEdges: e.target.checked })}
                />
                Mostrar arestas dos painéis
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={project.viewerSettings.hideAllPanels}
                  onChange={(e) => actions.setViewerSettings({ hideAllPanels: e.target.checked })}
                />
                Esconder todos os painéis
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={project.viewerSettings.showCeiling}
                  onChange={(e) => actions.setViewerSettings({ showCeiling: e.target.checked })}
                />
                Mostrar teto da sala
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={project.viewerSettings.wallEditMode}
                  onChange={(e) => actions.setViewerSettings({ wallEditMode: e.target.checked })}
                />
                Modo edição de paredes
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={project.viewerSettings.enableReflections}
                  onChange={(e) => actions.setViewerSettings({ enableReflections: e.target.checked })}
                />
                Reflexos dinâmicos (probe)
              </label>
            </div>
          </div>
        )}
      </div>
      <div className="viewer-toolbar-action-container">
        <button
          type="button"
          className="button button-primary viewer-action-button"
          onClick={() => actions.gerarDesign()}
          disabled={project.estaCarregando}
          style={{
            background: project.estaCarregando
              ? "rgba(59, 130, 246, 0.5)"
              : "var(--blue-light)",
            cursor: project.estaCarregando ? "not-allowed" : "pointer",
          }}
        >
          {project.estaCarregando ? "A Calcular..." : "Gerar Design 3D"}
        </button>
      </div>
    </div>
  );
}
