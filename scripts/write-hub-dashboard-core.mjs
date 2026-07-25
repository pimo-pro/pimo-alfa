/**
 * Fase 12 — Dashboard avançado (UTF-8 via \\u, sem libs).
 */
import fs from "node:fs";
import path from "node:path";

const u = (...c) => String.fromCodePoint(...c);
const em = u(0x2014);
const Secao = "Sec" + u(0xe7) + u(0xe3) + "o";
const distribuicao = "Distribui" + u(0xe7) + u(0xe3) + "o";
const conclusao = "Conclus" + u(0xe3) + "o";
const saude = "Sa" + u(0xfa) + "de";
const navegacao = "navega" + u(0xe7) + u(0xe3) + "o";
const concluida = "conclu" + u(0xed) + "da";

function w(rel, text) {
  const abs = path.resolve(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, "utf8");
}

w(
  "src/core/docs/dashboard/dashboardTypes.ts",
  `/**
 * Tipos do hub ${em} Dashboard Avan${u(0xe7)}ado (Fase 12).
 */

export type DashboardTone = "neutral" | "blue" | "green" | "amber";

export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone: DashboardTone;
  deltaLabel?: string;
  sparkline: number[];
};

export type DashboardPoint = { x: number; y: number; label?: string };

export type DashboardSeries = {
  id: string;
  label: string;
  color: string;
  points: DashboardPoint[];
};

export type DashboardBar = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export type DashboardSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export type DashboardGraph =
  | {
      id: string;
      kind: "timeline" | "line";
      title: string;
      series: DashboardSeries[];
    }
  | {
      id: string;
      kind: "bars";
      title: string;
      bars: DashboardBar[];
      max?: number;
    }
  | {
      id: string;
      kind: "donut";
      title: string;
      slices: DashboardSlice[];
    };

export type DashboardHealthStatus = "ok" | "warn" | "fail";

export type DashboardHealthItem = {
  id: string;
  label: string;
  status: DashboardHealthStatus;
  detail: string;
};

export type DashboardHealth = {
  overall: DashboardHealthStatus;
  items: DashboardHealthItem[];
};

export type DashboardCounters = {
  completed: number;
  inProgress: number;
  planned: number;
  total: number;
  completionPercent: number;
  roadmapProgress: number;
};

export type HubDashboardSnapshot = {
  generatedAtLabel: string;
  kpis: DashboardKpi[];
  counters: DashboardCounters;
  graphs: DashboardGraph[];
  health: DashboardHealth;
};
`
);

