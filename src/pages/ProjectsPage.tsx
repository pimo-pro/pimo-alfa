import { useMemo, useState } from "react";
import Panel from "../components/ui/Panel";
import { useProject } from "../context/useProject";
import { useAdminFeedback } from "../hooks/useAdminFeedback";

const PROJECT_ROUTE_STORAGE_KEY = "pimo_last_project_route_id";

type ProjectsPageProps = {
  onOpenDesign: (projectId: string) => void;
};

export default function ProjectsPage({ onOpenDesign }: ProjectsPageProps) {
  const { actions } = useProject();
  const feedback = useAdminFeedback();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const projects = useMemo(
    () =>
      actions
        .listSavedProjects()
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [actions]
  );

  const handleCreateProject = () => {
    const before = actions.listSavedProjects();
    actions.createNewProject();
    const after = actions.listSavedProjects();
    const created =
      after.find((item) => !before.some((prev) => prev.id === item.id)) ?? after[0];
    if (!created) {
      feedback.error("Não foi possível criar o projeto.");
      return;
    }
    localStorage.setItem(PROJECT_ROUTE_STORAGE_KEY, created.id);
    feedback.success("Projeto criado com sucesso.");
    onOpenDesign(created.id);
  };

  const handleOpenProject = (projectId: string) => {
    actions.loadProjectSnapshot(projectId);
    localStorage.setItem(PROJECT_ROUTE_STORAGE_KEY, projectId);
    onOpenDesign(projectId);
  };

  const handleDeleteProject = () => {
    if (!pendingDeleteId) return;
    actions.deleteProject(pendingDeleteId);
    setPendingDeleteId(null);
    feedback.success("Projeto excluído com sucesso.");
  };

  return (
    <main
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "radial-gradient(circle at top, var(--blue-dark), var(--black) 60%)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Projetos</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            Gerencie os projetos e abra rapidamente no ambiente de design.
          </p>
        </div>
        <button type="button" className="button button-primary" onClick={handleCreateProject}>
          + Criar novo projeto
        </button>
      </div>

      {pendingDeleteId && (
        <Panel title="Confirmação de exclusão">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Excluir este projeto da lista de projetos salvos?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="button" onClick={handleDeleteProject}>
                Confirmar exclusão
              </button>
              <button type="button" className="button button-ghost" onClick={() => setPendingDeleteId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Projetos salvos" description="Lista de snapshots disponíveis para abrir no design.">
        {projects.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Nenhum projeto salvo. Clique em "Criar novo projeto" para começar.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "var(--radius)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>
                  {project.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Atualizado em {new Date(project.updatedAt).toLocaleString("pt-PT")}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="button"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    Abrir projeto
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ color: "var(--red, #ef4444)" }}
                    onClick={() => setPendingDeleteId(project.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </main>
  );
}
