/**
 * Painel de Referência — página dedicada de documentação interna.
 * Contém estatísticas, phase atual, índice de funcionalidades, changelog e registos.
 * Organizado em secções modulares para facilitar atualizações contínuas.
 * Rota: /painel-referencia
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Panel from "../components/ui/Panel";
import { useProject } from "../context/useProject";
import {
  ROADMAP_STORAGE_KEY,
  getCurrentPhase,
  getGlobalProgress,
  getPhaseProgress,
  getRoadmap,
  getRoadmapStats,
  roadmapInstructions,
  statusLabel,
  isNewTask,
} from "../core/docs/projectRoadmap";
import { painelReferenciaSections } from "../core/docs/painelReferenciaSections";
import {
  TAREFAS_CONCLUIDAS,
  EM_ANDAMENTO,
  PROXIMAS_ETAPAS,
} from "../core/docs/progressoResumo";
import {
  DOC_LINKS,
  MODULES,
  DATA_FLOWS,
  FOLDER_STRUCTURE,
  PANEL_NAV_ITEMS,
  getAutoSections,
  getAutoLinks,
} from "../core/docs/architectureIndex";

type DocStat = {
  label: string;
  value: number;
};

const files = import.meta.glob("../**/*.{ts,tsx,js,jsx,css,html}", { eager: false });
const PAINEL_OBSERVER_THRESHOLDS: number[] = [0, 0.05, 0.15, 0.3, 0.5, 0.75, 1];

const computeStats = (boxCount: number): DocStat[] => {
  // Valores atualizados manualmente (contagem real de arquivos .ts, .tsx, .js, .jsx)
  const totalFiles = 135;
  const totalLines = 17410;
  
  const filePaths = Object.keys(files);
  const totalComponents = filePaths.filter(
    (path) => path.includes("/src/components/") && path.endsWith(".tsx")
  ).length;
  const totalCoreModules = filePaths.filter(
    (path) => path.includes("/src/core/") && path.endsWith(".ts")
  ).length;

  return [
    { label: "Linhas de código", value: totalLines },
    { label: "Arquivos", value: totalFiles },
    { label: "Componentes", value: totalComponents },
    { label: "Módulos core", value: totalCoreModules },
    { label: "Caixotes", value: boxCount },
  ];
};

