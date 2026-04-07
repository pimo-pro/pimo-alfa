import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import type { AuthUser } from "../auth/AuthContext";
import type { SavedProjectInfo } from "../context/projectTypes";
import { listProjects, deleteProjectById } from "../core/projects/projectsClient";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import PageContainer from "../components/ui/PageContainer";
import PageHeader from "../components/ui/PageHeader";
import Section from "../components/ui/Section";
import "../components/ui/ui.css";

import { PIMO_SHOWROOM_PROJECT_IDS_KEY } from "./ProjectsViewerPage";
import { useProjectsUIOverlay, type ProjectTag, type ProjectUIOverlay } from "../hooks/useProjectsUIOverlay";
import { ConfirmDeleteModal } from "../components/projects/ConfirmDeleteModal";
import { UsersSidebar } from "../components/projects/UsersSidebar";
import { buildUserEntries } from "../components/projects/userEntriesUtils";
import { ProjectGroupHeader } from "../components/projects/ProjectGroupHeader";
import { ProjectTagBadge } from "../components/projects/ProjectTagBadge";
import { TagPicker } from "../components/projects/TagPicker";

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
  onToggleSelect: (_id: string, _checked: boolean) => void;
  overlay: ProjectUIOverlay;
  onSetTag: (_id: string, _tag: ProjectTag) => void;
  onSetNote: (_id: string, _note: string) => void;
};

