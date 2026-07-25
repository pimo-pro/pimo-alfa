/**
 * Fase pimo-soon — plano futuro (UTF-8 via \\u).
 */
import fs from "node:fs";
import path from "node:path";

const u = (...c) => String.fromCodePoint(...c);
const em = u(0x2014);
const Secao = "Sec" + u(0xe7) + u(0xe3) + "o";
const Documentacao = "Documenta" + u(0xe7, 0xe3) + "o";
const Geracao = "Gera" + u(0xe7) + u(0xe3) + "o";
const Medicao = "Medi" + u(0xe7) + u(0xe3) + "o";
const velocidade = "velocidade";
const inconsistencias = "inconsist" + u(0xea) + "ncias";
const Diferencas = "Diferen" + u(0xe7) + "as";
const Sugestao = "Sugest" + u(0xe3) + "o";
const reorganizacao = "reorganiza" + u(0xe7) + u(0xe3) + "o";
const reestruturacao = "reestrutura" + u(0xe7) + u(0xe3) + "o";
const Priorizacao = "Prioriza" + u(0xe7) + u(0xe3) + "o";
const Desempenho = "Desempenho";
const Numero = "N" + u(0xfa) + "mero";
const eficiencia = "efici" + u(0xea) + "ncia";
const pecas = "pe" + u(0xe7) + "as";
const montagem = "montagem";
const opcionais = "opcionais";
const evolucao = "evolu" + u(0xe7) + u(0xe3) + "o";

function w(rel, text) {
  const abs = path.resolve(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, "utf8");
}

w(
  "src/core/docs/pimoSoon/pimoSoonTypes.ts",
  `/**
 * Tipos do hub ${em} pimo-soon / Plano Futuro.
 */

export type PimoSoonStatus = "planned" | "optional" | "blocked";

export type PimoSoonItem = {
  id: string;
  label: string;
};

export type PimoSoonFase = {
  id: string;
  number: number;
  title: string;
  summary: string;
  status: PimoSoonStatus;
  items: PimoSoonItem[];
};

export type PimoSoonNote = {
  id: string;
  body: string;
};

export type HubPimoSoonSnapshot = {
  tag: "pimo-soon";
  title: string;
  blurb: string;
  fases: PimoSoonFase[];
  notas: PimoSoonNote[];
};
`
);