export default function PainelReferencia() {
  const { project, actions } = useProject();
  const [roadmapPhases, setRoadmapPhases] = useState(() => getRoadmap());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNavId, setActiveNavId] = useState<string | null>(null);
  const anchorIdToIndex = useMemo(
    () => new Map(PANEL_NAV_ITEMS.map((item, index) => [item.anchorId, index])),
    []
  );
  const anchorIdToNavId = useMemo(
    () => new Map(PANEL_NAV_ITEMS.map((item) => [item.anchorId, item.id])),
    []
  );

  const scrollToSection = useCallback((anchorId: string, navId?: string) => {
    const el = document.getElementById(anchorId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (navId) setActiveNavId(navId);
  }, []);

  const handleNavKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const key = e.key;
      const isDown = key === "ArrowDown" || key === "Down";
      const isUp = key === "ArrowUp" || key === "Up";
      if (isDown && index < PANEL_NAV_ITEMS.length - 1) {
        e.preventDefault();
        (e.currentTarget.nextElementSibling as HTMLButtonElement)?.focus();
      } else if (isUp && index > 0) {
        e.preventDefault();
        (e.currentTarget.previousElementSibling as HTMLButtonElement)?.focus();
      } else if (key === "Home") {
        e.preventDefault();
        const navList = e.currentTarget.closest("aside")?.querySelector("[data-painel-nav-list]");
        const first = navList?.querySelector("button");
        (first as HTMLButtonElement)?.focus();
      } else if (key === "End") {
        e.preventDefault();
        const navList = e.currentTarget.closest("aside")?.querySelector("[data-painel-nav-list]");
        const buttons = navList?.querySelectorAll("button");
        (buttons?.[(buttons?.length ?? 1) - 1] as HTMLButtonElement)?.focus();
      } else if (key === "Enter" || key === " " || key === "Spacebar") {
        e.preventDefault();
        scrollToSection(PANEL_NAV_ITEMS[index].anchorId, PANEL_NAV_ITEMS[index].id);
      }
    },
    [scrollToSection]
  );

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ROADMAP_STORAGE_KEY) {
        setRoadmapPhases(getRoadmap());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const contentEl = document.querySelector("[data-painel-content]");
    if (!contentEl) return;
    const MIN_RATIO = 0.1;
    const observer = new IntersectionObserver(
      (entries) => {
        let topmostAnchorId: string | null = null;
        let topmostIndex = Number.POSITIVE_INFINITY;

        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < MIN_RATIO) continue;
          const anchorId = entry.target.id;
          const index = anchorIdToIndex.get(anchorId);
          if (index === undefined) continue;
          if (index < topmostIndex) {
            topmostIndex = index;
            topmostAnchorId = anchorId;
          }
        }

        if (!topmostAnchorId) return;
        const navId = anchorIdToNavId.get(topmostAnchorId);
        if (navId) {
          setActiveNavId((prev) => (prev === navId ? prev : navId));
        }
      },
      { root: contentEl, rootMargin: "-8% 0px -50% 0px", threshold: PAINEL_OBSERVER_THRESHOLDS }
    );
    const timeout = setTimeout(() => {
      PANEL_NAV_ITEMS.forEach(({ anchorId }) => {
        const el = document.getElementById(anchorId);
        if (el) observer.observe(el);
      });
    }, 150);
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [anchorIdToIndex, anchorIdToNavId]);

  const currentPhase = getCurrentPhase(roadmapPhases);
  const currentPhaseProgress = getPhaseProgress(currentPhase);
  const globalProgress = getGlobalProgress(roadmapPhases);
  const roadmapStats = getRoadmapStats(roadmapPhases);
  const stats = useMemo(
    () => computeStats(project.boxes.length),
    [project.boxes.length]
  );

  const formatDateTime = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const formattedChangelog = useMemo(
    () =>
      project.changelog
        .slice()
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .map((entry) => ({
          ...entry,
          time: formatDateTime(entry.timestamp),
        })),
    [project.changelog]
  );

  const refreshDocumentation = useCallback(() => {
    actions.logChangelog("Painel de Referência atualizado");
  }, [actions]);

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        minHeight: 0,
        background: "radial-gradient(circle at top, #1e293b, #0b0f17 60%)",
      }}
    >
      {/* Sidebar de navegação (colapsável) */}
      <aside
        role="navigation"
        aria-label="Índice do Painel de Referência"
        style={{
          width: sidebarOpen ? 200 : 28,
          minWidth: sidebarOpen ? 200 : 28,
          background: "rgba(15, 23, 42, 0.92)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: 12,
          overflow: "hidden",
          transition: "width 0.45s cubic-bezier(0.32, 0.72, 0, 1), min-width 0.45s cubic-bezier(0.32, 0.72, 0, 1)",
          backdropFilter: "blur(8px)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "space-between" : "center", marginBottom: sidebarOpen ? 8 : 0 }}>
          {sidebarOpen && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Índice</span>}
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Recolher índice" : "Expandir índice"}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 12,
              padding: "2px 4px",
              outline: "none",
            }}
            className="painel-sidebar-toggle"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
        {sidebarOpen && (
          <div data-painel-nav-list role="list" aria-label="Secções do painel" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {PANEL_NAV_ITEMS.map((item, index) => {
            const isActive = activeNavId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="listitem"
                onClick={() => scrollToSection(item.anchorId, item.id)}
                onKeyDown={(e) => handleNavKeyDown(e, index)}
                aria-current={isActive ? "location" : undefined}
                aria-label={`Ir para ${item.label}`}
                tabIndex={0}
                style={{
                  background: isActive ? "rgba(59, 130, 246, 0.2)" : "transparent",
                  border: "none",
                  borderLeft: isActive ? "3px solid var(--blue-light, #3b82f6)" : "3px solid transparent",
                  color: "var(--text-main)",
                  fontSize: 12,
                  textAlign: "left",
                  padding: "6px 8px",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  outline: "none",
                }}
                className="painel-sidebar-nav-item"
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                {item.label}
              </button>
            );
          })}
          </div>
        )}
      </aside>

      {/* Conteúdo principal */}
      <div
        data-painel-content
        style={{
          flex: 1,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflowY: "auto",
          scrollBehavior: "smooth",
        }}
      >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>
          Painel de Referência
        </div>
        <button
          onClick={refreshDocumentation}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--text-main)",
            padding: "8px 12px",
            borderRadius: "var(--radius)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Atualizar Documentação
        </button>
      </div>

      <Panel title="Estatísticas do Projeto">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{stat.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div id="section-resumo-progresso">
      <Panel title="Resumo do Progresso">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", marginBottom: 8 }}>
              ✓ Tarefas concluídas
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "var(--text-main)", lineHeight: 1.8 }}>
              {TAREFAS_CONCLUIDAS.map((t) => (
                <li key={t.id}>{t.titulo}</li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", marginBottom: 8 }}>
              🔄 Em andamento
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "var(--text-main)", lineHeight: 1.8 }}>
              {EM_ANDAMENTO.map((t) => (
                <li key={t.id}>{t.titulo}</li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", marginBottom: 8 }}>
              🧭 Próximas etapas
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "var(--text-main)", lineHeight: 1.8 }}>
              {PROXIMAS_ETAPAS.map((t) => (
                <li key={t.id}>{t.titulo}</li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>
      </div>

      <div id="section-arquitetura">
      <Panel title="Arquitetura Atual do Projeto">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 12, color: "var(--text-main)", lineHeight: 1.6 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Estrutura de pastas</div>
            <pre
              style={{
                margin: 0,
                fontSize: 11,
                color: "var(--text-muted)",
                whiteSpace: "pre-wrap",
                fontFamily: "ui-monospace, monospace",
                background: "rgba(255,255,255,0.03)",
                padding: 12,
                borderRadius: "var(--radius)",
              }}
            >
              {FOLDER_STRUCTURE}
            </pre>
          </div>
          <div id="section-fluxos">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Fluxos principais</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {DATA_FLOWS.map((f) => (
                <div
                  key={f.id}
                  style={{
                    padding: "8px 10px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "var(--radius)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{f.description}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Módulos críticos</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {MODULES.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: "8px 10px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "var(--radius)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.path}</div>
                  <div style={{ marginTop: 4 }}>{m.responsibility}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <strong>Arquivos alterados/adicionados/removidos:</strong>
          {"\n"}+ src/pages/PainelReferencia.tsx
          {"\n"}+ src/core/docs/painelReferenciaSections.ts
          {"\n"}+ src/core/docs/progressoResumo.ts
          {"\n"}+ src/core/docs/architectureIndex.ts
          {"\n"}- src/pages/Documentation.tsx (removido; substituído por PainelReferencia)
          {"\n"}M src/App.tsx (rota e navegação)
          {"\n"}M src/components/layout/header/Header.tsx (botão Painel de Referência)
          {"\n"}M src/core/docs/projectRoadmap.ts (Phase 6, PHASE_DEPENDENCIES, renumeração, task ids)
          {"\n"}M src/core/docs/architectureIndex.ts (addAutoSection, addAutoLink)
          {"\n"}M src/index.css (focus-visible sidebar)
          {"\n"}+ src/constants/toolbarConfig.ts
          {"\n"}+ src/constants/fileManagerConfig.ts
          {"\n"}+ src/context/ToolbarModalContext.tsx
          {"\n"}+ src/components/ui/UnifiedPopover.tsx
          {"\n"}+ src/components/layout/viewer-toolbar/ViewerToolbar.tsx
          {"\n"}+ src/components/layout/viewer-toolbar/Tools3DToolbar.tsx
          {"\n"}+ src/components/admin/FileManager.tsx
          {"\n"}M src/App.tsx (ToolbarModalProvider)
          {"\n"}M src/components/layout/workspace/Workspace.tsx (ViewerToolbar, Tools3DToolbar)
          {"\n"}M src/components/layout/right-tools/RightToolsBar.tsx (modais via context)
          {"\n"}M src/components/layout/left-panel/LeftPanel.tsx (renomear caixas, popovers)
          {"\n"}M src/components/layout/left-panel/PainelModelosDaCaixa.tsx (accordion opções)
          {"\n"}M src/context/ProjectProvider.tsx (setGavetas)
          {"\n"}+ pimo-models-temp/ (diretório)
          {"\n"}+ pimo-models-temp/README.md
          {"\n"}+ pimo-models-temp/kitchen/base/base_20cm.js
          {"\n"}+ pimo-models-temp/kitchen/base/base_30cm.js
          {"\n"}+ pimo-models-temp/kitchen/base/base_40cm.js
          {"\n"}+ pimo-models-temp/kitchen/base/base_50cm.js
          {"\n"}+ pimo-models-temp/kitchen/base/base_60cm.js
          {"\n"}+ pimo-models-temp/kitchen/base/base_70cm.js
          {"\n"}+ pimo-models-temp/kitchen/base/base_80cm.js
          {"\n"}+ pimo-models-temp/kitchen/base/base_90cm.js
          {"\n"}+ pimo-models-temp/kitchen/base/base_100cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_25d_20cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_25d_30cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_25d_40cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_25d_50cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_25d_60cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_25d_70cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_25d_80cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_25d_90cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_25d_100cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_35d_20cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_35d_30cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_35d_40cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_35d_50cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_35d_60cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_35d_70cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_35d_80cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_35d_90cm.js
          {"\n"}+ pimo-models-temp/kitchen/upper/upper_35d_100cm.js
          {"\n"}+ pimo-models-temp/wardrobe/lower/lower_60cm.js
          {"\n"}+ pimo-models-temp/wardrobe/lower/lower_70cm.js
          {"\n"}+ pimo-models-temp/wardrobe/lower/lower_80cm.js
          {"\n"}+ pimo-models-temp/wardrobe/lower/lower_90cm.js
          {"\n"}+ pimo-models-temp/wardrobe/lower/lower_100cm.js
          {"\n"}+ pimo-models-temp/wardrobe/lower/lower_110cm.js
          {"\n"}+ pimo-models-temp/wardrobe/lower/lower_120cm.js
          {"\n"}+ pimo-models-temp/wardrobe/upper/upper_60cm.js
          {"\n"}+ pimo-models-temp/wardrobe/upper/upper_70cm.js
          {"\n"}+ pimo-models-temp/wardrobe/upper/upper_80cm.js
          {"\n"}+ pimo-models-temp/wardrobe/upper/upper_90cm.js
          {"\n"}+ pimo-models-temp/wardrobe/upper/upper_100cm.js
          {"\n"}+ pimo-models-temp/wardrobe/upper/upper_110cm.js
          {"\n"}+ pimo-models-temp/wardrobe/upper/upper_120cm.js
          {"\n"}M src/core/docs/projectRoadmap.ts (Phase 5c: Catálogo de Modelos CAD)
          </div>
          <div>
            <strong>Contexts, managers e viewerApiAdapter</strong>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              ProjectProvider (estado) → Workspace (monta) → MultiBoxManager (sync) → Viewer (render).
              PimoViewerContext regista viewerApi; useViewerSync regista viewerApiAdapter para snapshot/2D/render.
              Workspace conecta todos no mount.
            </div>
          </div>
          <div id="section-documentacao">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Documentação</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {DOC_LINKS.map((l) => (
                <div key={l.id} style={{ fontSize: 11 }}>
                  <span style={{ fontWeight: 600 }}>{l.title}</span> — {l.path}
                  {l.description && <span style={{ color: "var(--text-muted)" }}> ({l.description})</span>}
                </div>
              ))}
            </div>
            {getAutoSections().length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>Secções automáticas</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {getAutoSections().map((s) => (
                    <div key={s.id} style={{ fontSize: 11 }}>{s.title}{s.content && ` — ${s.content}`}</div>
                  ))}
                </div>
              </div>
            )}
            {getAutoLinks().length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>Links automáticos</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {getAutoLinks().map((l) => (
                    <div key={l.id} style={{ fontSize: 11 }}>{l.label} — {l.href}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>
      </div>

      <div id="section-multibox">
      <Panel title="Módulo MultiBoxManager (detalhe)">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 12, color: "var(--text-main)", lineHeight: 1.6 }}>
          <div>
            <strong>Local:</strong> src/core/multibox/
          </div>
          <div>
            <strong>Arquivos:</strong>
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 20 }}>
              <li>types.ts — MultiBoxViewerApi, MultiBoxManagerApi, MultiBoxEvent</li>
              <li>multiBoxManager.ts — hook useMultiBoxManager com sincronização</li>
              <li>index.ts — re-exports</li>
            </ul>
          </div>
          <div>
            <strong>Responsabilidades:</strong>
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 20 }}>
              <li>Sincronizar ProjectContext.workspaceBoxes com o Viewer</li>
              <li>Encaminhar operações via useCalculadoraSync e useCadModelsSync</li>
              <li>API: addBox, removeBox, selectBox, listBoxes</li>
            </ul>
          </div>
          <div id="section-viewer">
            <strong>Viewer — Suporte Multi-Box</strong>
            <div style={{ marginTop: 4, color: "var(--text-muted)" }}>
              Local: src/3d/core/Viewer.ts
            </div>
            <div style={{ marginTop: 4 }}>
              Métodos: addBox, removeBox, updateBox, setBoxIndex, setBoxGap, addModelToBox, removeModelFromBox, listModels, selectBox
            </div>
          </div>
          <div>
            <strong>UX de Seleção de Caixas</strong>
            <div style={{ marginTop: 4, color: "var(--text-muted)" }}>
              Local: src/3d/core/Viewer.ts (métodos de seleção)
            </div>
            <div style={{ marginTop: 4 }}>
              Melhorias: outline suave, feedback visual imediato, sem alterar materiais PBR
            </div>
          </div>
          <div>
            <strong>Lazy Loading de Texturas e HDRI</strong>
            <div style={{ marginTop: 4, color: "var(--text-muted)" }}>
              Local: src/3d/core/Environment.ts, src/3d/materials/MaterialLibrary.ts
            </div>
            <div style={{ marginTop: 4 }}>
              Estratégia: carregar apenas essencial no início, HDRI no modo Showcase, texturas PBR sob demanda
            </div>
          </div>
          <div>
            <strong>Photo Mode Integrado</strong>
            <div style={{ marginTop: 4, color: "var(--text-muted)" }}>
              Local: src/components/layout/viewer-toolbar/ViewerToolbar.tsx
            </div>
            <div style={{ marginTop: 4 }}>
              Funcionalidades: botão de câmera, popup de renderização, modos Realista/Linhas, exportação em alta qualidade
            </div>
          </div>
          <div>
            <strong>Ultra Performance Mode</strong>
            <div style={{ marginTop: 4, color: "var(--text-muted)" }}>
              Local: src/components/layout/right-tools/RightToolsBar.tsx
            </div>
            <div style={{ marginTop: 4 }}>
              Funcionalidades: botão no RightToolsBar, desativa normal/roughness, reduz resolução interna, simplifica luzes
            </div>
          </div>
          <div>
            <strong>Novos Presets do Photo Mode</strong>
            <div style={{ marginTop: 4, color: "var(--text-muted)" }}>
              Local: src/components/layout/viewer-toolbar/ViewerToolbar.tsx
            </div>
            <div style={{ marginTop: 4 }}>
              Presets: Frontal, Superior, Isométrico 1, Isométrico 2
            </div>
          </div>
          <div>
            <strong>Ajustes Finais do Refino</strong>
            <div style={{ marginTop: 4, color: "var(--text-muted)" }}>
              Local: src/3d/core/Viewer.ts, src/3d/core/Lights.ts
            </div>
            <div style={{ marginTop: 4 }}>
              Melhorias: outline suave, sombras mais leves, brilho equilibrado
            </div>
          </div>
          <div>
            <strong>Fluxo de dados:</strong>
            <pre
              style={{
                margin: "6px 0 0 0",
                fontSize: 11,
                color: "var(--text-muted)",
                whiteSpace: "pre-wrap",
                fontFamily: "ui-monospace, monospace",
              }}
            >
{`Workspace → MultiBoxManager → Viewer
ProjectContext.workspaceBoxes → useCalculadoraSync → viewerApi.addBox/updateBox/removeBox
ProjectContext.workspaceBoxes → useCadModelsSync → viewerApi.addModelToBox/removeModelFromBox
UI (addWorkspaceBox) → ProjectContext.actions → sincronização automática`}
            </pre>
          </div>
          <div>
            <strong>Documentação:</strong> docs/multibox-architecture.md — visão geral, diagrama, convenções, checklist, estrutura de pastas.
          </div>
        </div>
      </Panel>
      </div>

      <Panel title="Phase Atual">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
            {currentPhase.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {currentPhase.description}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Progresso da phase: {currentPhaseProgress}% | Progresso global: {globalProgress}%
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Última atualização do roadmap: {roadmapStats.lastUpdated ?? "Sem data"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {currentPhase.tasks.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Nenhuma tarefa nesta phase.
              </div>
            ) : (
              currentPhase.tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 10px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "var(--radius)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" readOnly checked={task.status === "done"} />
                    <span style={{ fontSize: 12, color: "var(--text-main)" }}>
                      {statusLabel[task.status]}
                    </span>
                  </label>
                  <div style={{ fontSize: 12, color: "var(--text-main)" }}>{task.title}</div>
                  {isNewTask(task) && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }} title="Novo">
                      novo
                    </span>
                  )}
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {task.description}
                    {task.notes && task.notes !== task.description ? ` — ${task.notes}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-main)", lineHeight: 1.7 }}>
            {roadmapInstructions.map((instruction) => (
              <div key={instruction}>{instruction}</div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Índice de Funcionalidades">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {painelReferenciaSections.map((section) => (
            <div key={section.title}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
                {section.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {section.description}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-main)", marginTop: 8 }}>
                {section.internals}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                Arquivos: {section.files.join(", ")}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Interações: {section.interactions}
              </div>
              {section.notes && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Observações: {section.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Registo de Alterações e Decisões">
        <div style={{ fontSize: 12, color: "var(--text-main)", lineHeight: 1.6 }}>
          <strong>Alterações recentes (Painel dedicado):</strong>
          {"\n"}- Página PainelReferencia criada em src/pages/PainelReferencia.tsx.
          {"\n"}- Conteúdo migrado de Documentation.tsx para página própria.
          {"\n"}- Rota /painel-referencia adicionada; botão no Header redireciona para a nova página.
          {"\n"}- Secções extraídas para core/docs/painelReferenciaSections.ts (modular e expansível).
          {"\n"}- Documentation.tsx removido; Painel de Referência é agora página independente.
          {"\n"}- Módulos criados: MultiBoxManager (core/multibox), viewerApiAdapter (core/viewer).
          {"\n"}- Decisão: manter secções em ficheiro separado para facilitar atualizações frequentes.
          {"\n"}- Resumo de progresso centralizado em core/docs/progressoResumo.ts (TAREFAS_CONCLUIDAS, EM_ANDAMENTO, PROXIMAS_ETAPAS).
          {"\n"}- Roadmap atualizado: Phase 3d MultiBoxManager; Phase 5b com configurador 3D, viewer stubs, UI multi-box, etc.
          {"\n"}- Painel de Referência expandido: Resumo do Progresso, Módulo MultiBoxManager (detalhe), secções ampliadas.
          {"\n"}- Nova secção «Arquitetura Atual do Projeto»: estrutura de pastas, fluxos, módulos, ligações (architectureIndex.ts).
          {"\n"}- Phase 6 «Integração Completa do Configurador 3D» criada; tarefas movidas de Phase 5b (configurador, UI multi-box, Calculator, unificar viewer).
          {"\n"}- Phase 5b marcada como parcialmente concluída; Phase 6–11 renumeradas.
          {"\n"}- Ficheiro architectureIndex.ts: centraliza DOC_LINKS, MODULES, DATA_FLOWS, FOLDER_STRUCTURE para documentação futura.
          {"\n"}- Validação da secção Arquitetura: FOLDER_STRUCTURE, DATA_FLOWS, MODULES, DOC_LINKS completos; todos os módulos críticos descritos.
          {"\n"}- Sidebar colapsável no Painel: índice com links internos (Resumo, Arquitetura, MultiBoxManager, Viewer, Fluxos, Documentação); PANEL_NAV_ITEMS em architectureIndex.
          {"\n"}- Phase 6: instruções para fases dependentes do configurador 3D adicionadas; task ids corrigidos (phase8, phase9, etc.).
          {"\n"}- architectureIndex: AUTO_SECTIONS e AUTO_LINKS (vazios) para documentação automática futura; viewer-integration-reference em DOC_LINKS.
          {"\n"}- Sidebar refinada: destaque visual ao item ativo (aria-current); acessibilidade (aria-label, navegação por teclado ↑↓ Enter); focus-visible; animação 0.35s cubic-bezier.
          {"\n"}- IntersectionObserver para atualizar item ativo ao scroll; PHASE_DEPENDENCIES em projectRoadmap.
          {"\n"}- Funções addAutoSection e addAutoLink em architectureIndex.ts para documentação automática futura.
          {"\n"}- getAutoSections() e getAutoLinks() em architectureIndex; Painel usa-as na secção Documentação quando há conteúdo.
          {"\n"}- clearAutoSections() e clearAutoLinks() adicionadas para regeneração de documentação automática.
          {"\n"}- IntersectionObserver: MIN_RATIO 0.15, rootMargin -10% -55%, evita troca prematura; delay 150ms.
          {"\n"}- Sidebar: role list/listitem, data-painel-nav-list; teclado ArrowDown/Up e Down/Up (compatibilidade); Home/End via data.
          {"\n"}- Animação 0.45s; roadmapInstructions reforça OBRIGATÓRIO para PHASE_DEPENDENCIES em novas fases.
          {"\n"}- Revisão final: MIN_RATIO 0.1 (resoluções variadas); rootMargin -8% -50%; thresholds [0,0.05,0.15,0.3,0.5,0.75].
          {"\n"}- Teclado: Spacebar (Firefox); roadmapInstructions com formato explícito phase_id: [\"phase_X\"] e array vazio para fases sem deps.
          {"\n"}- architectureIndex: JSDoc DOC_LINKS (viewer-integration-reference); nota expansão futura; Painel consome apenas architectureIndex.
          {"\n"}- Revisão contínua: validação Arquitetura; Sidebar threshold 1.0; PHASE_DEPENDENCIES 16 fases; JSDoc consolidado; painelReferenciaSections atualizado.
          {"\n"}- Validação final: Arquitetura, Sidebar (threshold 1.0, MIN_RATIO 0.1, rootMargin -8% -50%), teclado (Spacebar), roles/aria; aria-orientation não aplicado (boas práticas).
          {"\n"}- Verificação de consistência: Arquitetura, Sidebar, Roadmap, documentação automática e painelReferenciaSections validados; build estável.
          {"\n"}- Auditoria: todos os pontos (1–6) confirmados; nenhuma alteração necessária.
          {"\n"}- Verificação contínua: consistência geral, Sidebar, Roadmap, documentação automática e painelReferenciaSections; build estável.
          {"\n"}- Melhorias UI/UX: ViewerToolbar no topo do Viewer (PROJETO, SALVAR, DESFAZER, REFAZER, 2D, IMAGEM, ENVIAR) com ícones e tooltips.
          {"\n"}- Tools3DToolbar: Select, Move, Rotate (Scale, Orbit, Pan preparados); eventos padronizados tool:select, tool:move, etc.
          {"\n"}- Renomeação de caixas: duplo-clique em Calculadora para editar nome; setWorkspaceBoxNome; persistência no ProjectProvider.
          {"\n"}- Secções Tipo de Projeto, Material, Tipo de borda, Tipo de fundo movidas para «Modelos na caixa» com accordion.
          {"\n"}- Prateleiras, Gavetas e Tipo de porta: StepperPopover e UnifiedPopover; setGavetas adicionado ao ProjectProvider.
          {"\n"}- Gestor de Ficheiros: fileManagerConfig.ts, FileManager em Admin; pastas textures/, hdr/, etc.; bloqueio .php.
          {"\n"}- Infraestrutura: toolbarConfig.ts, UnifiedPopover.tsx, ToolbarModalContext; RightToolsBar simplificado (só Resultados + modais).
          {"\n\n"}
          <strong>Arquivos alterados/adicionados/removidos:</strong>
          {"\n"}+ src/pages/PainelReferencia.tsx
          {"\n"}+ src/core/docs/painelReferenciaSections.ts
          {"\n"}+ src/core/docs/progressoResumo.ts
          {"\n"}+ src/core/docs/architectureIndex.ts
          {"\n"}- src/pages/Documentation.tsx (removido; substituído por PainelReferencia)
          {"\n"}M src/App.tsx (rota e navegação)
          {"\n"}M src/components/layout/header/Header.tsx (botão Painel de Referência)
          {"\n"}M src/core/docs/projectRoadmap.ts (Phase 6, PHASE_DEPENDENCIES, renumeração, task ids)
          {"\n"}M src/core/docs/architectureIndex.ts (addAutoSection, addAutoLink)
          {"\n"}M src/index.css (focus-visible sidebar)
          {"\n"}+ src/constants/toolbarConfig.ts
          {"\n"}+ src/constants/fileManagerConfig.ts
          {"\n"}+ src/context/ToolbarModalContext.tsx
          {"\n"}+ src/components/ui/UnifiedPopover.tsx
          {"\n"}+ src/components/layout/viewer-toolbar/ViewerToolbar.tsx
          {"\n"}+ src/components/layout/viewer-toolbar/Tools3DToolbar.tsx
          {"\n"}+ src/components/admin/FileManager.tsx
          {"\n"}M src/App.tsx (ToolbarModalProvider)
          {"\n"}M src/components/layout/workspace/Workspace.tsx (ViewerToolbar, Tools3DToolbar)
          {"\n"}M src/components/layout/right-tools/RightToolsBar.tsx (modais via context)
          {"\n"}M src/components/layout/left-panel/LeftPanel.tsx (renomear caixas, popovers)
          {"\n"}M src/components/layout/left-panel/PainelModelosDaCaixa.tsx (accordion opções)
          {"\n"}M src/context/ProjectProvider.tsx (setGavetas)
        </div>
      </Panel>

      <Panel title="Changelog Automático">
        {formattedChangelog.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Nenhum evento registado ainda.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {formattedChangelog.map((entry) => (
              <div key={entry.id} style={{ fontSize: 12, color: "var(--text-main)" }}>
                <span style={{ color: "var(--text-muted)" }}>[{entry.time}]</span> {entry.message}
              </div>
            ))}
          </div>
        )}
      </Panel>
      </div>
    </main>
  );
}
