import { useEffect, useState } from "react";
import { useProject } from "../../../context/useProject";
import { LEFT_TOOLBAR_IDS } from "../left-toolbar/LeftToolbar";
import { useWallStore } from "../../../stores/wallStore";
import { hasPersistedRoomWalls } from "../../../utils/roomWorkspaceBounds";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import PainelMoveisUnificado from "./PainelMoveisUnificado";
import PainelModelosDaCaixa from "./PainelModelosDaCaixa";
import { useUiStore } from "../../../stores/uiStore";
import type { SavedProjectInfo } from "../../../context/projectTypes";
import { InfoPanelContent } from "./InfoPanelContent";
import OrlaSettingsPanel from "../../settings/orla/OrlaSettingsPanel";
import { PlaceholderLeftPanel } from "./PlaceholderLeftPanel";
import { PainelSala } from "./PainelSala";
import { LeftPanelCalculadora } from "./LeftPanelCalculadora";
import { HomeLeftPanelEmpty } from "./HomeLeftPanelEmpty";
import { HomeLeftPanelSelected } from "./HomeLeftPanelSelected";
import { useMaterialsForPicker } from "./hooks/useMaterialsForPicker";
import PhotoModeSettingsContent from "./PhotoModeSettingsContent";

export type LeftPanelProps = {
  activeTab?: string;
};

export default function LeftPanel({ activeTab = "home" }: LeftPanelProps) {
  const photoModePanelOpen = useUiStore((state) => state.photoModePanelOpen);
  const selectedTool = useUiStore((state) => state.selectedTool);
  const { project, actions } = useProject();
  const selectedBox = project.workspaceBoxes.find(
    (box) => box.id === project.selectedWorkspaceBoxId
  );
  const { viewerApi } = usePimoViewerContext();
  const walls = useWallStore((state) => state.walls);
  const roomPresent = hasPersistedRoomWalls(walls) || (viewerApi?.getRoomExists?.() ?? false);

  const materialsPicker = useMaterialsForPicker();
  const [savedRecentProjects, setSavedRecentProjects] = useState<SavedProjectInfo[]>([]);
  const [loadingSavedRecent, setLoadingSavedRecent] = useState(false);

  useEffect(() => {
    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      setSavedRecentProjects([]);
      setLoadingSavedRecent(false);
      return;
    }
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

  const resolvedTabRaw = selectedTool ?? activeTab;
  const resolvedTab =
    resolvedTabRaw === LEFT_TOOLBAR_IDS.LAYOUT ? LEFT_TOOLBAR_IDS.HOME : resolvedTabRaw;

  if (photoModePanelOpen) {
    return (
      <div className="left-panel-content">
        <div className="left-panel-scroll">
          <PhotoModeSettingsContent />
        </div>
      </div>
    );
  }

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

  // Sala — usa PainelSala (wallStore) como painel principal de controlo
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
        description="Modelos 3D de eletrodomésticos em preparação."
      />
    );
  }

  // Acessórios — catálogo de orlas V1
  if (resolvedTab === LEFT_TOOLBAR_IDS.ACESSORIOS) {
    return (
      <div className="left-panel-content">
        <div className="left-panel-scroll">
          <OrlaSettingsPanel />
        </div>
      </div>
    );
  }

  // Info — ajuda / como funciona (estrutura com tabs para futura Info Técnica)
  if (resolvedTab === LEFT_TOOLBAR_IDS.INFO) {
    return (
      <InfoPanelContent />
    );
  }

  // HOME sem caixa selecionada — se sala presente, mostra definições da sala
  if (resolvedTab === LEFT_TOOLBAR_IDS.HOME && !selectedBox) {
    if (roomPresent) {
      return (
        <div className="left-panel-content">
          <div className="left-panel-scroll">
            <PainelSala />
          </div>
        </div>
      );
    }
    return (
      <HomeLeftPanelEmpty
        loadingSavedRecent={loadingSavedRecent}
        savedRecentProjects={savedRecentProjects}
      />
    );
  }

  // Página inicial (HOME) com caixa selecionada — e fallback quando outras tabs não aplicam
  return <HomeLeftPanelSelected materialsPicker={materialsPicker} />;
}