w(
  "src/core/docs/pimoSoon/pimoSoonFases.ts",
  `/**
 * Lista completa das fases futuras oficiais (pimo-soon).
 * Conte${u(0xfa)}do editorial fixo ${em} pronto para execu${u(0xe7)}${u(0xe3)}o posterior.
 */

import type { PimoSoonFase } from "./pimoSoonTypes";

export const PIMO_SOON_FASES: PimoSoonFase[] = [
  {
    id: "fase-13-documentacao-automatica",
    number: 13,
    title: "Fase 13 ${em} ${Documentacao} autom${u(0xe1)}tica",
    summary: "${Geracao} autom${u(0xe1)}tica de artefactos t${u(0xe9)}cnicos e documentais.",
    status: "optional",
    items: [
      { id: "f13-1", label: "${Geracao} autom${u(0xe1)}tica de PDFs t${u(0xe9)}cnicos" },
      { id: "f13-2", label: "${Geracao} de desenhos e esquemas" },
      { id: "f13-3", label: "${Geracao} de fluxos e diagramas" },
      { id: "f13-4", label: "${Geracao} de listas de ${pecas} (cutlist)" },
      { id: "f13-5", label: "${Geracao} de instru${u(0xe7)}${u(0xf5)}es de ${montagem}" },
    ],
  },
  {
    id: "fase-14-dashboard-performance",
    number: 14,
    title: "Fase 14 ${em} Dashboard de performance",
    summary: "${Medicao} de performance do sistema e dos loaders.",
    status: "optional",
    items: [
      { id: "f14-1", label: "${Medicao} de ${velocidade} do sistema" },
      { id: "f14-2", label: "Tempo de carregamento das p${u(0xe1)}ginas" },
      { id: "f14-3", label: "Tempo dos loaders" },
      { id: "f14-4", label: "Consumo de mem${u(0xf3)}ria" },
      { id: "f14-5", label: "Indicadores de performance" },
    ],
  },
  {
    id: "fase-15-alertas-inteligentes",
    number: 15,
    title: "Fase 15 ${em} Sistema de alertas inteligentes",
    summary: "Alertas para encoding, bloqueios e ${inconsistencias}.",
    status: "optional",
    items: [
      { id: "f15-1", label: "Alerta para erros de encoding" },
      { id: "f15-2", label: "Alerta para fases bloqueadas" },
      { id: "f15-3", label: "Alerta para ${inconsistencias} entre progresso ${u(0xd7)} planeamento" },
      { id: "f15-4", label: "Alerta para dados incompletos ou divergentes" },
    ],
  },
  {
    id: "fase-16-historico-avancado",
    number: 16,
    title: "Fase 16 ${em} Hist${u(0xf3)}rico avan${u(0xe7)}ado",
    summary: "Compara${u(0xe7)}${u(0xe3)}o temporal entre vers${u(0xf5)}es, ficheiros e fases.",
    status: "optional",
    items: [
      { id: "f16-1", label: "Compara${u(0xe7)}${u(0xe3)}o entre vers${u(0xf5)}es" },
      { id: "f16-2", label: "${Diferencas} de ficheiros" },
      { id: "f16-3", label: "${Diferencas} de linhas de c${u(0xf3)}digo" },
      { id: "f16-4", label: "${Diferencas} entre fases" },
      { id: "f16-5", label: "Evolu${u(0xe7)}${u(0xe3)}o temporal do projeto" },
    ],
  },
  {
    id: "fase-17-planeamento-inteligente",
    number: 17,
    title: "Fase 17 ${em} Planeamento inteligente",
    summary: "Sugest${u(0xf5)}es autom${u(0xe1)}ticas de fases, melhorias e prioriza${u(0xe7)}${u(0xe3)}o.",
    status: "optional",
    items: [
      { id: "f17-1", label: "${Sugestao} autom${u(0xe1)}tica de novas fases" },
      { id: "f17-2", label: "${Sugestao} de melhorias" },
      { id: "f17-3", label: "${Sugestao} de ${reorganizacao}" },
      { id: "f17-4", label: "${Sugestao} de ${reestruturacao}" },
      { id: "f17-5", label: "${Priorizacao} inteligente" },
    ],
  },
  {
    id: "fase-18-dashboard-ia",
    number: 18,
    title: "Fase 18 ${em} Dashboard de IA",
    summary: "Indicadores de desempenho e ${eficiencia} dos agentes de IA.",
    status: "optional",
    items: [
      { id: "f18-1", label: "${Desempenho} dos agentes de IA" },
      { id: "f18-2", label: "${Numero} de tarefas executadas" },
      { id: "f18-3", label: "Taxa de sucesso" },
      { id: "f18-4", label: "Erros e falhas" },
      { id: "f18-5", label: "Indicadores de ${eficiencia}" },
    ],
  },
];
`
);

w(
  "src/core/docs/pimoSoon/pimoSoonNotas.ts",
  `/**
 * Notas editoriais oficiais (pimo-soon).
 */

import type { PimoSoonNote } from "./pimoSoonTypes";

export const PIMO_SOON_NOTAS: PimoSoonNote[] = [
  {
    id: "note-opcional",
    body: "Todas as fases s${u(0xe3)}o ${opcionais} e podem ser executadas sem press${u(0xe3)}o.",
  },
  {
    id: "note-industrial",
    body: "Nenhuma fase toca no pipeline industrial.",
  },
  {
    id: "note-cnc",
    body: "Nenhuma fase altera CNC, cutlist, PROJETOS ou Viewer.",
  },
  {
    id: "note-hub",
    body: "S${u(0xe3)}o fases de ${evolucao} do Hub e do sistema documental.",
  },
  {
    id: "note-ativacao",
    body: "Podem ser ativadas quando o projeto exigir.",
  },
];
`
);

w(
  "src/core/docs/pimoSoon/loadHubPimoSoon.ts",
  `/**
 * Loader local de pimo-soon (Plano Futuro) ${em} sem fetch.
 */

import { PIMO_SOON_FASES } from "./pimoSoonFases";
import { PIMO_SOON_NOTAS } from "./pimoSoonNotas";
import type { HubPimoSoonSnapshot } from "./pimoSoonTypes";

export function loadHubPimoSoon(): HubPimoSoonSnapshot {
  return {
    tag: "pimo-soon",
    title: "pimo-soon ${em} Plano Futuro",
    blurb:
      "Plano oficial de fases futuras (13${u(0x2013)}18), organizadas e tipadas para execu${u(0xe7)}${u(0xe3)}o posterior. Sem impacto industrial.",
    fases: PIMO_SOON_FASES,
    notas: PIMO_SOON_NOTAS,
  };
}
`
);

