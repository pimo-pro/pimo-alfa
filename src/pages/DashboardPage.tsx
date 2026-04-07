import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getProjects } from "../api/projectsApi";
import { useAuth } from "../auth/useAuth";
import { useTheme, type ThemeId } from "../context/ThemeContext";
import { listProjects } from "../core/projects/projectsClient";
import { getCurrentProjectUser } from "../core/projects/currentUser";
import type { SavedProjectMeta } from "../core/projects/types";
import Button from "../components/ui/Button";
import "../components/ui/ui.css";

type SectionId =
  | "perfil"
  | "permissoes"
  | "definicoes"
  | "projetos"
  | "seguranca"
  | "atividade";

type SubItemId = string;

type NavSection = {
  id: SectionId;
  label: string;
  iconPath: string | string[];
  subItems: { id: SubItemId; label: string }[];
};

const SvgIcon = ({ paths, size = 20 }: { paths: string | string[]; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {(Array.isArray(paths) ? paths : [paths]).map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

const NAV_SECTIONS: NavSection[] = [
  {
    id: "perfil",
    label: "Perfil",
    iconPath:
      "M12 12c2.7 0 4-1.8 4-4s-1.3-4-4-4-4 1.8-4 4 1.3 4 4 4zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z",
    subItems: [
      { id: "info", label: "Informação pessoal" },
      { id: "avatar", label: "Foto de perfil" },
      { id: "preferencias", label: "Preferências" },
    ],
  },
  {
    id: "permissoes",
    label: "Permissões",
    iconPath: ["M12 2L4 6v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6l-8-4z", "M9 12l2 2 4-4"],
    subItems: [
      { id: "efetivas", label: "Permissões efetivas" },
      { id: "roles", label: "Roles" },
    ],
  },
  {
    id: "definicoes",
    label: "Definições",
    iconPath: [
      "M4 6h16",
      "M4 12h16",
      "M4 18h16",
      "M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
      "M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
      "M20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
    ],
    subItems: [
      { id: "geral", label: "Geral" },
      { id: "aparencia", label: "Aparência" },
      { id: "lingua", label: "Língua" },
    ],
  },
  {
    id: "projetos",
    label: "Projetos",
    iconPath: "M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z",
    subItems: [
      { id: "meus", label: "Os meus projetos" },
      { id: "recentes", label: "Recentes" },
    ],
  },
  {
    id: "seguranca",
    label: "Segurança",
    iconPath:
      "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
    subItems: [
      { id: "password", label: "Palavra-passe" },
      { id: "tokens", label: "Tokens de acesso" },
    ],
  },
  {
    id: "atividade",
    label: "Atividade",
    iconPath: "M22 12h-4l-3 9L9 3l-3 9H2",
    subItems: [{ id: "logs", label: "Histórico de ações" }],
  },
];

function ComingSoon() {
  return (
    <section className="ui-card">
      <div className="ui-coming-soon">
        <SvgIcon paths="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" size={40} />
        <p style={{ margin: 0, fontSize: 14 }}>Em breve.</p>
      </div>
    </section>
  );
}

type ProjectStats = {
  total: number;
  corrupted: number;
  withThumb: number;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso || "—";
    return d.toLocaleString("pt-PT");
  } catch {
    return iso || "—";
  }
}

function SectionContent({
  section,
  subItem,
  username,
  role,
  permissions,
  theme,
  setTheme,
  projectsCount,
  projectsLoading,
  projectsError,
  recentProjects,
  recentLoading,
  projectStats,
}: {
  section: SectionId;
  subItem: SubItemId;
  username: string;
  role: string;
  permissions: string[];
  theme: ThemeId;
  setTheme: (_theme: ThemeId) => void;
  projectsCount: number | null;
  projectsLoading: boolean;
  projectsError: string | null;
  recentProjects: SavedProjectMeta[];
  recentLoading: boolean;
  projectStats: ProjectStats;
}) {
  const initials = (username || "?").slice(0, 2).toUpperCase();
  const roleLower = role.toLowerCase();
  const badgeClass =
    roleLower === "admin"
      ? "ui-dash-role-badge ui-dash-role-badge--admin"
      : "ui-dash-role-badge ui-dash-role-badge--user";

  if (section === "perfil" && subItem === "info") {
    return (
      <section className="ui-section">
        <header className="ui-section__header">
          <h3 className="ui-section__title">Informação pessoal</h3>
          <p className="ui-section__subtitle">Os dados da tua conta PIMO Studio.</p>
        </header>
        <section className="ui-card">
          <div className="ui-profile-card-row">
            <div className="ui-avatar">{initials}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: "var(--ui-color-text)" }}>{username || "—"}</span>
              <span className={badgeClass}>{role || "—"}</span>
            </div>
          </div>
          <div className="ui-kv-list" style={{ marginTop: 24 }}>
            <p className="ui-kv-item">
              <strong>Utilizador:</strong> {username || "—"}
            </p>
            <p className="ui-kv-item">
              <strong>Role:</strong> {role || "—"}
            </p>
            <p className="ui-kv-item">
              <strong>Membro desde:</strong> —
            </p>
            <p className="ui-kv-item">
              <strong>Estado:</strong> Ativo
            </p>
          </div>
        </section>
      </section>
    );
  }

  if (section === "permissoes" && subItem === "efetivas") {
    // @PIMO-KEEP — guard: permissions pode vir undefined do contexto
    const safePerms = permissions ?? [];
    return (
      <section className="ui-section">
        <header className="ui-section__header">
          <h3 className="ui-section__title">Permissões efetivas</h3>
        </header>
        <section className="ui-card">
          {safePerms.length > 0 ? (
            <div className="ui-inline-list">
              {safePerms.map((permission) => (
                <span key={permission} className="ui-badge">
                  {permission}
                </span>
              ))}
            </div>
          ) : (
            <div className="ui-empty-state">
              <SvgIcon paths="M12 2L4 6v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6l-8-4z" size={40} />
              <p style={{ margin: 0 }}>Nenhuma permissão listada.</p>
            </div>
          )}
        </section>
        <div className="ui-inline-actions">
          <Link to="/projects">
            <Button variant="primary">Abrir Projects</Button>
          </Link>
        </div>
      </section>
    );
  }

  if (section === "permissoes" && subItem === "roles") {
    return (
      <section className="ui-section">
        <header className="ui-section__header">
          <h3 className="ui-section__title">Roles</h3>
          <p className="ui-section__subtitle">A tua role atual no sistema.</p>
        </header>
        <section className="ui-card">
          <div className="ui-kv-list">
            <p className="ui-kv-item">
              <strong>Role atribuída:</strong> {role || "—"}
            </p>
          </div>
        </section>
      </section>
    );
  }

  if (section === "definicoes" && subItem === "aparencia") {
    return (
      <section className="ui-section">
        <header className="ui-section__header">
          <h3 className="ui-section__title">Aparência</h3>
          <p className="ui-section__subtitle">Tema da interface.</p>
        </header>
        <section className="ui-card">
          <p className="ui-kv-item">
            <strong>Tema actual:</strong> {theme === "dark" ? "Escuro" : "Claro"}
          </p>
          <div className="ui-inline-actions" style={{ marginTop: 16 }}>
            <Button type="button" variant={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")}>
              Claro
            </Button>
            <Button type="button" variant={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")}>
              Escuro
            </Button>
          </div>
        </section>
      </section>
    );
  }

  if (section === "definicoes" && subItem === "lingua") {
    return (
      <section className="ui-section">
        <header className="ui-section__header">
          <h3 className="ui-section__title">Língua</h3>
        </header>
        <section className="ui-card">
          <p className="ui-kv-item">
            <strong>Idioma da interface:</strong> Português (PT)
          </p>
        </section>
      </section>
    );
  }

  if (section === "definicoes" && subItem === "geral") {
    return (
      <section className="ui-section">
        <header className="ui-section__header">
          <h3 className="ui-section__title">Geral</h3>
        </header>
        <section className="ui-card">
          <p className="ui-text-muted" style={{ margin: 0 }}>
            Preferências gerais da conta. Mais opções serão adicionadas aqui.
          </p>
        </section>
      </section>
    );
  }

  if (section === "projetos" && subItem === "meus") {
    return (
      <section className="ui-section">
        <header className="ui-section__header">
          <h3 className="ui-section__title">Os meus projetos</h3>
          <p className="ui-section__subtitle">Resumo dos projetos guardados neste dispositivo.</p>
        </header>
        <section className="ui-card">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              { label: "Total local", value: projectStats.total },
              { label: "Corrompidos", value: projectStats.corrupted, danger: projectStats.corrupted > 0 },
              { label: "Com thumbnail", value: projectStats.withThumb },
            ].map(({ label, value, danger }) => (
              <div
                key={label}
                style={{
                  background: "var(--ui-color-surface, #f4f4f5)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 700,
                    color: danger
                      ? "var(--ui-color-danger, #ef4444)"
                      : "var(--ui-color-text, #18181b)",
                  }}
                >
                  {value}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ui-color-muted, #71717a)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
          <p className="ui-kv-item">
            <strong>Total (API):</strong>{" "}
            {projectsLoading ? "A carregar…" : projectsError ?? (projectsCount !== null ? String(projectsCount) : "—")}
          </p>
          <div className="ui-inline-actions" style={{ marginTop: 16, flexWrap: "wrap", gap: 8 }}>
            <Link to="/workspace">
              <Button variant="primary">Novo projeto</Button>
            </Link>
            <Link to="/projects">
              <Button variant="outline">Ver todos</Button>
            </Link>
          </div>
        </section>
      </section>
    );
  }

  if (section === "projetos" && subItem === "recentes") {
    return (
      <section className="ui-section">
        <header className="ui-section__header">
          <h3 className="ui-section__title">Recentes</h3>
          <p className="ui-section__subtitle">Os últimos 5 projetos editados.</p>
        </header>
        <section className="ui-card">
          {recentLoading ? (
            <p className="ui-text-muted" style={{ margin: 0 }}>A carregar projetos recentes…</p>
          ) : recentProjects.length === 0 ? (
            <p className="ui-text-muted" style={{ margin: 0 }}>
              Nenhum projeto encontrado. Crie um novo projeto para começar.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--border, #e4e4e7)",
                      background: "var(--ui-color-bg, #fff)",
                      cursor: "pointer",
                      transition: "background 0.12s",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 36,
                        borderRadius: 6,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: "var(--ui-color-surface, #f4f4f5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {project.thumbnailDataUrl ? (
                        <img
                          src={project.thumbnailDataUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <svg
                          width={18}
                          height={18}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--ui-color-muted, #a1a1aa)"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M3 9h18M9 21V9" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--ui-color-text, #18181b)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {project.name?.trim() || "Projeto sem nome"}
                        {project.corrupted ? (
                          <span
                            style={{
                              background: "var(--ui-color-danger, #ef4444)",
                              color: "#fff",
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: 3,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}
                          >
                            Corrompido
                          </span>
                        ) : null}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ui-color-muted, #71717a)" }}>
                        {formatDate(project.updatedAt ?? "")}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {!recentLoading && (
            <div style={{ marginTop: 14 }}>
              <Link to="/projects">
                <Button variant="outline" style={{ width: "100%", fontSize: 13 }}>
                  Ver todos os projetos
                </Button>
              </Link>
            </div>
          )}
        </section>
      </section>
    );
  }

  if (section === "seguranca" || section === "atividade") {
    return (
      <section className="ui-section">
        <header className="ui-section__header">
          <h3 className="ui-section__title">
            {NAV_SECTIONS.find((s) => s.id === section)?.subItems.find((i) => i.id === subItem)?.label ?? section}
          </h3>
        </header>
        <ComingSoon />
      </section>
    );
  }

  if (section === "perfil") {
    return (
      <section className="ui-section">
        <header className="ui-section__header">
          <h3 className="ui-section__title">
            {NAV_SECTIONS.find((s) => s.id === section)?.subItems.find((i) => i.id === subItem)?.label ?? section}
          </h3>
        </header>
        <ComingSoon />
      </section>
    );
  }

  return (
    <section className="ui-section">
      <header className="ui-section__header">
        <h3 className="ui-section__title">
          {NAV_SECTIONS.find((s) => s.id === section)?.subItems.find((i) => i.id === subItem)?.label ?? section}
        </h3>
      </header>
      <ComingSoon />
    </section>
  );
}

export default function DashboardPage() {
  const { user, permissions } = useAuth();
  const { theme, setTheme } = useTheme();

  const username = user?.username ?? "—";
  const role = user?.role ?? "—";

  const [activeSection, setActiveSection] = useState<SectionId>("perfil");
  const [activeSubItem, setActiveSubItem] = useState<SubItemId>("info");
  const [subpanelOpen, setSubpanelOpen] = useState(true);

  const [projectsCount, setProjectsCount] = useState<number | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [recentProjects, setRecentProjects] = useState<SavedProjectMeta[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [projectStats, setProjectStats] = useState<ProjectStats>({ total: 0, corrupted: 0, withThumb: 0 });

  useEffect(() => {
    let cancelled = false;
    getProjects()
      .then((res) => {
        if (!cancelled) {
          setProjectsError(null);
          // @PIMO-KEEP — guard: API pode devolver projects:undefined
          const list = res.projects ?? [];
          setProjectsCount(list.length);
        }
      })
      .catch((e) => {
        if (!cancelled) setProjectsError(e instanceof Error ? e.message : "Erro ao carregar projetos");
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const currentUser = getCurrentProjectUser();
        const all = await listProjects("all");
        if (cancelled) return;

        // @PIMO-KEEP — guard: lista pode ser inválida
        const safe = Array.isArray(all) ? all : [];

        const stats: ProjectStats = {
          total: safe.length,
          corrupted: safe.filter((p) => p.corrupted).length,
          withThumb: safe.filter((p) => !!p.thumbnailDataUrl).length,
        };
        setProjectStats(stats);

        const sorted = [...safe].sort((a, b) => {
          const ta = new Date(a.updatedAt ?? "").getTime();
          const tb = new Date(b.updatedAt ?? "").getTime();
          return tb - ta;
        });

        // Priorizar projetos do utilizador atual; se nenhum, mostrar todos
        const mine = sorted.filter((p) => p.ownerId === currentUser.ownerId);
        const recent = (mine.length > 0 ? mine : sorted).slice(0, 5);
        if (!cancelled) setRecentProjects(recent);
      } catch {
        /* Falha silenciosa — dados locais podem não estar disponíveis */
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentSection = NAV_SECTIONS.find((s) => s.id === activeSection)!;

  function handleSectionClick(section: NavSection) {
    if (activeSection === section.id) {
      setSubpanelOpen((prev) => !prev);
    } else {
      setActiveSection(section.id);
      setActiveSubItem(section.subItems[0].id);
      setSubpanelOpen(true);
    }
  }

  return (
    <div className="ui-settings-page-wrap">
      <div className="ui-settings-shell">
        <aside className="ui-settings-sidebar-icons">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`ui-settings-icon-btn${activeSection === section.id ? " ui-settings-icon-btn--active" : ""}`}
              data-tooltip={section.label}
              title={section.label}
              onClick={() => handleSectionClick(section)}
            >
              <SvgIcon paths={section.iconPath} size={20} />
            </button>
          ))}
        </aside>

        <aside className={`ui-settings-subpanel${subpanelOpen ? "" : " ui-settings-subpanel--collapsed"}`}>
          <div className="ui-settings-subpanel-header">
            <p className="ui-settings-subpanel-title">{currentSection.label}</p>
          </div>
          <div className="ui-settings-subpanel-items">
            {currentSection.subItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`ui-settings-subpanel-item${activeSubItem === item.id ? " ui-settings-subpanel-item--active" : ""}`}
                onClick={() => setActiveSubItem(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="ui-settings-content">
          <SectionContent
            section={activeSection}
            subItem={activeSubItem}
            username={username}
            role={role}
            permissions={permissions ?? []}
            theme={theme}
            setTheme={setTheme}
            projectsCount={projectsCount}
            projectsLoading={projectsLoading}
            projectsError={projectsError}
            recentProjects={recentProjects}
            recentLoading={recentLoading}
            projectStats={projectStats}
          />
        </main>
      </div>
    </div>
  );
}