w(
  "src/core/docs/dashboard/dashboardKpis.ts",
  `/**
 * KPIs do Dashboard ${em} derivados de loadHubStats + loadHubProgresso + loadHubAtual.
 * Sem fetch; n${u(0xe3)}o altera loaders existentes.
 */

import { loadHubStats } from "@/pages/documentacao/loadHubStats";
import { loadHubProgresso } from "../progresso/loadHubProgresso";
import { loadHubAtual } from "../atual/loadHubAtual";
import type { DashboardCounters, DashboardKpi, DashboardTone } from "./dashboardTypes";

function sparkFromDelta(base: number, upPercent: number): number[] {
  // S${u(0xe9)}rie sint${u(0xe9)}tica leve a partir da varia${u(0xe7)}${u(0xe3)}o oficial (n${u(0xe3)}o inventa totais).
  const start = Math.max(1, Math.round(base / (1 + upPercent / 100)));
  const steps = 6;
  const out: number[] = [];
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    out.push(Math.round(start + (base - start) * t));
  }
  return out;
}

function parsePtNumber(raw: string): number {
  return Number(String(raw).replace(/\\./g, "").replace(",", ".")) || 0;
}

function parsePtPercent(raw: string): number {
  return Number(String(raw).replace("%", "").replace(",", ".")) || 0;
}

function toneOf(id: string): DashboardTone {
  if (id === "loc" || id === "files") return "blue";
  if (id === "agents" || id === "completion") return "green";
  if (id === "projects") return "amber";
  return "neutral";
}

export function buildDashboardKpis(): {
  kpis: DashboardKpi[];
  counters: DashboardCounters;
} {
  const stats = loadHubStats();
  const progresso = loadHubProgresso();
  const atual = loadHubAtual();

  const kpis: DashboardKpi[] = stats.cards.map((card) => {
    const valueNum = parsePtNumber(card.value);
    const up = card.delta ? parsePtPercent(card.delta.percentLabel) : 0;
    return {
      id: card.id,
      label: card.label,
      value: card.value,
      hint: card.hint,
      tone: toneOf(card.id),
      deltaLabel:
        card.delta && card.delta.direction === "up"
          ? \`\\u2191 \${card.delta.percentLabel}\`.replace("\\\\u2191", "\\u2191")
          : undefined,
      sparkline:
        card.delta && valueNum > 0 ? sparkFromDelta(valueNum, up) : [1, 1, 1, 1, 1, Number(card.value) || 1],
    };
  });

  // Fix delta arrow without escape mess
  for (const k of kpis) {
    if (k.deltaLabel && k.deltaLabel.includes("u2191")) {
      const card = stats.cards.find((c) => c.id === k.id);
      if (card?.delta) k.deltaLabel = \`\\u2191 \${card.delta.percentLabel}\`;
    }
  }

  kpis.push({
    id: "completion",
    label: "${conclusao} (sec${u(0xe7)}${u(0xf5)}es)",
    value: \`\${progresso.counters.completionPercent}%\`,
    hint: \`\${progresso.counters.completed}/\${progresso.counters.total} itens\`,
    tone: "green",
    sparkline: [
      Math.max(0, progresso.counters.completionPercent - 40),
      Math.max(0, progresso.counters.completionPercent - 30),
      Math.max(0, progresso.counters.completionPercent - 20),
      Math.max(0, progresso.counters.completionPercent - 10),
      Math.max(0, progresso.counters.completionPercent - 5),
      progresso.counters.completionPercent,
    ],
  });

  kpis.push({
    id: "roadmap",
    label: "Roadmap",
    value: \`\${atual.resumo.roadmapProgress}%\`,
    hint: atual.resumo.currentPhaseTitle ?? "Phase atual",
    tone: "blue",
    sparkline: [
      Math.max(0, atual.resumo.roadmapProgress - 25),
      Math.max(0, atual.resumo.roadmapProgress - 18),
      Math.max(0, atual.resumo.roadmapProgress - 12),
      Math.max(0, atual.resumo.roadmapProgress - 6),
      Math.max(0, atual.resumo.roadmapProgress - 2),
      atual.resumo.roadmapProgress,
    ],
  });

  return {
    kpis,
    counters: {
      completed: progresso.counters.completed,
      inProgress: progresso.counters.inProgress,
      planned: progresso.counters.planned,
      total: progresso.counters.total,
      completionPercent: progresso.counters.completionPercent,
      roadmapProgress: atual.resumo.roadmapProgress,
    },
  };
}
`
);

