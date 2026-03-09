import { Suspense, lazy, useState } from "react";
import TemplatesManager from "../components/admin/TemplatesManager";
import CADModelsManager from "../components/admin/CADModelsManager";
import MaterialsManufacturing from "../components/admin/MaterialsManufacturing";
import RulesManager from "../components/admin/RulesManager";
import FileManager from "../components/admin/FileManager";
import RulesAdminPage from "../components/admin/RulesAdminPage";
import RulesProfilesPage from "../components/admin/RulesProfilesPage";
import DeployAdminPage from "../components/admin/DeployAdminPage";
import ComponentTypesAdminPage from "../components/admin/ComponentTypesAdminPage";
import FerragensAdminPage from "../components/admin/FerragensAdminPage";
import SystemSettingsBase from "../components/admin/SystemSettingsBase";
import EtiquetaDesignerPage from "../components/admin/EtiquetaDesignerPage";
import PainelReferencia from "./PainelReferencia";

const ProjectProgress = lazy(() => import("./ProjectProgress"));

type AdminTab =
  | "Materiais & Fabricação"
  | "Ferragens"
  | "Templates"
  | "CAD Models"
  | "Regras"
  | "Configuração de Regras"
  | "Perfis de Regras"
  | "Component Types"
  | "Gestor de Ficheiros"
  | "Deploy"
  | "Project Progress"
  | "Painel Referência"
  | "System Settings"
  | "Etiqueta / QR N";

type AdminMenuEntry =
  | { type: "group"; label: string }
  | { type: "item"; id: AdminTab; label: string; badge?: string; disabled?: boolean };

const ADMIN_ACTIVE_TAB_STORAGE_KEY = "pimo_admin_active_tab";
const DEFAULT_ADMIN_TAB: AdminTab = "Materiais & Fabricação";

const adminMenu: AdminMenuEntry[] = [
  { type: "group", label: "Configuração" },
  { type: "item", id: "Materiais & Fabricação", label: "Materiais & Fabricação" },
  { type: "item", id: "Ferragens", label: "Ferragens" },
  { type: "item", id: "Component Types", label: "Component Types" },
  { type: "item", id: "Regras", label: "Regras" },
  { type: "item", id: "Configuração de Regras", label: "Configuração de Regras" },
  { type: "item", id: "Perfis de Regras", label: "Perfis de Regras" },
  { type: "group", label: "Catálogo / Modelos" },
  { type: "item", id: "CAD Models", label: "CAD Models" },
  { type: "item", id: "Templates", label: "Templates" },
  { type: "group", label: "Operações / Diagnóstico" },
  { type: "item", id: "Gestor de Ficheiros", label: "Gestor de Ficheiros" },
  { type: "item", id: "Deploy", label: "Deploy", badge: "Experimental" },
  { type: "item", id: "System Settings", label: "System Settings" },
  { type: "item", id: "Etiqueta / QR N", label: "Etiqueta / QR N" },
  { type: "item", id: "Project Progress", label: "Project Progress" },
  { type: "item", id: "Painel Referência", label: "Painel Referência" },
];

const menuIconByTab: Partial<Record<AdminTab, string>> = {
  "Materiais & Fabricação": "🪵",
  "Ferragens": "🔩",
  "Component Types": "🧩",
  "Regras": "📏",
  "Configuração de Regras": "⚙️",
  "Perfis de Regras": "📚",
  "CAD Models": "📦",
  "Templates": "🗂️",
  "Gestor de Ficheiros": "🗃️",
  "Deploy": "🧪",
  "System Settings": "🛠️",
  "Etiqueta / QR N": "🏷️",
  "Project Progress": "📈",
  "Painel Referência": "📖",
};

const adminVisibleTabs = new Set<AdminTab>(
  adminMenu.filter((entry): entry is Extract<AdminMenuEntry, { type: "item" }> => entry.type === "item").map((entry) => entry.id)
);

