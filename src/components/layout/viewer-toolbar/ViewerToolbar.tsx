/**
 * Toolbar superior do Viewer.
 * Ícones com cor clara (#f1f5f9) e hover (#ffffff); ações ligadas a viewerSync/actions/openModal.
 * PROJETO → modal projetos; SALVAR → saveProjectSnapshot (inclui viewerSync.saveViewerSnapshot);
 * DESFAZER/REFAZER → undo/redo; 2D/IMAGEM/ENVIAR → modais que usam viewerSync no RightToolsBar.
 */

import { useProject } from "../../../context/useProject";
import { useToolbarModal } from "../../../context/ToolbarModalContext";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import { VIEWER_TOOLBAR_ITEMS } from "../../../constants/toolbarConfig";
import type { ToolbarActionId } from "../../../constants/toolbarConfig";
import RoomIconButton from "../../viewer/toolbar/RoomIconButton";

export default function ViewerToolbar() {
  const { actions, project } = useProject();
  const { openModal } = useToolbarModal();
  const { viewerApi } = usePimoViewerContext();
  const ultraModeEnabled = project.viewerSettings.ultraPerformanceModeOptions.enabled;

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
    if (id === "imagem") {
      openModal("image");
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
      {VIEWER_TOOLBAR_ITEMS.map((item) => (
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
      ))}
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
      <button
        type="button"
        className="button button-primary"
        onClick={() => actions.gerarDesign()}
        disabled={project.estaCarregando}
        style={{
          marginLeft: "auto",
          background: project.estaCarregando
            ? "rgba(59, 130, 246, 0.5)"
            : "var(--blue-light)",
          cursor: project.estaCarregando ? "not-allowed" : "pointer",
          padding: "8px 12px",
          height: "auto",
        }}
      >
        {project.estaCarregando ? "A Calcular..." : "Gerar Design 3D"}
      </button>
    </div>
  );
}