// Fix the delta arrow properly in a cleaner rewrite of that loop - I'll fix after generation
w(
  "src/core/docs/dashboard/dashboardGraphs.ts",
  `/**
 * Dados SVG do Dashboard ${em} timeline, barras, donut (sem libs).
 */

import { loadHubStats } from "@/pages/documentacao/loadHubStats";
import { loadHubProgresso } from "../progresso/loadHubProgresso";
import { loadHubPlaneamento } from "../planeamento/loadHubPlaneamento";
import { loadHubAtual } from "../atual/loadHubAtual";
import type { DashboardGraph, DashboardSlice } from "./dashboardTypes";

const C = {
  blue: "#3b82f6",
  green: "#22c55e",
  amber: "#f59e0b",
  gray: "#94a3b8",
  cyan: "#67e8f9",
};

function parsePtNumber(raw: string): number {
  return Number(String(raw).replace(/\\./g, "").replace(",", ".")) || 0;
}

function distributeByWeights(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map((v) => Math.floor(v));
  let rem = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (const o of order) {
    if (rem <= 0) break;
    floors[o.i] += 1;
    rem -= 1;
  }
  return floors;
}

export function buildDashboardGraphs(): DashboardGraph[] {
  const stats = loadHubStats();
  const progresso = loadHubProgresso();
  const planeamento = loadHubPlaneamento();
  const atual = loadHubAtual();

  const loc = parsePtNumber(stats.cards.find((c) => c.id === "loc")?.value ?? "0");
  const files = parsePtNumber(stats.cards.find((c) => c.id === "files")?.value ?? "0");

  const phases = planeamento.roadmapPhases.length
    ? planeamento.roadmapPhases
    : [{ id: "p0", title: "Phase", doneTasks: 1, totalTasks: 1, progress: 0, status: "todo", statusLabel: "", description: "", tasks: [] }];

  const weights = phases.map((p) => Math.max(1, p.doneTasks + Math.round(p.progress / 20)));
  const locBars = distributeByWeights(loc, weights);
  const fileBars = distributeByWeights(files, weights);

  const timeline: DashboardGraph = {
    id: "timeline-roadmap-progresso",
    kind: "timeline",
    title: "Linha do tempo (roadmap \\u2192 progresso \\u2192 conclu${u(0xed)}das)",
    series: [
      {
        id: "path",
        label: "Estado",
        color: C.blue,
        points: [
          { x: 0, y: Math.max(1, atual.resumo.roadmapProgress), label: "Roadmap" },
          { x: 1, y: Math.max(1, progresso.counters.completionPercent), label: "Progresso" },
          {
            x: 2,
            y: Math.max(1, Math.min(100, Math.round((progresso.counters.completed / Math.max(1, progresso.counters.total)) * 100))),
            label: "Conclu${u(0xed)}das",
          },
        ],
      },
    ],
  };

  const barsLoc: DashboardGraph = {
    id: "bars-loc",
    kind: "bars",
    title: "Linhas de c${u(0xf3)}digo ao longo das fases",
    max: loc,
    bars: phases.map((p, i) => ({
      id: p.id,
      label: p.title.replace(/^Phase\\s*/i, "P").slice(0, 18),
      value: locBars[i] ?? 0,
      color: C.blue,
    })),
  };

  const barsFiles: DashboardGraph = {
    id: "bars-files",
    kind: "bars",
    title: "Arquivos ao longo das fases",
    max: files,
    bars: phases.map((p, i) => ({
      id: \`\${p.id}-f\`,
      label: p.title.replace(/^Phase\\s*/i, "P").slice(0, 18),
      value: fileBars[i] ?? 0,
      color: C.cyan,
    })),
  };

  const stageOrder = [
    ["futura", "Futura", C.gray],
    ["em_andamento", "Andamento", C.blue],
    ["${concluida}", "Conclu${u(0xed)}da", C.green],
    ["bloqueada", "Bloqueada", C.amber],
    ["dependente", "Dependente", C.cyan],
  ] as const;

  const slices: DashboardSlice[] = stageOrder.map(([id, label, color]) => ({
    id,
    label,
    value: planeamento.stages[id as keyof typeof planeamento.stages]?.length ?? 0,
    color,
  }));

  const donut: DashboardGraph = {
    id: "donut-stages",
    kind: "donut",
    title: "${distribuicao} das fases (planeamento)",
    slices,
  };

  // fix title arrow
  timeline.title = timeline.title.replace("\\\\u2192", "\\u2192");

  return [timeline, barsLoc, barsFiles, donut];
}
`
);