function ProjectCard({
  project,
  isElevated,
  selected,
  onToggleSelect,
  overlay,
  onSetTag,
  onSetNote,
}: ProjectCardProps) {
  const displayName = project.name?.trim() || "Projeto sem nome";
  const [tagPickerAnchor, setTagPickerAnchor] = useState<DOMRect | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(overlay.note ?? "");
  const noteInputRef = useRef<HTMLInputElement>(null);

  const handleTagBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTagPickerAnchor(rect);
  };

  const handleNoteIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setNoteDraft(overlay.note ?? "");
    setEditingNote(true);
    setTimeout(() => noteInputRef.current?.focus(), 40);
  };

  const commitNote = () => {
    onSetNote(project.id, noteDraft.trim());
    setEditingNote(false);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitNote();
    if (e.key === "Escape") setEditingNote(false);
  };

  return (
    <div
      style={{
        border: selected
          ? "2px solid var(--ui-color-primary, #3b82f6)"
          : project.corrupted
          ? "1.5px solid var(--ui-color-danger, #ef4444)"
          : "1px solid var(--border, #e4e4e7)",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--ui-color-bg, #fff)",
        boxShadow: selected
          ? "0 0 0 3px rgba(59,130,246,0.15)"
          : "0 1px 4px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s, border-color 0.15s",
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

        {/* Tag badge (topo esquerdo, tag picker) */}
        <span style={{ position: "absolute", top: 8, left: isElevated ? 32 : 8 }}>
          <ProjectTagBadge
            tag={overlay.tag ?? null}
            onClick={handleTagBadgeClick}
          />
        </span>

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

        {/* Nota rápida */}
        <div style={{ marginTop: "auto", paddingTop: 4 }}>
          {editingNote ? (
            <input
              ref={noteInputRef}
              type="text"
              value={noteDraft}
              maxLength={60}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={commitNote}
              onKeyDown={handleNoteKeyDown}
              placeholder="Nota rápida (Enter para guardar)"
              style={{
                width: "100%",
                fontSize: 11,
                padding: "3px 6px",
                border: "1px solid var(--ui-color-primary, #3b82f6)",
                borderRadius: 5,
                background: "var(--ui-color-bg, #fff)",
                color: "var(--ui-color-text, #18181b)",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <button
              type="button"
              onClick={handleNoteIconClick}
              title={overlay.note ? overlay.note : "Adicionar nota"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: overlay.note
                  ? "var(--ui-color-text, #18181b)"
                  : "var(--ui-color-muted, #a1a1aa)",
                fontSize: 11,
                maxWidth: "100%",
                overflow: "hidden",
              }}
            >
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                style={{ flexShrink: 0 }}
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {overlay.note || "Adicionar nota"}
              </span>
            </button>
          )}
        </div>
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

      {/* Tag picker portal */}
      {tagPickerAnchor && (
        <TagPicker
          current={overlay.tag ?? null}
          onSelect={(tag) => onSetTag(project.id, tag)}
          onClose={() => setTagPickerAnchor(null)}
          anchorRect={tagPickerAnchor}
        />
      )}
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
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDeleteInfo, setConfirmDeleteInfo] = useState<{ ids: string[]; names: string[] } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeOwnerFilter, setActiveOwnerFilter] = useState<string | null>(null);

  const { overlays, archive, unarchive, removeFromOverlay, setTag, setNote, getOverlay, archivedCount } =
    useProjectsUIOverlay();

  const missingUserForMine = scope === "mine" && !(user?.id ?? "").trim();

  const reload = useCallback(async () => {
    if (missingUserForMine) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listProjects(scope, ownerId);
      const sorted = Array.isArray(list)
        ? [...list].sort((a, b) => {
            const ta = new Date(a.updatedAt ?? "").getTime();
            const tb = new Date(b.updatedAt ?? "").getTime();
            return tb - ta;
          })
        : [];
      setProjects(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar projetos");
    } finally {
      setLoading(false);
    }
  }, [scope, ownerId, missingUserForMine]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const safeProjects = useMemo(() => projects ?? [], [projects]);

  // Filtrar por owner (Fase 2)
  const ownerFilteredProjects = useMemo(() => {
    if (!activeOwnerFilter) return safeProjects;
    return safeProjects.filter((p) => p.ownerId === activeOwnerFilter);
  }, [safeProjects, activeOwnerFilter]);

  // Separar arquivados dos ativos
  const activeProjects = useMemo(
    () => ownerFilteredProjects.filter((p) => !overlays[p.id]?.archived),
    [ownerFilteredProjects, overlays]
  );

  const archivedProjects = useMemo(
    () => safeProjects.filter((p) => overlays[p.id]?.archived),
    [safeProjects, overlays]
  );

  const stats = useMemo(() => {
    const total = safeProjects.length;
    const corrupted = safeProjects.filter((p) => p.corrupted).length;
    const withThumb = safeProjects.filter((p) => !!p.thumbnailDataUrl).length;
    const archived = archivedProjects.length;
    return { total, corrupted, withThumb, archived };
  }, [safeProjects, archivedProjects]);

  const allSelected = useMemo(
    () => activeProjects.length > 0 && activeProjects.every((p) => selectedIds.has(p.id)),
    [activeProjects, selectedIds]
  );

  const someSelected = useMemo(
    () => activeProjects.some((p) => selectedIds.has(p.id)),
    [activeProjects, selectedIds]
  );

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeProjects.map((p) => p.id)));
    }
  }, [allSelected, activeProjects]);

  const toggleRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleArchiveSelected = useCallback(() => {
    const ids = Array.from(selectedIds);
    archive(ids);
    setSelectedIds(new Set());
  }, [selectedIds, archive]);

  const handleDeleteSelected = useCallback(() => {
    const ids = Array.from(selectedIds);
    const names = ids.map(
      (id) => safeProjects.find((p) => p.id === id)?.name?.trim() || "Projeto sem nome"
    );
    setConfirmDeleteInfo({ ids, names });
  }, [selectedIds, safeProjects]);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDeleteInfo) return;
    setIsDeleting(true);
    try {
      for (const id of confirmDeleteInfo.ids) {
        await deleteProjectById(id);
      }
      removeFromOverlay(confirmDeleteInfo.ids);
      setSelectedIds(new Set());
      setConfirmDeleteInfo(null);
      await reload();
    } finally {
      setIsDeleting(false);
    }
  }, [confirmDeleteInfo, removeFromOverlay, reload]);

  // Agrupamento por utilizador (Fase 2) — só quando scope=all e sem filtro ativo
  const groupedByOwner = useMemo(() => {
    if (!isElevated || activeOwnerFilter) return null;
    const map = new Map<string, { ownerName: string; projects: SavedProjectInfo[] }>();
    for (const p of activeProjects) {
      const key = p.ownerId || "desconhecido";
      if (!map.has(key)) {
        map.set(key, { ownerName: p.ownerName?.trim() || key, projects: [] });
      }
      map.get(key)!.projects.push(p);
    }
    return Array.from(map.entries()).map(([ownerId, v]) => ({
      ownerId,
      ownerName: v.ownerName,
      projects: v.projects,
    }));
  }, [isElevated, activeOwnerFilter, activeProjects]);

  const userEntries = useMemo(
    () => buildUserEntries(safeProjects, overlays),
    [safeProjects, overlays]
  );

  const pageSubtitle = useMemo(() => {
    if (scope === "all") return "Lista global de projetos guardados.";
    return "Os teus projetos guardados.";
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

  const selectedCount = selectedIds.size;

  return (
    <>
      {/* Sidebar de utilizadores (Fase 2) — só para elevated */}
      {isElevated && userEntries.length > 1 && (
        <UsersSidebar
          users={userEntries}
          activeOwnerId={activeOwnerFilter}
          onSelectOwner={setActiveOwnerFilter}
        />
      )}

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
                alignItems: "center",
              }}
            >
              <StatPill label="Total" value={stats.total} />
              <StatPill label="Corrompidos" value={stats.corrupted} danger={stats.corrupted > 0} />
              <StatPill label="Com thumbnail" value={stats.withThumb} />
              {stats.archived > 0 && (
                <StatPill label="Arquivados" value={stats.archived} />
              )}

              {/* Filtro de owner ativo */}
              {activeOwnerFilter && (
                <button
                  type="button"
                  onClick={() => setActiveOwnerFilter(null)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    color: "var(--ui-color-primary, #3b82f6)",
                    background: "none",
                    border: "1px solid var(--ui-color-primary, #3b82f6)",
                    borderRadius: 6,
                    padding: "3px 10px",
                    cursor: "pointer",
                  }}
                >
                  {userEntries.find((u) => u.ownerId === activeOwnerFilter)?.ownerName ?? activeOwnerFilter}
                  {" "}× limpar filtro
                </button>
              )}
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
                  {selectedCount > 0 ? `${selectedCount} selecionado(s)` : "Nenhum selecionado"}
                </span>

                {/* Ações contextuais quando há seleção */}
                {selectedCount > 0 && (
                  <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleArchiveSelected}
                    >
                      Arquivar ({selectedCount})
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleDeleteSelected}
                    >
                      Eliminar ({selectedCount})
                    </Button>
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  disabled={selectedCount === 0}
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

                {/* Toggle projetos arquivados */}
                {archivedCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowArchived((v) => !v)}
                  >
                    {showArchived ? "Ocultar arquivados" : `Arquivados (${archivedCount})`}
                  </Button>
                )}
              </div>
            ) : null}

            {loading ? <Loader label="Carregando projetos..." /> : null}

            {/* Lista principal — agrupada por owner ou flat */}
            {!loading && activeProjects.length === 0 && !showArchived ? (
              <EmptyState />
            ) : null}

            {!loading && activeProjects.length > 0 ? (
              isElevated && groupedByOwner && groupedByOwner.length > 1 ? (
                // Vista agrupada por utilizador
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {groupedByOwner.map((group) => (
                    <div key={group.ownerId}>
                      <ProjectGroupHeader
                        ownerName={group.ownerName}
                        count={group.projects.length}
                      />
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                          gap: 16,
                          marginTop: 12,
                        }}
                      >
                        {group.projects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            isElevated={isElevated}
                            selected={selectedIds.has(project.id)}
                            onToggleSelect={toggleRow}
                            overlay={getOverlay(project.id)}
                            onSetTag={setTag}
                            onSetNote={setNote}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Vista flat (filtrada por owner ou utilizador comum)
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 16,
                  }}
                >
                  {activeProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isElevated={isElevated}
                      selected={selectedIds.has(project.id)}
                      onToggleSelect={toggleRow}
                      overlay={getOverlay(project.id)}
                      onSetTag={setTag}
                      onSetNote={setNote}
                    />
                  ))}
                </div>
              )
            ) : null}

            {/* Secção de projetos arquivados */}
            {!loading && showArchived && archivedProjects.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                    paddingBottom: 8,
                    borderBottom: "1px dashed var(--border, #e4e4e7)",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ui-color-muted, #71717a)",
                    }}
                  >
                    Projetos Arquivados ({archivedProjects.length})
                  </h3>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 16,
                    opacity: 0.7,
                  }}
                >
                  {archivedProjects.map((project) => (
                    <div key={project.id} style={{ position: "relative" }}>
                      <ProjectCard
                        project={project}
                        isElevated={false}
                        selected={false}
                        onToggleSelect={(_id, _checked) => {}}
                        overlay={getOverlay(project.id)}
                        onSetTag={setTag}
                        onSetNote={setNote}
                      />
                      <button
                        type="button"
                        onClick={() => unarchive([project.id])}
                        style={{
                          position: "absolute",
                          bottom: 52,
                          left: 0,
                          right: 0,
                          margin: "0 14px",
                          padding: "5px",
                          background: "var(--ui-color-surface, #f4f4f5)",
                          border: "1px solid var(--border, #e4e4e7)",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 12,
                          color: "var(--ui-color-text, #18181b)",
                          fontWeight: 500,
                        }}
                      >
                        Restaurar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </Card>
      </PageContainer>

      {/* Modal de confirmação de eliminação */}
      {confirmDeleteInfo && (
        <ConfirmDeleteModal
          projectNames={confirmDeleteInfo.names}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => !isDeleting && setConfirmDeleteInfo(null)}
        />
      )}
    </>
  );
}

function EmptyState() {
  return (
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
      <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Nenhum projeto encontrado.</p>
      <p style={{ margin: 0, fontSize: 13 }}>Crie um novo projeto para começar.</p>
      <Link to="/workspace">
        <Button variant="primary" style={{ marginTop: 4 }}>
          Novo projeto
        </Button>
      </Link>
    </div>
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
