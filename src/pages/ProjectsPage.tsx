import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import type { SavedProjectInfo } from "../context/projectTypes";
import { listProjects } from "../core/projects/projectsClient";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import PageContainer from "../components/ui/PageContainer";
import PageHeader from "../components/ui/PageHeader";
import Section from "../components/ui/Section";
import "../components/ui/ui.css";

import { PIMO_SHOWROOM_PROJECT_IDS_KEY } from "./ProjectsViewerPage";

function formatUpdatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso || "—";
    return d.toLocaleString("pt-PT");
  } catch {
    return iso || "—";
  }
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<SavedProjectInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const isElevated = user?.role === "admin" || user?.role === "ultra+";
  const scope = isElevated ? "all" : "mine";
  const ownerId = scope === "mine" ? user?.id : undefined;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [scope, ownerId]);

  useEffect(() => {
    let cancelled = false;

    if (scope === "mine" && !(user?.id ?? "").trim()) {
      setError("Não foi possível determinar o utilizador para filtrar os projetos.");
      setProjects([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    listProjects(scope, ownerId)
      .then((list) => {
        if (!cancelled) {
          // @PIMO-KEEP — guard: API/local pode devolver lista inválida
          setProjects(Array.isArray(list) ? list : []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar projetos");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, ownerId, user?.id]);

  // @PIMO-KEEP — guard: projects pode ser undefined após setState
  const safeProjects = projects ?? [];

  const allSelected = useMemo(
    () => safeProjects.length > 0 && safeProjects.every((p) => selectedIds.has(p.id)),
    [safeProjects, selectedIds]
  );

  const someSelected = useMemo(
    () => safeProjects.some((p) => selectedIds.has(p.id)),
    [safeProjects, selectedIds]
  );

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(safeProjects.map((p) => p.id)));
    }
  }, [allSelected, safeProjects]);

  const toggleRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const pageSubtitle = useMemo(() => {
    if (scope === "all") {
      return "Lista global de projetos guardados (snapshots). Seleção múltipla: em preparação.";
    }
    return "Os teus projetos guardados (snapshots).";
  }, [scope]);

  if (error) {
    return (
      <PageContainer>
        <Card className="ui-projects-shell">
          <PageHeader title="Projects" subtitle="Falha ao carregar projetos." />
          <Card>
            <p className="ui-text-danger">{error}</p>
          </Card>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card className="ui-projects-shell">
        <PageHeader title="Projects" subtitle={pageSubtitle} />
        <Section title="Tabela de projetos">
          <Card>
            {isElevated ? (
              <div
                className="ui-text-muted"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 12,
                  padding: "8px 10px",
                  border: "1px dashed var(--border, #ccc)",
                  borderRadius: 8,
                  opacity: 0.85,
                }}
              >
                <span style={{ fontSize: 12 }}>
                  Ações em lote (placeholder) — {selectedIds.size} selecionado(s)
                </span>
                <Button type="button" variant="outline" disabled aria-disabled>
                  Aplicar ação
                </Button>
                <Button type="button" variant="outline" disabled aria-disabled>
                  Exportar seleção
                </Button>
              </div>
            ) : null}
            {isElevated ? (
              <div style={{ marginBottom: 12 }}>
                <Button
                  type="button"
                  variant="primary"
                  disabled={selectedIds.size === 0}
                  onClick={() => {
                    try {
                      sessionStorage.setItem(
                        PIMO_SHOWROOM_PROJECT_IDS_KEY,
                        JSON.stringify({ ids: Array.from(selectedIds) })
                      );
                    } catch {
                      /* sessionStorage indisponível */
                    }
                    navigate("/projects/viewer");
                  }}
                >
                  Ver em Showroom
                </Button>
              </div>
            ) : null}
            {loading ? <Loader label="Carregando /projects..." /> : null}
            {!loading && safeProjects.length === 0 ? (
              <p className="ui-text-muted">Nenhum projeto visível para este utilizador.</p>
            ) : !loading ? (
              <table className="projects-table ui-table">
                <thead>
                  <tr>
                    {isElevated ? (
                      <th scope="col" style={{ width: 40 }}>
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Selecionar todos os projetos visíveis"
                        />
                      </th>
                    ) : null}
                    <th>id</th>
                    <th>name</th>
                    <th>updatedAt</th>
                    {scope === "all" ? <th>ownerName</th> : null}
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {safeProjects.map((project) => (
                    <tr key={project.id}>
                      {isElevated ? (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(project.id)}
                            onChange={(e) => toggleRow(project.id, e.target.checked)}
                            aria-label={`Selecionar projeto ${project.name}`}
                          />
                        </td>
                      ) : null}
                      <td>{project.id}</td>
                      <td>{project.name?.trim() ? project.name : "Projeto"}</td>
                      <td>{formatUpdatedAt(project.updatedAt ?? "")}</td>
                      {scope === "all" ? <td>{project.ownerName ?? "—"}</td> : null}
                      <td>
                        <Link to={`/projects/${project.id}`}>
                          <Button variant="outline">Detalhes</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Card>
        </Section>
      </Card>
    </PageContainer>
  );
}
