import { useMemo, useState } from "react";

type SectionId =
  | "perfil"
  | "permissoes"
  | "definicoes"
  | "projetos"
  | "seguranca"
  | "atividade";

type NavSection = {
  id: SectionId;
  label: string;
  iconPath: string | string[];
  subItemLabel: string;
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: "perfil",
    label: "Perfil",
    iconPath:
      "M12 12c2.7 0 4-1.8 4-4s-1.3-4-4-4-4 1.8-4 4 1.3 4 4 4zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z",
    subItemLabel: "Informação pessoal",
  },
  {
    id: "permissoes",
    label: "Permissões",
    iconPath: ["M12 2L4 6v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6l-8-4z", "M9 12l2 2 4-4"],
    subItemLabel: "Permissões efetivas",
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
    subItemLabel: "Geral",
  },
  {
    id: "projetos",
    label: "Projetos",
    iconPath: "M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z",
    subItemLabel: "Showroom",
  },
  {
    id: "seguranca",
    label: "Segurança",
    iconPath:
      "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
    subItemLabel: "Palavra-passe",
  },
  {
    id: "atividade",
    label: "Atividade",
    iconPath: "M22 12h-4l-3 9L9 3l-3 9H2",
    subItemLabel: "Histórico",
  },
];

const COLORS = {
  bg: "var(--ui-color-bg, #ffffff)",
  surface: "var(--ui-color-surface, #f4f4f5)",
  border: "var(--border, #e4e4e7)",
  text: "var(--ui-color-text, #18181b)",
  muted: "var(--ui-color-muted, #71717a)",
  primary: "var(--ui-color-primary, #3b82f6)",
};

function SvgIcon({ paths, size = 20 }: { paths: string | string[]; size?: number }) {
  return (
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
}

export default function V4Page() {
  const [activeSection, setActiveSection] = useState<SectionId>("perfil");
  const [subpanelOpen, setSubpanelOpen] = useState(true);

  const currentSection = useMemo(
    () => NAV_SECTIONS.find((s) => s.id === activeSection) ?? NAV_SECTIONS[0],
    [activeSection]
  );

  function handleSectionClick(section: NavSection) {
    if (activeSection === section.id) {
      setSubpanelOpen((prev) => !prev);
      return;
    }
    setActiveSection(section.id);
    setSubpanelOpen(true);
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "calc(100vh - 120px)",
        boxSizing: "border-box",
        background: COLORS.surface,
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          minHeight: "calc(100vh - 144px)",
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid ${COLORS.border}`,
          background: COLORS.bg,
        }}
      >
        {/* Coluna 1 — icon sidebar (Dashboard visual) */}
        <aside
          style={{
            width: 64,
            minWidth: 64,
            borderRight: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "10px 8px",
          }}
        >
          {NAV_SECTIONS.map((section) => {
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                title={section.label}
                onClick={() => handleSectionClick(section)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
                  background: active ? "rgba(59,130,246,0.10)" : COLORS.bg,
                  color: active ? COLORS.primary : COLORS.muted,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all .15s ease",
                }}
              >
                <SvgIcon paths={section.iconPath} size={20} />
              </button>
            );
          })}
        </aside>

        {/* Coluna 2 — collapsible sub-panel (Dashboard visual behavior) */}
        <aside
          style={{
            width: subpanelOpen ? 260 : 0,
            minWidth: subpanelOpen ? 260 : 0,
            maxWidth: subpanelOpen ? 260 : 0,
            borderRight: subpanelOpen ? `1px solid ${COLORS.border}` : "none",
            overflow: "hidden",
            transition: "width .2s ease",
            background: COLORS.bg,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              {currentSection.label}
            </p>
          </div>

          <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {NAV_SECTIONS.map((section) => {
              const active = section.id === activeSection;
              return (
                <div key={section.id}>
                  <div style={{ color: "#888", fontSize: 11, marginBottom: 4 }}>
                    SECTION: {section.label}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
                      background: active ? "rgba(59,130,246,0.08)" : COLORS.bg,
                      color: active ? COLORS.primary : COLORS.text,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {section.subItemLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Coluna 3 — main content inspired by ProjectsViewerPage */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: COLORS.surface,
          }}
        >
          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, color: COLORS.text }}>V4</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.muted }}>
              Layout base inspirado no Dashboard + Projects Viewer
            </p>
          </div>

          {/* Toolbar (same position concept as ProjectsViewerPage) */}
          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              style={{
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.bg,
                color: COLORS.text,
                padding: "6px 10px",
                fontSize: 12,
              }}
            >
              Ação 1
            </button>
            <button
              type="button"
              style={{
                borderRadius: 8,
                border: `1px solid ${COLORS.primary}`,
                background: COLORS.primary,
                color: "#fff",
                padding: "6px 10px",
                fontSize: 12,
              }}
            >
              Ação 2
            </button>
          </div>

          {/* Canvas area + side panel layout inspired by ProjectsViewerPage */}
          <div
            style={{
              flex: 1,
              minHeight: 320,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                flex: "1 1 0",
                minWidth: 0,
                height: "100%",
                minHeight: 320,
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
              }}
            >
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.muted }}>
                V4 Viewer
              </p>
            </div>

            <aside
              style={{
                width: 240,
                minWidth: 240,
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <div style={{ color: "#888", fontSize: 11, marginBottom: 6 }}>
                SECTION: {currentSection.label}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.text }}>
                Painel lateral placeholder.
              </p>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}