/**
 * Fase 10 — gera core/docs/planeamento + HubPlaneamentoContent (UTF-8 via \\u).
 */
import fs from "node:fs";
import path from "node:path";

const u = (...c) => String.fromCodePoint(...c);
const em = u(0x2014);
const D = "Documenta" + u(0xe7, 0xe3) + "o";
const Planeamento = "Planeamento";
const Secao = "Sec" + u(0xe7) + u(0xe3) + "o";
const futura = "futura";
const emAndamento = "em_andamento";
const concluida = "conclu" + u(0xed) + "da";
const bloqueada = "bloqueada";
const dependente = "dependente";

function w(rel, text) {
  const abs = path.resolve(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, "utf8");
}

w(
  "src/core/docs/planeamento/planeamentoTypes.ts",
  `/**
 * Tipos do hub ${em} ${Planeamento} Futuro (Fase 10).
 */

export type PlaneamentoStage =
  | "${futura}"
  | "${emAndamento}"
  | "${concluida}"
  | "${bloqueada}"
  | "${dependente}";

export type PlaneamentoSource =
  | "progressoSections"
  | "progressoResumo"
  | "projectRoadmap"
  | "removedRegistry"
  | "painelReferencia";

export type PlaneamentoLinks = {
  /** Sec${u(0xe7)}${u(0xe3)}o em PROGRESSO_SECTIONS (id). */
  progressoSectionId?: string;
  /** Label do item em progressoSections (liga${u(0xe7)}${u(0xe3)}o cruzada). */
  progressoItemLabel?: string;
  /** Id em progressoResumo (TAREFAS_CONCLUIDAS / EM_ANDAMENTO / PROXIMAS). */
  progressoResumoId?: string;
  /** Id est${u(0xe1)}tico conhecido em removed.json (sem fetch no loader). */
  removedId?: string;
  /** Id de nota em refs (opcional). */
  refsNoteId?: string;
  /** Token para matching de news.json no UI (t${u(0xed)}tulo normalizado). */
  newsMatchToken?: string;
};

export type PlaneamentoEntry = {
  id: string;
  title: string;
  summary: string;
  stage: PlaneamentoStage;
  source: PlaneamentoSource;
  links?: PlaneamentoLinks;
};

export type PlaneamentoNote = {
  id: string;
  title: string;
  body: string;
  source: PlaneamentoSource;
};

export type PlaneamentoRoadmapPhaseView = {
  id: string;
  title: string;
  description: string;
  status: string;
  statusLabel: string;
  progress: number;
  doneTasks: number;
  totalTasks: number;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    statusLabel: string;
  }>;
};

export type HubPlaneamentoSnapshot = {
  etapas: PlaneamentoEntry[];
  stages: Record<PlaneamentoStage, PlaneamentoEntry[]>;
  roadmapPhases: PlaneamentoRoadmapPhaseView[];
  roadmapProgress: number;
  notas: PlaneamentoNote[];
  /** Itens conclu${u(0xed)}dos espelhados no progressoResumo (liga${u(0xe7)}${u(0xe3)}o). */
  concluidaNoResumo: PlaneamentoEntry[];
};
`
);

w(
  "src/core/docs/planeamento/planeamentoRoadmap.ts",
  `/**
 * Roadmap futuro ${em} reexport do SSOT projectRoadmap + helpers de vista.
 * N${u(0xe3)}o altera storage nem loaders existentes.
 */

export {
  getRoadmap,
  getCurrentPhase,
  getGlobalProgress,
  getPhaseProgress,
  getRoadmapStats,
  statusLabel,
  type Phase,
  type PhaseTask,
  type TaskStatus,
  type RoadmapStats,
} from "../progresso/progressoRoadmap";

import {
  getPhaseProgress,
  getRoadmap,
  getRoadmapStats,
  statusLabel,
  type Phase,
} from "../progresso/progressoRoadmap";
import type { PlaneamentoRoadmapPhaseView } from "./planeamentoTypes";

/** Extens${u(0xe3)}o: vista tipada das fases para o Hub de ${Planeamento}. */
export function buildPlaneamentoRoadmapView(): {
  phases: PlaneamentoRoadmapPhaseView[];
  progress: number;
} {
  const phases = getRoadmap();
  const stats = getRoadmapStats(phases);
  return {
    progress: stats.progress,
    phases: phases.map((phase: Phase) => {
      const totalTasks = phase.tasks.length;
      const doneTasks = phase.tasks.filter((t) => t.status === "done").length;
      return {
        id: phase.id,
        title: phase.title,
        description: phase.description,
        status: phase.status,
        statusLabel: statusLabel[phase.status] ?? phase.status,
        progress: getPhaseProgress(phase),
        doneTasks,
        totalTasks,
        tasks: phase.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          statusLabel: statusLabel[t.status] ?? t.status,
        })),
      };
    }),
  };
}
`
);

