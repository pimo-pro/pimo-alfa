import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import type { SavedProjectInfo } from "../../../context/projectTypes";
import { NotesField } from "./NotesField";

export type HomeLeftPanelEmptyProps = {
  loadingSavedRecent: boolean;
  savedRecentProjects: SavedProjectInfo[];
};

export function HomeLeftPanelEmpty({
  loadingSavedRecent,
  savedRecentProjects,
}: HomeLeftPanelEmptyProps) {
  const { project, actions } = useProject();

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
