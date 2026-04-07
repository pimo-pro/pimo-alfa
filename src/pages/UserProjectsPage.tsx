import { useEffect, useMemo, useState } from "react";
import { useProject } from "../context/useProject";
import { getCurrentProjectUser, setCurrentProjectUser } from "../core/projects/currentUser";
import type { SavedProjectInfo } from "../context/projectTypes";

export default function UserProjectsPage() {
  const { actions } = useProject();
  const [projects, setProjects] = useState<SavedProjectInfo[]>([]);
  const [loading, setLoading] = useState(false);
  // Chamada única — getCurrentProjectUser() é memoizada em módulo após a 1ª leitura
  const initialUser = getCurrentProjectUser();
  const [ownerId, setOwnerId] = useState(initialUser.ownerId);
  const [ownerName, setOwnerName] = useState(initialUser.ownerName);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await actions.listSavedProjects("mine");
      // @PIMO-KEEP — guard: result pode não ser array
      setProjects(Array.isArray(result) ? result : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeProjects = useMemo(() => (Array.isArray(projects) ? projects : []), [projects]);
  const latest = useMemo(() => safeProjects.slice(0, 4), [safeProjects]);

  return (
    <main style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22 }}>Meus Projetos</h1>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
          Lista apenas os projetos do utilizador atual.
        </p>
      </div>

      <section className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>ID do utilizador</span>
            <input className="input input-sm" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Nome do utilizador</span>
            <input className="input input-sm" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </label>
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setCurrentProjectUser({ ownerId, ownerName });
              void refresh();
            }}
          >
            Atualizar utilizador
          </button>
        </div>
      </section>

      <section className="card" style={{ padding: 12 }}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>Projetos Salvos (últimos 4)</h2>
        {latest.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Sem projetos recentes.</p>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {latest.map((project) => (
              <button
                key={project.id}
                type="button"
                className="button button-ghost"
                onClick={() => {
                  void actions.loadProjectSnapshot(project.id).then(() => {
                    window.history.pushState({}, "", "/");
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  });
                }}
              >
                {project.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ padding: 12 }}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>Todos os meus projetos</h2>
        {loading ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>A carregar...</p>
        ) : safeProjects.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Nenhum projeto guardado.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {safeProjects.map((project) => (
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
                        #{project.sequence} · {new Date(project.createdAt).toLocaleString("pt-PT")}
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
      </section>
    </main>
  );
}
