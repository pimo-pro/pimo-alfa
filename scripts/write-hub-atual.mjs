/**
 * Fase 11 — core/docs/atual + HubAtualContent (UTF-8 via \\u).
 */
import fs from "node:fs";
import path from "node:path";

const u = (...c) => String.fromCodePoint(...c);
const em = u(0x2014);
const Atual = "Atual";
const Secao = "Sec" + u(0xe7) + u(0xe3) + "o";
const concluida = "conclu" + u(0xed) + "da";
const Estatisticas = "Estat" + u(0xed) + "sticas";

function w(rel, text) {
  const abs = path.resolve(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, "utf8");
}

w(
  "src/core/docs/atual/atualTypes.ts",
  `/**
 * Tipos do hub ${em} ${Secao} ${Atual} / Estado do Sistema (Fase 11).
 */

import type { HubStatCard } from "@/pages/documentacao/loadHubStats";
import type { PlaneamentoEntry, PlaneamentoStage } from "../planeamento/planeamentoTypes";

export type AtualAlertLevel = "info" | "warn" | "critical";

export type AtualAlert = {
  id: string;
  level: AtualAlertLevel;
  title: string;
  detail: string;
};

export type AtualKpi = HubStatCard;

export type AtualPhaseSummary = {
  stage: PlaneamentoStage;
  label: string;
  count: number;
  items: Array<{ id: string; title: string; summary: string }>;
};

export type AtualResumo = {
  faseAtual: AtualPhaseSummary;
  proximaFase: AtualPhaseSummary;
  ultimaConcluida: AtualPhaseSummary;
  bloqueadas: AtualPhaseSummary;
  dependencias: AtualPhaseSummary;
  roadmapProgress: number;
  currentPhaseTitle: string | null;
  progressoCompletionPercent: number;
};

export type AtualHistoricoItem = {
  id: string;
  title: string;
  kind: string;
};

/** Alterações async preenchidas no UI via loaders existentes (sem fetch no loader atual). */
export type AtualRecentChange = {
  id: string;
  source: "novidades" | "removidos" | "historico";
  title: string;
  meta?: string;
};

export type AtualSnapshot = {
  generatedAtLabel: string;
  sourceLabel: string;
  kpis: AtualKpi[];
  resumo: AtualResumo;
  historicoRecent: AtualHistoricoItem[];
  alerts: AtualAlert[];
  /** Etapas brutas usadas para cruzamento (planeamento). */
  planeamentoEtapas: PlaneamentoEntry[];
};
`
);

