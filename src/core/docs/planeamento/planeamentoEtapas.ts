/**
 * Etapas futuras — snapshot tipado derivado de SSOTs existentes.
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function norm(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
  if (low.includes("depend") || low.includes("depois de") || low.includes("após")) {
    return "dependente";
  }
  if (status === "completed") return "concluída";
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
      // Planeamento foca futuro + andamento + bugs + TODOs; concluídos só se ligam ao resumo.
      if (item.status === "completed") {
        const resumoId = findResumoId(item.label);
        if (!resumoId) continue;
        out.push({
          id: `ps-${section.id}-${slug(item.label)}`,
          title: item.label,
          summary: section.title,
          stage: "concluída",
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
        id: `ps-${section.id}-${slug(item.label)}`,
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
      id: `resumo-${item.id}`,
      title: item.titulo,
      summary: "progressoResumo",
      stage,
      source: "progressoResumo" as const,
      links: {
        progressoResumoId: item.id,
        newsMatchToken: item.titulo,
        // Ligação cruzada a secção de progresso quando o título existe lá.
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
    ...mapPool(TAREFAS_CONCLUIDAS, "concluída"),
  ];
}

function fromRoadmap(): PlaneamentoEntry[] {
  return getRoadmap().flatMap((phase) =>
    phase.tasks.map((task) => {
      let stage: PlaneamentoStage = "futura";
      if (task.status === "done") stage = "concluída";
      else if (task.status === "in_progress") stage = "em_andamento";
      else if (phase.status === "todo" && task.status === "todo") stage = "dependente";

      return {
        id: `rm-${task.id}`,
        title: task.title,
        summary: `${phase.title} — ${task.description}`,
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

/** Etapa removida conhecida (registry) — planeamento semanal legado. */
function fromRemovedKnown(): PlaneamentoEntry[] {
  return [
    {
      id: "removed-roadmap-semanal-legado",
      title: "Roadmap semanal (legado)",
      summary:
        "Planeamento semanal removido e substituído por Phases com progresso global e por fase.",
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
    // Preferir ligações mais ricas.
    seen.set(key, {
      ...prev,
      ...e,
      links: { ...prev.links, ...e.links },
      stage: prev.stage === "concluída" || e.stage === "concluída"
        ? "concluída"
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
    "concluída": [],
    bloqueada: [],
    dependente: [],
  };
  for (const e of etapas) empty[e.stage].push(e);
  return empty;
}

/** Reexport label helper for UI consumers that import etapas module. */
export { statusLabel };
