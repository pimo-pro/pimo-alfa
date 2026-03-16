import { useEffect, useState } from "react";
import { useProject } from "../../context/useProject";
import type { SavedProjectInfo } from "../../context/projectTypes";

export default function SavedProjectsAdminPage() {
  const { actions } = useProject();
  const [projects, setProjects] = useState<SavedProjectInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await actions.listSavedProjects("all");
      setProjects(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
          Lista global dos projetos persistidos no sistema.
        </p>
        <button type="button" className="button button-ghost" onClick={() => void refresh()}>
          Atualizar
        </button>
      </div>
      {loading ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>A carregar...</p>
      ) : projects.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Nenhum projeto guardado.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((project) => (
            <div key={project.id} className="card" style={{ padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {project.thumbnailDataUrl ? (
                    <img
                      src={project.thumbnailDataUrl}
                      alt={`Miniatura ${project.name}`}
                      style={{ width: 68, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                    />
                  ) : null}
                  <div>
                  <div style={{ fontWeight: 600 }}>{project.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {project.ownerName} ({project.ownerId}) · #{project.sequence}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Criado: {new Date(project.createdAt).toLocaleString("pt-PT")}
                  </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    void actions.loadProjectSnapshot(project.id).then(() => {
                      window.history.pushState({}, "", "/");
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    });
                  }}
                >
                  Carregar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
