/**
 * Fase 12 — HubDashboardContent + patches + KPI/graph polish (UTF-8 via \\u).
 */
import fs from "node:fs";
import path from "node:path";

const u = (...c) => String.fromCodePoint(...c);
const em = u(0x2014);
const Secao = "Sec" + u(0xe7) + u(0xe3) + "o";
const conclusao = "Conclus" + u(0xe3) + "o";
const distribuicao = "Distribui" + u(0xe7) + u(0xe3) + "o";
const saude = "Sa" + u(0xfa) + "de";
const concluida = "conclu" + u(0xed) + "da";
const arrow = u(0x2191);
const to = u(0x2192);

function w(rel, text) {
  fs.mkdirSync(path.dirname(path.resolve(rel)), { recursive: true });
  fs.writeFileSync(rel, text, "utf8");
}

// Rewrite KPIs cleanly
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
          ? "${arrow} " + card.delta.percentLabel
          : undefined,
      sparkline:
        card.delta && valueNum > 0
          ? sparkFromDelta(valueNum, up)
          : [1, 1, 1, 1, 1, Math.max(1, valueNum || Number(card.value) || 1)],
    };
  });

  kpis.push({
    id: "completion",
    label: "${conclusao} (sec${u(0xe7)}${u(0xf5)}es)",
    value: String(progresso.counters.completionPercent) + "%",
    hint: progresso.counters.completed + "/" + progresso.counters.total + " itens",
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
    value: String(atual.resumo.roadmapProgress) + "%",
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
    : [
        {
          id: "p0",
          title: "Phase",
          doneTasks: 1,
          totalTasks: 1,
          progress: 0,
          status: "todo",
          statusLabel: "",
          description: "",
          tasks: [],
        },
      ];

  const weights = phases.map((p) => Math.max(1, p.doneTasks + Math.round(p.progress / 20)));
  const locBars = distributeByWeights(loc, weights);
  const fileBars = distributeByWeights(files, weights);

  const timeline: DashboardGraph = {
    id: "timeline-roadmap-progresso",
    kind: "timeline",
    title: "Linha do tempo (roadmap " + "${to}" + " progresso " + "${to}" + " conclu${u(0xed)}das)",
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
            y: Math.max(
              1,
              Math.min(
                100,
                Math.round((progresso.counters.completed / Math.max(1, progresso.counters.total)) * 100)
              )
            ),
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
      id: p.id + "-f",
      label: p.title.replace(/^Phase\\s*/i, "P").slice(0, 18),
      value: fileBars[i] ?? 0,
      color: C.cyan,
    })),
  };

  const stageOrder: Array<[keyof typeof planeamento.stages, string, string]> = [
    ["futura", "Futura", C.gray],
    ["em_andamento", "Andamento", C.blue],
    ["${concluida}", "Conclu${u(0xed)}da", C.green],
    ["bloqueada", "Bloqueada", C.amber],
    ["dependente", "Dependente", C.cyan],
  ];

  const slices: DashboardSlice[] = stageOrder.map(([id, label, color]) => ({
    id,
    label,
    value: planeamento.stages[id]?.length ?? 0,
    color,
  }));

  const donut: DashboardGraph = {
    id: "donut-stages",
    kind: "donut",
    title: "${distribuicao} das fases (planeamento)",
    slices,
  };

  return [timeline, barsLoc, barsFiles, donut];
}
`
);

// HubDashboardContent with SVG renderers
w(
  "src/pages/documentacao/HubDashboardContent.tsx",
  `/**
 * ${Secao} Dashboard Avan${u(0xe7)}ado ${em} KPIs + gr${u(0xe1)}ficos SVG (sem libs).
 */

import { useMemo } from "react";
import {
  loadHubDashboard,
  type DashboardBar,
  type DashboardGraph,
  type DashboardHealthItem,
  type DashboardKpi,
  type DashboardSlice,
  type DashboardTone,
} from "@/core/docs/dashboard";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";

const TONE: Record<DashboardTone, string> = {
  neutral: C.muted,
  blue: C.accent,
  green: "var(--status-done-color, var(--ci-success, #22c55e))",
  amber: "var(--status-progress-color, var(--ci-sienna-400, #f59e0b))",
};

const HEALTH_COLOR = {
  ok: "var(--status-done-color, var(--ci-success, #22c55e))",
  warn: "var(--status-progress-color, var(--ci-sienna-400, #f59e0b))",
  fail: "var(--ci-sienna-500, #ef4444)",
} as const;