// Módulos planeados (futuro): manter fora do menu até fluxo real.
// Dashboard, Pricing e Users permanecem ocultos por enquanto.
const ADMIN_PLANNED_HIDDEN_MODULES = ["Dashboard", "Pricing", "Users"] as const;
void ADMIN_PLANNED_HIDDEN_MODULES;

export default function AdminPanel() {
  const [active, setActive] = useState<AdminTab>(() => {
    const saved = localStorage.getItem(ADMIN_ACTIVE_TAB_STORAGE_KEY) as AdminTab | null;
    return saved && adminVisibleTabs.has(saved) ? saved : DEFAULT_ADMIN_TAB;
  });

  const setActiveTab = (next: AdminTab) => {
    setActive(next);
    localStorage.setItem(ADMIN_ACTIVE_TAB_STORAGE_KEY, next);
  };

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        height: "100%",
        background: "radial-gradient(circle at top, var(--blue-dark), var(--black) 60%)",
      }}
    >
      <aside
        style={{
          width: 250,
          background: "color-mix(in srgb, var(--navy) 92%, transparent)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: "18px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", marginBottom: 8 }}>
          Admin Panel
        </div>
        {adminMenu.map((entry, index) => {
          if (entry.type === "group") {
            return (
              <div
                key={`group-${entry.label}-${index}`}
                style={{
                  marginTop: index === 0 ? 4 : 10,
                  marginBottom: 4,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: "var(--text-muted)",
                  fontWeight: 700,
                }}
              >
                {entry.label}
              </div>
            );
          }

          const isActive = active === entry.id;
          const isDisabled = entry.disabled === true;
          return (
            <button
              key={entry.id}
              onClick={() => !isDisabled && setActiveTab(entry.id)}
              style={{
                textAlign: "left",
                padding: "9px 10px",
                borderRadius: "var(--radius)",
                border: isActive ? "1px solid rgba(59,130,246,0.45)" : "1px solid rgba(255,255,255,0.08)",
                background: isActive ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.04)",
                color: "var(--text-main)",
                fontSize: 12,
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.4 : 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden>{menuIconByTab[entry.id] ?? "•"}</span>
                <span>{entry.label}</span>
              </span>
              {entry.badge ? (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 999,
                    background: "rgba(245, 158, 11, 0.2)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "var(--text-main)",
                  }}
                >
                  {entry.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </aside>

      <section
        style={{
          flex: 1,
          padding: "20px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius)",
            padding: "20px",
            minHeight: "calc(100vh - 48px)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)", marginBottom: 12 }}>
            {active}
          </div>

          {active === "Materiais & Fabricação" ? (
            <MaterialsManufacturing />
          ) : active === "Ferragens" ? (
            <FerragensAdminPage />
          ) : active === "Templates" ? (
            <TemplatesManager />
          ) : active === "CAD Models" ? (
            <CADModelsManager />
          ) : active === "Regras" ? (
            <RulesManager />
          ) : active === "Configuração de Regras" ? (
            <RulesAdminPage />
          ) : active === "Perfis de Regras" ? (
            <RulesProfilesPage />
          ) : active === "Component Types" ? (
            <ComponentTypesAdminPage />
          ) : active === "Gestor de Ficheiros" ? (
            <FileManager />
          ) : active === "Deploy" ? (
            <DeployAdminPage />
          ) : active === "System Settings" ? (
            <SystemSettingsBase />
          ) : active === "Project Progress" ? (
            <Suspense fallback={<div style={{ fontSize: 12, color: "var(--text-muted)" }}>Carregando…</div>}>
              <ProjectProgress />
            </Suspense>
          ) : active === "Etiqueta / QR N" ? (
            <EtiquetaDesignerPage />
          ) : active === "Painel Referência" ? (
            <Suspense fallback={<div style={{ fontSize: 12, color: "var(--text-muted)" }}>Carregando…</div>}>
              <PainelReferencia />
            </Suspense>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Módulo em construção.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