w(
  "src/core/docs/planeamento/planeamentoNotas.ts",
  `/**
 * Notas de ${Planeamento} ${em} organiza${u(0xe7)}${u(0xe3)}o de dados j${u(0xe1)} existentes.
 * Hist${u(0xf3)}rico do Hub permanece separado (n${u(0xe3)}o misturar).
 */

import { MODULES } from "../refs/refsIndex";
import { painelReferenciaSections } from "../refs/refsSections";
import {
  EM_ANDAMENTO,
  PROXIMAS_ETAPAS,
  TAREFAS_CONCLUIDAS,
} from "../progressoResumo";
import type { PlaneamentoNote } from "./planeamentoTypes";

function fromPainel(): PlaneamentoNote[] {
  return painelReferenciaSections
    .filter((s) => {
      const blob = \`\${s.title} \${s.description} \${s.internals ?? ""}\`.toLowerCase();
      return (
        blob.includes("roadmap") ||
        blob.includes("phase") ||
        blob.includes("fase") ||
        blob.includes("planeamento")
      );
    })
    .map((s, i) => ({
      id: \`note-painel-\${i + 1}\`,
      title: s.title,
      body: [s.description, s.internals, s.notes].filter(Boolean).join("\\n\\n"),
      source: "painelReferencia" as const,
    }));
}

function fromArchitecture(): PlaneamentoNote[] {
  return MODULES.filter((m) => {
    const blob = \`\${m.name} \${m.responsibility}\`.toLowerCase();
    return blob.includes("roadmap") || blob.includes("progresso") || blob.includes("fase");
  }).map((m) => ({
    id: \`note-mod-\${m.id}\`,
    title: m.name,
    body: \`\${m.responsibility}\\nPath: \${m.path}\`,
    source: "painelReferencia" as const,
  }));
}

function fromResumoEditorial(): PlaneamentoNote[] {
  const lines = [
    ...TAREFAS_CONCLUIDAS.slice(0, 3).map((t) => \`Conclu${u(0xed)}da: \${t.titulo}\`),
    ...EM_ANDAMENTO.map((t) => \`Em andamento: \${t.titulo}\`),
    ...PROXIMAS_ETAPAS.map((t) => \`Pr${u(0xf3)}xima: \${t.titulo}\`),
  ];
  return [
    {
      id: "note-resumo-editorial",
      title: "Alinhamento progressoResumo",
      body: lines.join("\\n"),
      source: "progressoResumo",
    },
  ];
}

/** Snapshot tipado das notas de planeamento (s${u(0xf3)} dados existentes). */
export const PLANEAMENTO_NOTAS: PlaneamentoNote[] = [
  ...fromPainel(),
  ...fromArchitecture(),
  ...fromResumoEditorial(),
];
`
);

