import { useEffect, useState } from "react";
import {
  getDefaultIndustrialSectionsConfig,
  loadIndustrialSectionsConfig,
  saveIndustrialSectionsConfig,
  type IndustrialSectionConfig,
} from "../../admin/industrialSectionsConfig";
import Button from "../ui/Button";

export default function IndustrialSectionsAdminPage() {
  const [sections, setSections] = useState<IndustrialSectionConfig[]>(() => loadIndustrialSectionsConfig());

  useEffect(() => {
    saveIndustrialSectionsConfig(sections);
  }, [sections]);

  const updateSection = (id: IndustrialSectionConfig["id"], patch: Partial<IndustrialSectionConfig>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const toggleColumn = (sectionId: IndustrialSectionConfig["id"], columnId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              columns: s.columns.map((c) => (c.id === columnId ? { ...c, visible: !c.visible } : c)),
            }
      )
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, color: "var(--admin-text)" }}>Secções industriais (BottomInfoToolbar)</h2>
        <Button type="button" variant="secondary" onClick={() => setSections(getDefaultIndustrialSectionsConfig())}>
          Restaurar padrão
        </Button>
      </div>

      {sections.map((section) => (
        <section key={section.id} className="admin-section-card">
          <h3 style={{ margin: "0 0 8px", color: "var(--admin-text)" }}>{section.label}</h3>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 6, color: "var(--admin-text)" }}>
            <input
              type="checkbox"
              checked={section.enabled}
              onChange={(e) => updateSection(section.id, { enabled: e.target.checked })}
            />
            Secção activa
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 6, color: "var(--admin-text)" }}>
            <input
              type="checkbox"
              checked={section.showPrices}
              onChange={(e) => updateSection(section.id, { showPrices: e.target.checked })}
            />
            Mostrar preços
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 10, color: "var(--admin-text)" }}>
            <input
              type="checkbox"
              checked={section.adminOnlyPrices}
              onChange={(e) => updateSection(section.id, { adminOnlyPrices: e.target.checked })}
            />
            Preços apenas ADMIN
          </label>

          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>Colunas visíveis</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {section.columns.map((col) => (
              <label key={col.id} style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center", color: "var(--admin-text)" }}>
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggleColumn(section.id, col.id)}
                />
                {col.label}
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