export default function HubDashboardContent() {
  const data = useMemo(() => loadHubDashboard(), []);

  return (
    <div data-hub-dashboard style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        Dashboard avan${u(0xe7)}ado ${em} snapshot {data.generatedAtLabel}. Contadores:{" "}
        {data.counters.completed} conclu${u(0xed)}dos · {data.counters.inProgress} andamento ·{" "}
        {data.counters.planned} planeados ({data.counters.completionPercent}%).
      </p>

      <div
        className="hub-dash-kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 12,
          width: "100%",
        }}
      >
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div
        className="hub-dash-graph-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 12,
          width: "100%",
        }}
      >
        {data.graphs.map((g) => (
          <GraphCard key={g.id} graph={g} />
        ))}
      </div>

      <section
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          border: \`1px solid \${C.border}\`,
          background: C.bg,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>
            ${saude} do Hub
          </h3>
          <span style={{ fontSize: 11, fontWeight: 700, color: HEALTH_COLOR[data.health.overall] }}>
            {data.health.overall.toUpperCase()}
          </span>
        </div>
        <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {data.health.items.map((item) => (
            <HealthRow key={item.id} item={item} />
          ))}
        </ul>
      </section>

      <style>{\`
        @media (max-width: 820px) {
          .hub-dash-kpi-grid,
          .hub-dash-graph-grid {
            grid-template-columns: 1fr !important;
          }
        }
      \`}</style>
    </div>
  );
}

function HealthRow({ item }: { item: DashboardHealthItem }) {
  return (
    <li style={{ fontSize: 12, color: C.text, lineHeight: 1.45 }}>
      <span style={{ fontWeight: 700, color: HEALTH_COLOR[item.status] }}>[{item.status}]</span>{" "}
      {item.label}
      <div style={{ color: C.muted }}>{item.detail}</div>
    </li>
  );
}

function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const color = TONE[kpi.tone];
  return (
    <article
      style={{
        padding: "14px 14px 12px",
        borderRadius: 10,
        border: \`1px solid \${C.border}\`,
        background: C.surface,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{kpi.label}</span>
        {kpi.deltaLabel ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: TONE.green }}>{kpi.deltaLabel}</span>
        ) : null}
      </div>
      <div style={{ fontSize: "clamp(1.4rem, 2.6vw, 1.8rem)", fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>
        {kpi.value}
      </div>
      {kpi.hint ? <div style={{ fontSize: 11, color: C.muted }}>{kpi.hint}</div> : null}
      <Sparkline values={kpi.sparkline} color={color} />
    </article>
  );
}

function GraphCard({ graph }: { graph: DashboardGraph }) {
  return (
    <article
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: \`1px solid \${C.border}\`,
        background: C.bg,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <h3 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: C.text }}>{graph.title}</h3>
      {graph.kind === "timeline" || graph.kind === "line" ? (
        <LineChart series={graph.series} />
      ) : graph.kind === "bars" ? (
        <BarChart bars={graph.bars} max={graph.max} />
      ) : (
        <DonutChart slices={graph.slices} />
      )}
    </article>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 120;
  const h = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(1, max - min);
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * (w - 2) + 1;
      const y = h - 2 - ((v - min) / span) * (h - 4);
      return x + "," + y;
    })
    .join(" ");
  return (
    <svg viewBox={\`0 0 \${w} \${h}\`} width="100%" height={28} role="img" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="1.75" points={pts} />
    </svg>
  );
}

function LineChart({
  series,
}: {
  series: Extract<DashboardGraph, { kind: "timeline" | "line" }>["series"];
}) {
  const w = 320;
  const h = 140;
  const pad = 18;
  const all = series.flatMap((s) => s.points);
  const maxY = Math.max(...all.map((p) => p.y), 1);
  const maxX = Math.max(...all.map((p) => p.x), 1);
  return (
    <svg viewBox={\`0 0 \${w} \${h}\`} width="100%" height={160} role="img">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={C.border} />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={C.border} />
      {series.map((s) => {
        const pts = s.points
          .map((p) => {
            const x = pad + (p.x / maxX) * (w - pad * 2);
            const y = h - pad - (p.y / maxY) * (h - pad * 2);
            return x + "," + y;
          })
          .join(" ");
        return (
          <g key={s.id}>
            <polyline fill="none" stroke={s.color} strokeWidth="2" points={pts} />
            {s.points.map((p, i) => {
              const x = pad + (p.x / maxX) * (w - pad * 2);
              const y = h - pad - (p.y / maxY) * (h - pad * 2);
              return (
                <g key={s.id + "-" + i}>
                  <circle cx={x} cy={y} r={3.5} fill={s.color} />
                  {p.label ? (
                    <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fill={C.muted}>
                      {p.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function BarChart({ bars, max }: { bars: DashboardBar[]; max?: number }) {
  const w = 320;
  const h = 160;
  const pad = 16;
  const peak = max ?? Math.max(...bars.map((b) => b.value), 1);
  const gap = 6;
  const barW = Math.max(8, (w - pad * 2 - gap * Math.max(0, bars.length - 1)) / Math.max(1, bars.length));
  return (
    <svg viewBox={\`0 0 \${w} \${h}\`} width="100%" height={180} role="img">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={C.border} />
      {bars.map((b, i) => {
        const x = pad + i * (barW + gap);
        const bh = ((b.value / peak) * (h - pad * 2)) || 0;
        const y = h - pad - bh;
        return (
          <g key={b.id}>
            <rect x={x} y={y} width={barW} height={bh} rx={3} fill={b.color} opacity={0.85} />
            <text
              x={x + barW / 2}
              y={h - 4}
              textAnchor="middle"
              fontSize="8"
              fill={C.muted}
            >
              {b.label.slice(0, 6)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ slices }: { slices: DashboardSlice[] }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 54;
  const stroke = 18;
  const total = slices.reduce((a, b) => a + b.value, 0) || 1;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox={\`0 0 \${size} \${size}\`} width={160} height={160} role="img">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
        {slices.map((s) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle
              key={s.id}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={\`\${len} \${circ - len}\`}
              strokeDashoffset={-offset}
              transform={\`rotate(-90 \${cx} \${cy})\`}
            />
          );
          offset += len;
          return el;
        })}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill={C.text}>
          {total}
        </text>
      </svg>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {slices.map((s) => (
          <li key={s.id} style={{ fontSize: 11, color: C.muted, display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: "inline-block" }} />
            {s.label}: {s.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
`
);

