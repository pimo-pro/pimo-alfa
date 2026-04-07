import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import type { AuthUser } from "../auth/AuthContext";
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

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso || "—";
    return d.toLocaleString("pt-PT");
  } catch {
    return iso || "—";
  }
}

function ThumbnailFallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ui-color-surface, #f4f4f5)",
        borderRadius: 8,
      }}
    >
      <svg
        width={40}
        height={40}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ui-color-muted, #a1a1aa)"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    </div>
  );
}

type ProjectCardProps = {
  project: SavedProjectInfo;
  isElevated: boolean;
  selected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
};

function ProjectCard({ project, isElevated, selected, onToggleSelect }: ProjectCardProps) {
  const displayName = project.name?.trim() || "Projeto sem nome";

  return (
    <div
      style={{
        border: project.corrupted
          ? "1.5px solid var(--ui-color-danger, #ef4444)"
          : "1px solid var(--border, #e4e4e7)",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--ui-color-bg, #fff)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s",
        minHeight: 260,
      }}
    >
      {/* Thumbnail */}
      <div style={{ height: 120, overflow: "hidden", position: "relative", flexShrink: 0 }}>
        {project.thumbnailDataUrl ? (
          <img
            src={project.thumbnailDataUrl}
            alt={`Thumbnail de ${displayName}`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <ThumbnailFallback />
        )}
        {project.corrupted ? (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "var(--ui-color-danger, #ef4444)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 4,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Corrompido
          </span>
        ) : null}
        {isElevated ? (
          <span style={{ position: "absolute", top: 8, left: 8 }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onToggleSelect(project.id, e.target.checked)}
              aria-label={`Selecionar projeto ${displayName}`}
              style={{ accentColor: "var(--ui-color-primary, #3b82f6)", width: 16, height: 16, cursor: "pointer" }}
            />
          </span>
        ) : null}
      </div>

      {/* Info */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: 14,
            color: "var(--ui-color-text, #18181b)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={displayName}
        >
          {displayName}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "var(--ui-color-muted, #71717a)" }}>
          <span style={{ opacity: 0.7 }}>Atualizado: </span>
          {formatDate(project.updatedAt ?? "")}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "var(--ui-color-muted, #71717a)" }}>
          <span style={{ opacity: 0.7 }}>Criado: </span>
          {formatDate(project.createdAt ?? "")}
        </p>
        {project.ownerName ? (
          <p style={{ margin: 0, fontSize: 11, color: "var(--ui-color-muted, #71717a)" }}>
            <span style={{ opacity: 0.7 }}>Owner: </span>
            {project.ownerName}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--border, #e4e4e7)",
          display: "flex",
          gap: 8,
        }}
      >
        <Link to={`/projects/${project.id}`} style={{ flex: 1 }}>
          <Button variant="primary" style={{ width: "100%", fontSize: 13 }}>
            Abrir
          </Button>
        </Link>
      </div>
    </div>
  );
}

type ProjectsPageInnerProps = {
  scope: "all" | "mine";
  ownerId: string | undefined;
  user: AuthUser | null;
  isElevated: boolean;
};

function ProjectsPageInner({ scope, ownerId, user, isElevated }: ProjectsPageInnerProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SavedProjectInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const missingUserForMine = scope === "mine" && !(user?.id ?? "").trim();

  useEffect(() => {
    if (missingUserForMine) return;
    let cancelled = false;

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const list = await listProjects(scope, ownerId);
        if (!cancelled) {
          // @PIMO-KEEP — guard: API/local pode devolver lista inválida
          const sorted = Array.isArray(list)
            ? [...list].sort((a, b) => {
                const ta = new Date(a.updatedAt ?? "").getTime();
                const tb = new Date(b.updatedAt ?? "").getTime();
                return tb - ta;
              })
            : [];
          setProjects(sorted);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar projetos");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scope, ownerId, user?.id, missingUserForMine]);

  const safeProjects = useMemo(() => projects ?? [], [projects]);

  const stats = useMemo(() => {
    const total = safeProjects.length;
    const corrupted = safeProjects.filter((p) => p.corrupted).length;
    const withThumb = safeProjects.filter((p) => !!p.thumbnailDataUrl).length;
    return { total, corrupted, withThumb };
  }, [safeProjects]);

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

  if (missingUserForMine) {
    return (
      <PageContainer>
        <Card className="ui-projects-shell">
          <PageHeader title="Projects" subtitle="Sessão incompleta." />
          <Card>
            <p className="ui-text-danger">
              Não foi possível determinar o utilizador para filtrar os projetos.
            </p>
          </Card>
        </Card>
      </PageContainer>
    );
  }

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

        {/* Estatísticas rápidas */}
        {!loading ? (
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 20,
              padding: "12px 16px",
              background: "var(--ui-color-surface, #f4f4f5)",
              borderRadius: 10,
              border: "1px solid var(--border, #e4e4e7)",
            }}
          >
            <StatPill label="Total" value={stats.total} />
            <StatPill label="Corrompidos" value={stats.corrupted} danger={stats.corrupted > 0} />
            <StatPill label="Com thumbnail" value={stats.withThumb} />
          </div>
        ) : null}

        <Section title="Projetos">
          {/* Barra de ações (admin/elevated) */}
          {isElevated ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
                marginBottom: 14,
                padding: "10px 14px",
                border: "1px dashed var(--border, #ccc)",
                borderRadius: 8,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  cursor: "pointer",
                  color: "var(--ui-color-muted, #71717a)",
                }}
              >
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Selecionar todos os projetos visíveis"
                />
                Selecionar todos
              </label>
              <span style={{ fontSize: 12, color: "var(--ui-color-muted, #71717a)", marginLeft: 4 }}>
                {selectedIds.size > 0 ? `${selectedIds.size} selecionado(s)` : "Nenhum selecionado"}
              </span>
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

          {loading ? <Loader label="Carregando projetos..." /> : null}

          {!loading && safeProjects.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--ui-color-muted, #71717a)",
              }}
            >
              <svg
                width={48}
                height={48}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>
                Nenhum projeto encontrado.
              </p>
              <p style={{ margin: 0, fontSize: 13 }}>
                Crie um novo projeto para começar.
              </p>
              <Link to="/workspace">
                <Button variant="primary" style={{ marginTop: 4 }}>
                  Novo projeto
                </Button>
              </Link>
            </div>
          ) : null}

          {!loading && safeProjects.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {safeProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isElevated={isElevated}
                  selected={selectedIds.has(project.id)}
                  onToggleSelect={toggleRow}
                />
              ))}
            </div>
          ) : null}
        </Section>
      </Card>
    </PageContainer>
  );
}

function StatPill({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: danger
            ? "var(--ui-color-danger, #ef4444)"
            : "var(--ui-color-text, #18181b)",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 12, color: "var(--ui-color-muted, #71717a)" }}>{label}</span>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const isElevated = user?.role === "admin" || user?.role === "ultra+";
  const scope = isElevated ? "all" : "mine";
  const ownerId = scope === "mine" ? user?.id : undefined;
  const listKey = `${scope}:${ownerId ?? ""}`;

  return (
    <ProjectsPageInner
      key={listKey}
      scope={scope}
      ownerId={ownerId}
      user={user ?? null}
      isElevated={isElevated}
    />
  );
}