w(
  "src/core/docs/atual/atualSnapshot.ts",
  `/**
 * Snapshot ${Atual} ${em} estado do sistema no momento (agrega SSOTs existentes).
 * Sem fetch. N${u(0xe3)}o altera loaders de progresso/planeamento/stats/archive.
 */

import { loadHubStats } from "@/pages/documentacao/loadHubStats";
import { loadHubProgresso } from "../progresso/loadHubProgresso";
import { loadHubPlaneamento } from "../planeamento/loadHubPlaneamento";
import { loadHistoricoArchive } from "../archive/loadHistoricoArchive";
import type { PlaneamentoEntry, PlaneamentoStage } from "../planeamento/planeamentoTypes";
import type {
  AtualAlert,
  AtualPhaseSummary,
  AtualSnapshot,
} from "./atualTypes";

const STAGE_LABEL: Record<PlaneamentoStage, string> = {
  futura: "Pr${u(0xf3)}xima / futura",
  em_andamento: "Fase atual (em andamento)",
  "${concluida}": "${u(0xda)}ltima conclu${u(0xed)}da",
  bloqueada: "Bloqueadas",
  dependente: "Depend${u(0xea)}ncias",
};

function norm(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function overlap(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = new Set(na.split(" ").filter((w) => w.length > 4));
  const wb = nb.split(" ").filter((w) => w.length > 4);
  let hit = 0;
  for (const w of wb) if (wa.has(w)) hit += 1;
  return hit >= 2;
}

function toPhaseSummary(
  stage: PlaneamentoStage,
  items: PlaneamentoEntry[],
  limit = 8
): AtualPhaseSummary {
  return {
    stage,
    label: STAGE_LABEL[stage],
    count: items.length,
    items: items.slice(0, limit).map((e) => ({
      id: e.id,
      title: e.title,
      summary: e.summary,
    })),
  };
}

function buildAlerts(
  stages: Record<PlaneamentoStage, PlaneamentoEntry[]>,
  progressoEmAndamento: Array<{ id: string; titulo: string }>,
  progressoProximas: Array<{ id: string; titulo: string }>,
  roadmapProgress: number,
  progressoRoadmapProgress: number
): AtualAlert[] {
  const alerts: AtualAlert[] = [];

  if (stages.bloqueada.length > 0) {
    alerts.push({
      id: "alert-bloqueada",
      level: "warn",
      title: "Fase(s) bloqueada(s)",
      detail: \`Existem \${stages.bloqueada.length} etapa(s) bloqueada(s) no planeamento (ex.: \${stages.bloqueada[0].title}).\`,
    });
  }

  if (stages.dependente.length > 0) {
    alerts.push({
      id: "alert-dependente",
      level: "warn",
      title: "Depend${u(0xea)}ncia(s) n${u(0xe3)}o resolvida(s)",
      detail: \`Existem \${stages.dependente.length} depend${u(0xea)}ncia(s) pendente(s) (ex.: \${stages.dependente[0].title}).\`,
    });
  }

  const missingAndamento = progressoEmAndamento.filter(
    (p) => !stages.em_andamento.some((e) => overlap(e.title, p.titulo))
  );
  const missingFutura = progressoProximas.filter(
    (p) => !stages.futura.some((e) => overlap(e.title, p.titulo))
  );

  if (missingAndamento.length > 0 || missingFutura.length > 0) {
    alerts.push({
      id: "alert-inconsistencia",
      level: "critical",
      title: "Inconsist${u(0xea)}ncia progresso ${u(0xd7)} planeamento",
      detail: [
        missingAndamento.length
          ? \`Em andamento sem espelho no planeamento: \${missingAndamento.length}\`
          : null,
        missingFutura.length
          ? \`Pr${u(0xf3)}ximas sem espelho no planeamento: \${missingFutura.length}\`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  if (Math.abs(roadmapProgress - progressoRoadmapProgress) > 0) {
    alerts.push({
      id: "alert-roadmap-drift",
      level: "info",
      title: "Drift de progresso do roadmap",
      detail: \`Planeamento \${roadmapProgress}% vs Progresso \${progressoRoadmapProgress}%.\`,
    });
  }

  return alerts;
}

/** Constr${u(0xf3)}i o snapshot atual a partir dos SSOTs do Hub. */
export function buildAtualSnapshot(): AtualSnapshot {
  const stats = loadHubStats();
  const progresso = loadHubProgresso();
  const planeamento = loadHubPlaneamento();
  const historico = loadHistoricoArchive();

  const stages = planeamento.stages;

  return {
    generatedAtLabel: new Date().toLocaleString("pt-PT", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    sourceLabel: \`\${stats.sourceLabel} · progresso · planeamento · archive\`,
    kpis: stats.cards,
    resumo: {
      faseAtual: toPhaseSummary("em_andamento", stages.em_andamento),
      proximaFase: toPhaseSummary("futura", stages.futura),
      ultimaConcluida: toPhaseSummary("${concluida}", stages["${concluida}"]),
      bloqueadas: toPhaseSummary("bloqueada", stages.bloqueada),
      dependencias: toPhaseSummary("dependente", stages.dependente),
      roadmapProgress: planeamento.roadmapProgress,
      currentPhaseTitle: progresso.roadmap.currentPhaseTitle,
      progressoCompletionPercent: progresso.counters.completionPercent,
    },
    historicoRecent: historico.slice(0, 5).map((h) => ({
      id: h.id,
      title: h.title,
      kind: h.kind,
    })),
    alerts: buildAlerts(
      stages,
      progresso.emAndamento,
      progresso.proximas,
      planeamento.roadmapProgress,
      progresso.roadmap.progress
    ),
    planeamentoEtapas: planeamento.etapas,
  };
}
`
);

w(
  "src/core/docs/atual/loadHubAtual.ts",
  `/**
 * Loader local da ${Secao} ${Atual} (Estado do Sistema) ${em} sem fetch.
 */

import { buildAtualSnapshot } from "./atualSnapshot";
import type { AtualSnapshot } from "./atualTypes";

export function loadHubAtual(): AtualSnapshot {
  return buildAtualSnapshot();
}
`
);

w(
  "src/core/docs/atual/index.ts",
  `/**
 * ${Secao} ${Atual} ${em} barrel (Fase 11).
 */

export type {
  AtualAlertLevel,
  AtualAlert,
  AtualKpi,
  AtualPhaseSummary,
  AtualResumo,
  AtualHistoricoItem,
  AtualRecentChange,
  AtualSnapshot,
} from "./atualTypes";

export { buildAtualSnapshot } from "./atualSnapshot";
export { loadHubAtual } from "./loadHubAtual";
`
);