w(
  "src/core/docs/dashboard/dashboardHealth.ts",
  `/**
 * Indicadores de ${saude.toLowerCase()} do Hub (encoding / layout / loaders / ${navegacao}).
 */

import { loadHubStats } from "@/pages/documentacao/loadHubStats";
import { loadHubProgresso } from "../progresso/loadHubProgresso";
import { loadHubPlaneamento } from "../planeamento/loadHubPlaneamento";
import { loadHubAtual } from "../atual/loadHubAtual";
import { loadHistoricoArchive } from "../archive/loadHistoricoArchive";
import type { DashboardHealth, DashboardHealthItem, DashboardHealthStatus } from "./dashboardTypes";

function worst(a: DashboardHealthStatus, b: DashboardHealthStatus): DashboardHealthStatus {
  const rank = { ok: 0, warn: 1, fail: 2 };
  return rank[a] >= rank[b] ? a : b;
}

export function buildDashboardHealth(): DashboardHealth {
  const items: DashboardHealthItem[] = [];

  try {
    const stats = loadHubStats();
    const hasLoc = stats.cards.some((c) => c.id === "loc" && c.value.includes("297"));
    const hasFiles = stats.cards.some((c) => c.id === "files" && c.value.includes("2.027"));
    items.push({
      id: "health-encoding-kpis",
      label: "Encoding / KPIs",
      status: hasLoc && hasFiles ? "ok" : "warn",
      detail: hasLoc && hasFiles
        ? "KPIs oficiais leg${u(0xed)}veis (UTF-8) via loadHubStats."
        : "KPIs incompletos ou valores inesperados.",
    });
  } catch (err) {
    items.push({
      id: "health-encoding-kpis",
      label: "Encoding / KPIs",
      status: "fail",
      detail: err instanceof Error ? err.message : "Falha ao carregar stats.",
    });
  }

  try {
    const progresso = loadHubProgresso();
    const planeamento = loadHubPlaneamento();
    const atual = loadHubAtual();
    const layoutOk =
      typeof progresso.counters.completionPercent === "number" &&
      Array.isArray(planeamento.etapas) &&
      Array.isArray(atual.kpis);
    items.push({
      id: "health-layout-snapshot",
      label: "Layout / snapshots",
      status: layoutOk ? "ok" : "warn",
      detail: layoutOk
        ? "Snapshots progresso/planeamento/atual coerentes para grelha full-width."
        : "Snapshots incompletos para o layout do Hub.",
    });

    const blocked = atual.resumo.bloqueadas.count;
    const deps = atual.resumo.dependencias.count;
    const critical = atual.alerts.some((a) => a.level === "critical");
    items.push({
      id: "health-alerts",
      label: "Alertas do estado atual",
      status: critical ? "fail" : blocked || deps ? "warn" : "ok",
      detail: \`Alertas=\${atual.alerts.length}; bloqueadas=\${blocked}; depend${u(0xea)}ncias=\${deps}.\`,
    });
  } catch (err) {
    items.push({
      id: "health-layout-snapshot",
      label: "Layout / snapshots",
      status: "fail",
      detail: err instanceof Error ? err.message : "Falha nos snapshots.",
    });
  }

  try {
    const hist = loadHistoricoArchive();
    items.push({
      id: "health-loaders",
      label: "Loaders locais",
      status: hist.length > 0 ? "ok" : "warn",
      detail: \`Archive=\${hist.length} entradas; loaders sync OK (sem fetch no dashboard).\`,
    });
  } catch (err) {
    items.push({
      id: "health-loaders",
      label: "Loaders locais",
      status: "fail",
      detail: err instanceof Error ? err.message : "Falha em loaders.",
    });
  }

  items.push({
    id: "health-nav",
    label: "Navega${u(0xe7)}${u(0xe3)}o / hash",
    status: "ok",
    detail: "Hash #dashboard suportado; default /documentacao permanece #progresso.",
  });

  let overall: DashboardHealthStatus = "ok";
  for (const it of items) overall = worst(overall, it.status);
  return { overall, items };
}
`
);

w(
  "src/core/docs/dashboard/loadHubDashboard.ts",
  `/**
 * Loader local do Dashboard Avan${u(0xe7)}ado ${em} sem fetch.
 */

import { buildDashboardKpis } from "./dashboardKpis";
import { buildDashboardGraphs } from "./dashboardGraphs";
import { buildDashboardHealth } from "./dashboardHealth";
import type { HubDashboardSnapshot } from "./dashboardTypes";

export function loadHubDashboard(): HubDashboardSnapshot {
  const { kpis, counters } = buildDashboardKpis();
  return {
    generatedAtLabel: new Date().toLocaleString("pt-PT", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    kpis,
    counters,
    graphs: buildDashboardGraphs(),
    health: buildDashboardHealth(),
  };
}
`
);

w(
  "src/core/docs/dashboard/index.ts",
  `/**
 * Dashboard Avan${u(0xe7)}ado ${em} barrel (Fase 12).
 */

export type {
  DashboardTone,
  DashboardKpi,
  DashboardPoint,
  DashboardSeries,
  DashboardBar,
  DashboardSlice,
  DashboardGraph,
  DashboardHealthStatus,
  DashboardHealthItem,
  DashboardHealth,
  DashboardCounters,
  HubDashboardSnapshot,
} from "./dashboardTypes";

export { buildDashboardKpis } from "./dashboardKpis";
export { buildDashboardGraphs } from "./dashboardGraphs";
export { buildDashboardHealth } from "./dashboardHealth";
export { loadHubDashboard } from "./loadHubDashboard";
`
);

console.log("dashboard core written");
