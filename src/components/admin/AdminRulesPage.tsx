import { useState } from "react";
import { AdminPageHeader, adminPageShellStyle } from "./AdminUi";
import { RULES_REGISTRY } from "../../admin/rules/rulesRegistry";
import type { RulesCategoryId } from "../../admin/rules/rulesStore";

const ACTIVE_SECTION_KEY = "pimo_admin_rules_section";

export default function AdminRulesPage() {
  const [activeId, setActiveId] = useState<RulesCategoryId>(() => {
    const saved = localStorage.getItem(ACTIVE_SECTION_KEY) as RulesCategoryId | null;
    return saved && RULES_REGISTRY.some((e) => e.id === saved) ? saved : "costRules";
  });

  const active = RULES_REGISTRY.find((e) => e.id === activeId) ?? RULES_REGISTRY[0]!;
  const Editor = active.Editor;

  const selectSection = (id: RulesCategoryId) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_SECTION_KEY, id);
  };

  return (
    <div style={{ ...adminPageShellStyle, flexDirection: "row", alignItems: "stretch", gap: 16 }}>
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          paddingRight: 12,
          maxHeight: "calc(100vh - 160px)",
          overflowY: "auto",
        }}
      >
        <AdminPageHeader
          title="Sistema de Regras"
          subtitle="Rules System — motores Fases 1–9 (somente leitura industrial)"
        />
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
          {RULES_REGISTRY.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={activeId === entry.id ? "button button-primary button-sm" : "button button-sm"}
              style={{ textAlign: "left", justifyContent: "flex-start" }}
              onClick={() => selectSection(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </nav>
      </aside>

      <section style={{ flex: 1, minWidth: 0, overflowY: "auto", maxHeight: "calc(100vh - 160px)" }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 12px" }}>{active.description}</p>
        <Editor />
      </section>
    </div>
  );
}
