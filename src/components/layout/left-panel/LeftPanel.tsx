import { useEffect, useState } from "react";
import { useProject } from "../../../context/useProject";
import { LEFT_TOOLBAR_IDS } from "../left-toolbar/LeftToolbar";
import PainelMoveisUnificado from "./PainelMoveisUnificado";
import PainelModelosDaCaixa from "./PainelModelosDaCaixa";
import { useUiStore } from "../../../stores/uiStore";
import type { SavedProjectInfo } from "../../../context/projectTypes";
import { InfoPanelContent } from "./InfoPanelContent";
import { PlaceholderLeftPanel } from "./PlaceholderLeftPanel";
import { PainelSala } from "./PainelSala";
import { LeftPanelCalculadora } from "./LeftPanelCalculadora";
import { HomeLeftPanelEmpty } from "./HomeLeftPanelEmpty";
import { HomeLeftPanelSelected } from "./HomeLeftPanelSelected";
import { useMaterialsForPicker } from "./hooks/useMaterialsForPicker";

export type LeftPanelProps = {
  activeTab?: string;
};

export default function LeftPanel({ activeTab = "home" }: LeftPanelProps) {
  const selectedTool = useUiStore((state) => state.selectedTool);
  const { project, actions } = useProject();
  const selectedBox = project.workspaceBoxes.find(
    (box) => box.id === project.selectedWorkspaceBoxId
  );

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
      <HomeLeftPanelEmpty
        loadingSavedRecent={loadingSavedRecent}
        savedRecentProjects={savedRecentProjects}
      />
    );
  }

  // Página inicial (HOME) com caixa selecionada — e fallback quando outras tabs não aplicam
  return <HomeLeftPanelSelected materialsPicker={materialsPicker} />;
}