// --- HubAtualContent ---
w(
  "src/pages/documentacao/HubAtualContent.tsx",
  `/**
 * ${Secao} ${Atual} (Estado do Sistema) ${em} loadHubAtual + loaders existentes para recentes.
 */

import { useEffect, useMemo, useState } from "react";
import {
  loadHubAtual,
  type AtualAlert,
  type AtualKpi,
  type AtualPhaseSummary,
  type AtualRecentChange,
} from "@/core/docs/atual";
import type { HubStatIcon, HubStatTone } from "./loadHubStats";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";
import { loadHubWhatsNew, type WhatsNewEntry } from "./loadHubWhatsNew";
import {
  loadRemovedRegistry,
  type RemovedRegistryEntry,
} from "./loadRemovedRegistry";

const UP_GREEN = "var(--status-done-color, var(--ci-success, #22c55e))";

const TONE: Record<HubStatTone, { icon: string; chipBd: string; chipBg: string }> = {
  neutral: { icon: C.muted, chipBd: C.border, chipBg: "transparent" },
  blue: { icon: C.accent, chipBd: C.accentBd, chipBg: C.accentBg },
  green: {
    icon: UP_GREEN,
    chipBd: "color-mix(in srgb, var(--status-done-color, var(--ci-success, #22c55e)) 35%, transparent)",
    chipBg: "color-mix(in srgb, var(--status-done-color, var(--ci-success, #22c55e)) 12%, transparent)",
  },
};

const ALERT_COLOR: Record<AtualAlert["level"], string> = {
  info: C.accent,
  warn: "var(--status-progress-color, var(--ci-sienna-400, #f59e0b))",
  critical: "var(--ci-sienna-500, #ef4444)",
};

export default function HubAtualContent() {
  const snapshot = useMemo(() => loadHubAtual(), []);
  const [recent, setRecent] = useState<AtualRecentChange[]>(() =>
    snapshot.historicoRecent.map((h) => ({
      id: h.id,
      source: "historico" as const,
      title: h.title,
      meta: h.kind,
    }))
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadHubWhatsNew("adicionados").catch(() => [] as WhatsNewEntry[]),
      loadHubWhatsNew("logs").catch(() => [] as WhatsNewEntry[]),
      loadRemovedRegistry().catch(() => [] as RemovedRegistryEntry[]),
    ]).then(([features, logs, removed]) => {
      if (cancelled) return;
      const news = [...features, ...logs]
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .slice(0, 5)
        .map((n) => ({
          id: \`news-\${n.version}-\${n.publishedAt}\`,
          source: "novidades" as const,
          title: n.title,
          meta: \`\${n.version} · \${n.type}\`,
        }));
      const rem = removed.slice(0, 5).map((r) => ({
        id: \`rem-\${r.id}\`,
        source: "removidos" as const,
        title: r.title,
        meta: r.removedIn,
      }));
      const hist = snapshot.historicoRecent.map((h) => ({
        id: h.id,
        source: "historico" as const,
        title: h.title,
        meta: h.kind,
      }));
      setRecent([...news, ...rem, ...hist].slice(0, 15));
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot.historicoRecent]);

  return (
    <div data-hub-atual style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        Estado do sistema ${em} snapshot local ({snapshot.generatedAtLabel}). {snapshot.sourceLabel}.
      </p>

      <div
        className="hub-atual-kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 10,
          width: "100%",
        }}
      >
        {snapshot.kpis.map((kpi) => (
          <KpiCard key={kpi.id} card={kpi} />
        ))}
      </div>

      <EditorialBlock
        title="Fases (progresso + planeamento)"
        subtitle={
          snapshot.resumo.currentPhaseTitle
            ? \`Roadmap \${snapshot.resumo.roadmapProgress}% · Phase: \${snapshot.resumo.currentPhaseTitle} · Conclus${u(0xe3)}o sec${u(0xe7)}${u(0xf5)}es \${snapshot.resumo.progressoCompletionPercent}%\`
            : \`Roadmap \${snapshot.resumo.roadmapProgress}% · Conclus${u(0xe3)}o sec${u(0xe7)}${u(0xf5)}es \${snapshot.resumo.progressoCompletionPercent}%\`
        }
      >
        <div
          className="hub-atual-phase-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 10,
            width: "100%",
          }}
        >
          <PhaseCard summary={snapshot.resumo.faseAtual} href="#planeamento" />
          <PhaseCard summary={snapshot.resumo.proximaFase} href="#planeamento" />
          <PhaseCard summary={snapshot.resumo.ultimaConcluida} href="#progresso" />
          <PhaseCard summary={snapshot.resumo.bloqueadas} href="#planeamento" />
          <PhaseCard summary={snapshot.resumo.dependencias} href="#planeamento" />
        </div>
      </EditorialBlock>

      <EditorialBlock title="Alertas" subtitle={\`\${snapshot.alerts.length} ativo(s)\`}>
        {snapshot.alerts.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Sem alertas neste momento.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {snapshot.alerts.map((a) => (
              <li key={a.id} style={{ fontSize: 12, color: C.text, lineHeight: 1.45 }}>
                <span style={{ fontWeight: 700, color: ALERT_COLOR[a.level] }}>[{a.level}]</span>{" "}
                {a.title}
                <div style={{ color: C.muted }}>{a.detail}</div>
              </li>
            ))}
          </ul>
        )}
      </EditorialBlock>

      <EditorialBlock title="${u(0xda)}ltimas altera${u(0xe7)}${u(0xf5)}es" subtitle="novidades · removidos · hist${u(0xf3)}rico">
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {recent.map((r) => (
            <li key={r.id} style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
              <span style={{ color: C.accent, fontWeight: 600 }}>{r.source}</span>
              {" · "}
              {r.title}
              {r.meta ? <span style={{ color: C.muted }}> · {r.meta}</span> : null}
            </li>
          ))}
        </ul>
      </EditorialBlock>

      <style>{\`
        @media (max-width: 820px) {
          .hub-atual-kpi-grid,
          .hub-atual-phase-grid {
            grid-template-columns: 1fr !important;
          }
        }
      \`}</style>
    </div>
  );
}

function EditorialBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: \`1px solid \${C.border}\`,
        background: C.bg,
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>{title}</h3>
        {subtitle ? (
          <p style={{ margin: "4px 0 0", fontSize: 11, color: C.muted }}>{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PhaseCard({ summary, href }: { summary: AtualPhaseSummary; href: string }) {
  return (
    <article
      style={{
        padding: "12px 12px",
        borderRadius: 8,
        border: \`1px solid \${C.border}\`,
        background: C.surface,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 12, color: C.text }}>{summary.label}</strong>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.accent }}>{summary.count}</span>
      </div>
      <ul style={{ margin: "8px 0 0", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
        {summary.items.length === 0 ? (
          <li style={{ fontSize: 11, color: C.muted }}>Sem itens</li>
        ) : (
          summary.items.slice(0, 4).map((it) => (
            <li key={it.id} style={{ fontSize: 11, color: C.muted, lineHeight: 1.35 }}>
              {it.title.slice(0, 72)}
            </li>
          ))
        )}
      </ul>
      <a href={href} style={{ marginTop: 8, display: "inline-block", fontSize: 11, color: C.accent }}>
        Abrir {href.replace("#", "")}
      </a>
    </article>
  );
}

function KpiCard({ card }: { card: AtualKpi }) {
  const tone = TONE[card.tone];
  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 14px 12px",
        borderRadius: 10,
        border: \`1px solid \${C.border}\`,
        background: C.surface,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: \`1px solid \${tone.chipBd}\`,
            background: tone.chipBg,
            color: tone.icon,
          }}
        >
          <StatIcon name={card.icon} />
        </span>
        {card.delta && card.delta.direction === "up" ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: UP_GREEN }}>
            ${u(0x2191)} {card.delta.percentLabel}
          </span>
        ) : null}
      </div>
      <div>
        <div
          style={{
            fontSize: "clamp(1.25rem, 2.4vw, 1.55rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: C.text,
            lineHeight: 1.15,
          }}
        >
          {card.value}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: C.text }}>{card.label}</div>
        {card.hint ? (
          <div style={{ marginTop: 2, fontSize: 11, color: C.muted }}>{card.hint}</div>
        ) : null}
      </div>
    </article>
  );
}

function StatIcon({ name }: { name: HubStatIcon }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "code":
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "files":
      return (
        <svg {...common}>
          <path d="M3 7h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      );
    case "projects":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "designer":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
        </svg>
      );
    case "dev":
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 18v3" />
        </svg>
      );
    case "ai":
      return (
        <svg {...common}>
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />
          <circle cx="12" cy="12" r="4.5" />
        </svg>
      );
    default:
      return null;
  }
}
`
);

// Patch HubDocumentacaoInterna
let hub = fs.readFileSync("src/pages/documentacao/HubDocumentacaoInterna.tsx", "utf8");
if (!hub.includes("HubAtualContent")) {
  hub = hub.replace(
    'import HubPlaneamentoContent from "./HubPlaneamentoContent";',
    'import HubPlaneamentoContent from "./HubPlaneamentoContent";\nimport HubAtualContent from "./HubAtualContent";'
  );
}
if (!hub.includes('active === "atual"')) {
  hub = hub.replace(
    `            {active === "historico" ? (
              <HubHistoricoContent />
            )`,
    `            {active === "atual" ? (
              <HubAtualContent />
            ) : active === "historico" ? (
              <HubHistoricoContent />
            )`
  );
}
// Remove leftover placeholder-only path if atual was the only remaining - keep for safety (none left ideally)
fs.writeFileSync("src/pages/documentacao/HubDocumentacaoInterna.tsx", hub, "utf8");

console.log("atual module + HubAtualContent written");
console.log("hub has atual", hub.includes('active === "atual"'), hub.includes("HubAtualContent"));
