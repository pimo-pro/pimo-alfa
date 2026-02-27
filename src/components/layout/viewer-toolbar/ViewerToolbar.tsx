/**
 * Toolbar superior do Viewer.
 * Ações principais do projeto + controle de Photo Mode via popover no ícone da câmera.
 */

import { useEffect, useRef, useState } from "react";
import { useProject } from "../../../context/useProject";
import { useToolbarModal } from "../../../context/ToolbarModalContext";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import { VIEWER_TOOLBAR_ITEMS } from "../../../constants/toolbarConfig";
import type { ToolbarActionId } from "../../../constants/toolbarConfig";
import RoomIconButton from "../../viewer/toolbar/RoomIconButton";
import PhotoModePopoverContent from "./PhotoModePopoverContent";

export default function ViewerToolbar() {
  const { actions, project } = useProject();
  const { openModal } = useToolbarModal();
  const { viewerApi } = usePimoViewerContext();
  const ultraModeEnabled = project.viewerSettings.ultraPerformanceModeOptions.enabled;
  const [photoModeOpen, setPhotoModeOpen] = useState(false);
  const photoModeContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    viewerApi?.setPhotoModeEnabled?.(photoModeOpen);
    actions.setViewerSettings({ photoModeEnabled: photoModeOpen });
  }, [actions, photoModeOpen, viewerApi]);

  useEffect(() => {
    if (!photoModeOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!photoModeContainerRef.current?.contains(event.target as Node)) {
        setPhotoModeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [photoModeOpen]);

  useEffect(() => {
    return () => {
      viewerApi?.setPhotoModeEnabled?.(false);
      actions.setViewerSettings({ photoModeEnabled: false });
    };
  }, [actions, viewerApi]);

  const handleAction = (id: ToolbarActionId) => {
    if (id === "projeto") {
      openModal("projects");
      return;
    }
    if (id === "novo") {
      localStorage.clear();
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
    if (id === "2d") {
      openModal("2d");
      return;
    }
    if (id === "enviar") {
      openModal("send");
      return;
    }
  };

  const toggleUltraPerformance = () => {
    const next = !ultraModeEnabled;
    actions.setViewerSettings({
      ultraPerformanceModeOptions: {
        ...project.viewerSettings.ultraPerformanceModeOptions,
        enabled: next,
      },
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
                onClick={() => setPhotoModeOpen((prev) => !prev)}
                style={{ fontSize: 12 }}
              >
                <span className="viewer-toolbar-icon" aria-hidden>
                  {item.icon}
                </span>
              </button>
              {photoModeOpen && (
                <div className="viewer-toolbar-popover-panel" role="dialog" aria-label="Photo Mode">
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
      <button
        type="button"
        title={ultraModeEnabled ? "Desativar Ultra Performance" : "Ativar Ultra Performance"}
        aria-label={ultraModeEnabled ? "Desativar Ultra Performance" : "Ativar Ultra Performance"}
        onClick={toggleUltraPerformance}
        style={{
          fontSize: 12,
          opacity: viewerApi ? 1 : 0.5,
        }}
      >
        <span
          className="viewer-toolbar-icon"
          aria-hidden
          style={{
            opacity: ultraModeEnabled ? 1 : 0.8,
            fontWeight: ultraModeEnabled ? 700 : 400,
            color: ultraModeEnabled ? "#facc15" : "inherit",
          }}
        >
          ⚡
        </span>
      </button>
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