// Patch hubSections
let sections = fs.readFileSync("src/pages/documentacao/hubSections.ts", "utf8");
if (!sections.includes('"dashboard"')) {
  sections = sections.replace(
    `| "planeamento";`,
    `| "planeamento"\n  | "dashboard";`
  );
  sections = sections.replace(
    `  {
    id: "planeamento",
    label: "Planeamento futuro",
    blurb: "Pr${u(0xf3)}ximas etapas e roadmap",
    icon: "adminChecklist",
  },
];`,
    `  {
    id: "planeamento",
    label: "Planeamento futuro",
    blurb: "Pr${u(0xf3)}ximas etapas e roadmap",
    icon: "adminChecklist",
  },
  {
    id: "dashboard",
    label: "Dashboard avan${u(0xe7)}ado",
    blurb: "KPIs, gr${u(0xe1)}ficos SVG e ${saude.toLowerCase()} do Hub",
    icon: "adminChart",
  },
];`
  );
  // If blurb already has proper accents, try ASCII-safe insert before ];
  if (!sections.includes('id: "dashboard"')) {
    sections = sections.replace(
      /\];\s*\n\n\/\*\* Sec/,
      `  {\n    id: "dashboard",\n    label: "Dashboard avan${u(0xe7)}ado",\n    blurb: "KPIs, gr${u(0xe1)}ficos SVG e ${saude.toLowerCase()} do Hub",\n    icon: "adminChart",\n  },\n];\n\n/** Sec`
    );
  }
  fs.writeFileSync("src/pages/documentacao/hubSections.ts", sections, "utf8");
}

// Patch HubDocumentacaoInterna
let hub = fs.readFileSync("src/pages/documentacao/HubDocumentacaoInterna.tsx", "utf8");
if (!hub.includes("HubDashboardContent")) {
  hub = hub.replace(
    'import HubAtualContent from "./HubAtualContent";',
    'import HubAtualContent from "./HubAtualContent";\nimport HubDashboardContent from "./HubDashboardContent";'
  );
}
if (!hub.includes('active === "dashboard"')) {
  hub = hub.replace(
    `) : active === "planeamento" ? (
              <HubPlaneamentoContent />
            ) : (`,
    `) : active === "planeamento" ? (
              <HubPlaneamentoContent />
            ) : active === "dashboard" ? (
              <HubDashboardContent />
            ) : (`
  );
}
fs.writeFileSync("src/pages/documentacao/HubDocumentacaoInterna.tsx", hub, "utf8");

console.log("dashboard UI + patches done");
console.log("sections dashboard", fs.readFileSync("src/pages/documentacao/hubSections.ts", "utf8").includes('"dashboard"'));
console.log("hub dashboard", hub.includes('active === "dashboard"'));
