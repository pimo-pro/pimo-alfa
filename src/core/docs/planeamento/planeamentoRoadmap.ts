/**
 * Roadmap futuro — reexport do SSOT projectRoadmap + helpers de vista.
 * Não altera storage nem loaders existentes.
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

/** Extensão: vista tipada das fases para o Hub de Planeamento. */
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