w(
  "src/core/docs/planeamento/planeamentoEtapas.ts",
  `/**
 * Etapas futuras ${em} snapshot tipado derivado de SSOTs existentes.
 * Fontes: PROGRESSO_SECTIONS, progressoResumo, projectRoadmap, removed conhecidos.
 */

import { PROGRESSO_SECTIONS } from "../progresso/progressoSections";
import type { ProgressoItemStatus } from "../progresso/progressoSections";
import {
  EM_ANDAMENTO,
  PROXIMAS_ETAPAS,
  TAREFAS_CONCLUIDAS,
  type ProgressoItem,
} from "../progressoResumo";
import { getRoadmap, statusLabel } from "./planeamentoRoadmap";
import type {
  PlaneamentoEntry,
  PlaneamentoStage,
} from "./planeamentoTypes";

function slug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

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

function mapProgressoStatus(
  status: ProgressoItemStatus,
  label: string,
  sectionId: string
): PlaneamentoStage {
  const low = label.toLowerCase();
  if (sectionId === "known-bugs" && status !== "completed") return "bloqueada";
  if (low.includes("depend") || low.includes("depois de") || low.includes("ap${u(0xf3)}s")) {
    return "dependente";
  }
  if (status === "completed") return "conclu${u(0xed)}da";
  if (status === "in-progress") return "em_andamento";
  if (low.startsWith("todo:")) return "dependente";
  return "futura";
}

function findResumoId(title: string): string | undefined {
  const pools: ProgressoItem[] = [
    ...TAREFAS_CONCLUIDAS,
    ...EM_ANDAMENTO,
    ...PROXIMAS_ETAPAS,
  ];
  const hit = pools.find((p) => overlap(p.titulo, title));
  return hit?.id;
}

function fromProgressoSections(): PlaneamentoEntry[] {
  const out: PlaneamentoEntry[] = [];
  for (const section of PROGRESSO_SECTIONS) {
    for (const item of section.items) {
      // Planeamento foca futuro + andamento + bugs + TODOs; conclu${u(0xed)}dos s${u(0xf3)} se ligam ao resumo.
      if (item.status === "completed") {
        const resumoId = findResumoId(item.label);
        if (!resumoId) continue;
        out.push({
          id: \`ps-\${section.id}-\${slug(item.label)}\`,
          title: item.label,
          summary: section.title,
          stage: "conclu${u(0xed)}da",
          source: "progressoSections",
          links: {
            progressoSectionId: section.id,
            progressoItemLabel: item.label,
            progressoResumoId: resumoId,
            newsMatchToken: item.label,
          },
        });
        continue;
      }
      const stage = mapProgressoStatus(item.status, item.label, section.id);
      out.push({
        id: \`ps-\${section.id}-\${slug(item.label)}\`,
        title: item.label,
        summary: section.description,
        stage,
        source: "progressoSections",
        links: {
          progressoSectionId: section.id,
          progressoItemLabel: item.label,
          progressoResumoId: findResumoId(item.label),
          newsMatchToken: item.label,
        },
      });
    }
  }
  return out;
}

function fromResumo(): PlaneamentoEntry[] {
  const mapPool = (
    pool: ProgressoItem[],
    stage: PlaneamentoStage
  ): PlaneamentoEntry[] =>
    pool.map((item) => ({
      id: \`resumo-\${item.id}\`,
      title: item.titulo,
      summary: "progressoResumo",
      stage,
      source: "progressoResumo" as const,
      links: {
        progressoResumoId: item.id,
        newsMatchToken: item.titulo,
        // Liga${u(0xe7)}${u(0xe3)}o cruzada a sec${u(0xe7)}${u(0xe3)}o de progresso quando o t${u(0xed)}tulo existe l${u(0xe1)}.
        ...(() => {
          for (const section of PROGRESSO_SECTIONS) {
            const hit = section.items.find((it) => overlap(it.label, item.titulo));
            if (hit) {
              return {
                progressoSectionId: section.id,
                progressoItemLabel: hit.label,
              };
            }
          }
          return {};
        })(),
      },
    }));

  return [
    ...mapPool(PROXIMAS_ETAPAS, "futura"),
    ...mapPool(EM_ANDAMENTO, "em_andamento"),
    ...mapPool(TAREFAS_CONCLUIDAS, "conclu${u(0xed)}da"),
  ];
}

function fromRoadmap(): PlaneamentoEntry[] {
  return getRoadmap().flatMap((phase) =>
    phase.tasks.map((task) => {
      let stage: PlaneamentoStage = "futura";
      if (task.status === "done") stage = "conclu${u(0xed)}da";
      else if (task.status === "in_progress") stage = "em_andamento";
      else if (phase.status === "todo" && task.status === "todo") stage = "dependente";

      return {
        id: \`rm-\${task.id}\`,
        title: task.title,
        summary: \`\${phase.title} ${em} \${task.description}\`,
        stage,
        source: "projectRoadmap" as const,
        links: {
          progressoResumoId: findResumoId(task.title),
          newsMatchToken: task.title,
          ...(() => {
            for (const section of PROGRESSO_SECTIONS) {
              const hit = section.items.find((it) => overlap(it.label, task.title));
              if (hit) {
                return {
                  progressoSectionId: section.id,
                  progressoItemLabel: hit.label,
                };
              }
            }
            return {};
          })(),
        },
      };
    })
  );
}

/** Etapa removida conhecida (registry) ${em} planeamento semanal legado. */
function fromRemovedKnown(): PlaneamentoEntry[] {
  return [
    {
      id: "removed-roadmap-semanal-legado",
      title: "Roadmap semanal (legado)",
      summary:
        "Planeamento semanal removido e substitu${u(0xed)}do por Phases com progresso global e por fase.",
      stage: "bloqueada",
      source: "removedRegistry",
      links: {
        removedId: "roadmap-semanal-legado",
        newsMatchToken: "Roadmap semanal",
      },
    },
  ];
}

function dedupe(entries: PlaneamentoEntry[]): PlaneamentoEntry[] {
  const seen = new Map<string, PlaneamentoEntry>();
  for (const e of entries) {
    const key = norm(e.title);
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, e);
      continue;
    }
    // Preferir liga${u(0xe7)}${u(0xf5)}es mais ricas.
    seen.set(key, {
      ...prev,
      ...e,
      links: { ...prev.links, ...e.links },
      stage: prev.stage === "conclu${u(0xed)}da" || e.stage === "conclu${u(0xed)}da"
        ? "conclu${u(0xed)}da"
        : e.stage,
    });
  }
  return [...seen.values()];
}

/** Lista tipada das etapas de planeamento (derivada, sem inventar texto). */
export function buildPlaneamentoEtapas(): PlaneamentoEntry[] {
  return dedupe([
    ...fromResumo(),
    ...fromProgressoSections(),
    ...fromRoadmap(),
    ...fromRemovedKnown(),
  ]);
}

export function groupEtapasByStage(
  etapas: PlaneamentoEntry[]
): Record<PlaneamentoStage, PlaneamentoEntry[]> {
  const empty: Record<PlaneamentoStage, PlaneamentoEntry[]> = {
    futura: [],
    em_andamento: [],
    "conclu${u(0xed)}da": [],
    bloqueada: [],
    dependente: [],
  };
  for (const e of etapas) empty[e.stage].push(e);
  return empty;
}

/** Reexport label helper for UI consumers that import etapas module. */
export { statusLabel };
`
);