w(
  "src/core/docs/pimoSoon/index.ts",
  `/**
 * pimo-soon ${em} barrel (Plano Futuro).
 */

export type {
  PimoSoonStatus,
  PimoSoonItem,
  PimoSoonFase,
  PimoSoonNote,
  HubPimoSoonSnapshot,
} from "./pimoSoonTypes";

export { PIMO_SOON_FASES } from "./pimoSoonFases";
export { PIMO_SOON_NOTAS } from "./pimoSoonNotas";
export { loadHubPimoSoon } from "./loadHubPimoSoon";
`
);

w(
  "src/pages/documentacao/HubPimoSoonContent.tsx",
  `/**
 * ${Secao} pimo-soon ${em} Plano Futuro (h${u(0xed)}brido A+C).
 */

import { useMemo } from "react";
import {
  loadHubPimoSoon,
  type PimoSoonFase,
  type PimoSoonStatus,
} from "@/core/docs/pimoSoon";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";

const STATUS_LABEL: Record<PimoSoonStatus, string> = {
  planned: "Planeada",
  optional: "Opcional",
  blocked: "Bloqueada",
};

const STATUS_COLOR: Record<PimoSoonStatus, string> = {
  planned: C.accent,
  optional: "var(--status-done-color, var(--ci-success, #22c55e))",
  blocked: "var(--status-progress-color, var(--ci-sienna-400, #f59e0b))",
};

export default function HubPimoSoonContent() {
  const data = useMemo(() => loadHubPimoSoon(), []);

  return (
    <div data-hub-pimo-soon style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        {data.blurb} Tag oficial: <strong style={{ color: C.accent }}>@{data.tag}</strong>.
      </p>

      <div
        className="hub-pimo-soon-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
          gap: 12,
          width: "100%",
        }}
      >
        {data.fases.map((fase) => (
          <FaseCard key={fase.id} fase={fase} />
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
        <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: C.text }}>
          Notas editoriais
        </h3>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {data.notas.map((n) => (
            <li key={n.id} style={{ fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
              {n.body}
            </li>
          ))}
        </ul>
      </section>

      <style>{\`
        @media (max-width: 820px) {
          .hub-pimo-soon-grid {
            grid-template-columns: 1fr !important;
          }
        }
      \`}</style>
    </div>
  );
}

function FaseCard({ fase }: { fase: PimoSoonFase }) {
  return (
    <article
      id={fase.id}
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.accent,
              marginBottom: 4,
            }}
          >
            Fase {fase.number}
          </div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
            {fase.title}
          </h3>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[fase.status], flexShrink: 0 }}>
          {STATUS_LABEL[fase.status]}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.45 }}>{fase.summary}</p>
      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        {fase.items.map((item) => (
          <li key={item.id} style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
            {item.label}
          </li>
        ))}
      </ul>
    </article>
  );
}
`
);

// Patch hubSections
let sections = fs.readFileSync("src/pages/documentacao/hubSections.ts", "utf8");
if (!sections.includes('"pimo-soon"')) {
  sections = sections.replace(
    `| "dashboard";`,
    `| "dashboard"\n  | "pimo-soon";`
  );
}
if (!sections.includes('id: "pimo-soon"')) {
  sections = sections.replace(
    `    icon: "adminChart",
  },
];`,
    `    icon: "adminChart",
  },
  {
    id: "pimo-soon",
    label: "pimo-soon",
    blurb: "Plano oficial de fases futuras (13${u(0x2013)}18)",
    icon: "adminChecklist",
  },
];`
  );
}
fs.writeFileSync("src/pages/documentacao/hubSections.ts", sections, "utf8");

// Patch HubDocumentacaoInterna
let hub = fs.readFileSync("src/pages/documentacao/HubDocumentacaoInterna.tsx", "utf8");
if (!hub.includes("HubPimoSoonContent")) {
  hub = hub.replace(
    'import HubDashboardContent from "./HubDashboardContent";',
    'import HubDashboardContent from "./HubDashboardContent";\nimport HubPimoSoonContent from "./HubPimoSoonContent";'
  );
}
if (!hub.includes('active === "pimo-soon"')) {
  hub = hub.replace(
    `) : active === "dashboard" ? (
              <HubDashboardContent />
            ) : (`,
    `) : active === "dashboard" ? (
              <HubDashboardContent />
            ) : active === "pimo-soon" ? (
              <HubPimoSoonContent />
            ) : (`
  );
}
fs.writeFileSync("src/pages/documentacao/HubDocumentacaoInterna.tsx", hub, "utf8");

console.log("pimo-soon written");
console.log("sections", sections.includes('"pimo-soon"'));
console.log("hub", hub.includes('active === "pimo-soon"'));
