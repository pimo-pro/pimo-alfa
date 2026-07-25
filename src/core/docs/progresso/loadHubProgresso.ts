/**
 * Loader local de Progresso para o Hub (sem fetch).
 */

import { PROGRESSO_SECTIONS } from "./progressoSections";
import { computeProgressoCounters } from "./progressoCounters";
import {
  getCurrentPhase,
  getRoadmap,
  getRoadmapStats,
} from "./progressoRoadmap";
import {
  EM_ANDAMENTO,
  PROXIMAS_ETAPAS,
  TAREFAS_CONCLUIDAS,
} from "../progressoResumo";
import type { HubProgressoSnapshot } from "./progressoTypes";

export function loadHubProgresso(): HubProgressoSnapshot {
  const phases = getRoadmap();
  const stats = getRoadmapStats(phases);
  const current = getCurrentPhase(phases);

  return {
    sections: PROGRESSO_SECTIONS,
    counters: computeProgressoCounters(),
    concluidas: TAREFAS_CONCLUIDAS.map((t) => ({ id: t.id, titulo: t.titulo })),
    emAndamento: EM_ANDAMENTO.map((t) => ({ id: t.id, titulo: t.titulo })),
    proximas: PROXIMAS_ETAPAS.map((t) => ({ id: t.id, titulo: t.titulo })),
    roadmap: {
      progress: stats.progress,
      totalPhases: stats.totalPhases,
      totalTasks: stats.totalTasks,
      doneTasks: stats.doneTasks,
      pendingTasks: stats.pendingTasks,
      currentPhaseTitle: current?.title ?? null,
    },
  };
}