w(
  "src/core/docs/planeamento/loadHubPlaneamento.ts",
  `/**
 * Loader local de ${Planeamento} Futuro para o Hub (sem fetch).
 * N${u(0xe3)}o altera loaders existentes de progresso/refs/whatsnew/removed.
 */

import {
  buildPlaneamentoEtapas,
  groupEtapasByStage,
} from "./planeamentoEtapas";
import { buildPlaneamentoRoadmapView } from "./planeamentoRoadmap";
import { PLANEAMENTO_NOTAS } from "./planeamentoNotas";
import type { HubPlaneamentoSnapshot } from "./planeamentoTypes";

export function loadHubPlaneamento(): HubPlaneamentoSnapshot {
  const etapas = buildPlaneamentoEtapas();
  const stages = groupEtapasByStage(etapas);
  const roadmap = buildPlaneamentoRoadmapView();

  return {
    etapas,
    stages,
    roadmapPhases: roadmap.phases,
    roadmapProgress: roadmap.progress,
    notas: PLANEAMENTO_NOTAS,
    concluidaNoResumo: stages["conclu${u(0xed)}da"].filter((e) => e.links?.progressoResumoId),
  };
}
`
);

w(
  "src/core/docs/planeamento/index.ts",
  `/**
 * ${Planeamento} Futuro ${em} barrel (Fase 10).
 */

export type {
  PlaneamentoStage,
  PlaneamentoSource,
  PlaneamentoLinks,
  PlaneamentoEntry,
  PlaneamentoNote,
  PlaneamentoRoadmapPhaseView,
  HubPlaneamentoSnapshot,
} from "./planeamentoTypes";

export { buildPlaneamentoEtapas, groupEtapasByStage } from "./planeamentoEtapas";
export { PLANEAMENTO_NOTAS } from "./planeamentoNotas";
export {
  buildPlaneamentoRoadmapView,
  getRoadmap,
  getCurrentPhase,
  getGlobalProgress,
  getPhaseProgress,
  getRoadmapStats,
  statusLabel,
} from "./planeamentoRoadmap";
export { loadHubPlaneamento } from "./loadHubPlaneamento";
`
);

console.log("planeamento module written");
