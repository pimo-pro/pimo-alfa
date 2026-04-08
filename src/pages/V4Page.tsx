import { useState } from "react";
import "../components/ui/ui.css";

type SectionId = "perfil" | "permissoes" | "definicoes" | "projetos" | "seguranca" | "atividade";

type Section = {
  id: SectionId;
  label: string;
  icon: string;
  subLabel: string;
};

const SECTIONS: Section[] = [
  { id: "perfil", label: "Perfil", icon: "👤", subLabel: "Informação pessoal" },
  { id: "permissoes", label: "Permissões", icon: "🛡️", subLabel: "Permissões efetivas" },
  { id: "definicoes", label: "Definições", icon: "⚙️", subLabel: "Geral" },
  { id: "projetos", label: "Projetos", icon: "📁", subLabel: "Meus projetos" },
  { id: "seguranca", label: "Segurança", icon: "🔐", subLabel: "Palavra-passe" },
  { id: "atividade", label: "Atividade", icon: "📈", subLabel: "Histórico" },
];

export default function V4Page() {
  const [activeSection, setActiveSection] = useState<SectionId>("perfil");
  const [subpanelOpen, setSubpanelOpen] = useState(true);
  const current = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];

  function handleSectionClick(section: Section) {
    if (section.id === activeSection) {
      setSubpanelOpen((prev) => !prev);
      return;
    }
    setActiveSection(section.id);
    setSubpanelOpen(true);
  }

  return (
    <div className="ui-settings-page-wrap" style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <div className="ui-settings-shell" style={{ width: "100%", height: "100%", display: "flex", overflow: "hidden" }}>
        {/* Column 1 */}
        <aside className="ui-settings-sidebar-icons" style={{ flexShrink: 0, overflowX: "hidden", overflowY: "auto" }}>
          <span style={{ fontSize: 10, color: "#888" }}>SECTION: sidebar</span>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              data-tooltip={section.label}
              title={section.label}
              className={`ui-settings-icon-btn${
                activeSection === section.id ? " ui-settings-icon-btn--active" : ""
              }`}
              onClick={() => handleSectionClick(section)}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{section.icon}</span>
            </button>
          ))}
        </aside>

        {/* Column 2 */}
        <aside
          className={`ui-settings-subpanel${subpanelOpen ? "" : " ui-settings-subpanel--collapsed"}`}
          style={{
            width: subpanelOpen ? 220 : 0,
            minWidth: subpanelOpen ? 220 : 0,
            flexShrink: 0,
            overflowX: "hidden",
            overflowY: "auto",
            transition: "width 0.2s ease, min-width 0.2s ease, opacity 0.2s ease",
          }}
        >
          <div className="ui-settings-subpanel-header">
            <span style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 4 }}>
              SECTION: subpanel
            </span>
            <p className="ui-settings-subpanel-title">{current.label}</p>
          </div>

          <div className="ui-settings-subpanel-items">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`ui-settings-subpanel-item${
                  activeSection === section.id ? " ui-settings-subpanel-item--active" : ""
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <span style={{ marginRight: 8 }}>{section.icon}</span>
                {section.subLabel}
              </button>
            ))}
          </div>
        </aside>

        {/* Column 3 */}
        <main className="ui-settings-content" style={{ flex: 1, minWidth: 0, overflowX: "hidden", overflowY: "hidden" }}>
          <span style={{ fontSize: 10, color: "#888" }}>SECTION: main-content</span>

          <section
            className="ui-card"
            style={{
              borderRadius: "var(--ui-radius-lg)",
              border: "1px solid var(--ui-color-border)",
              padding: "var(--ui-space-5)",
              background: "var(--ui-color-bg)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ui-color-text)",
              }}
            >
              {current.icon} {current.label}
            </p>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                color: "var(--ui-color-text-muted)",
              }}
            >
              Shell visual V4 (sem lógica de negócio).
            </p>
          </section>

          <section
            className="ui-card"
            style={{
              borderRadius: "var(--ui-radius-lg)",
              border: "1px solid var(--ui-color-border)",
              padding: "var(--ui-space-5)",
              background: "var(--ui-color-bg)",
              minHeight: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ui-color-text-muted)",
              }}
            >
              SECTION: viewer-placeholder
            </span>
          </section>
        </main>
      </div>
    </div>
  );
}
