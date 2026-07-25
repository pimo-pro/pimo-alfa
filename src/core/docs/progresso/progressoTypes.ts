/**
 * Tipos do hub  Progresso do Projeto (Fase 9).
 */

export type {
  ProgressoItemStatus,
  ProgressoSection,
  ProgressoSectionItem,
} from "./progressoSections";

export type ProgressoCounters = {
  completed: number;
  inProgress: number;
  planned: number;
  total: number;
  completionPercent: number;
};

export type HubProgressoSnapshot = {
  sections: import("./progressoSections").ProgressoSection[];
  counters: ProgressoCounters;
  concluidas: { id: string; titulo: string }[];
  emAndamento: { id: string; titulo: string }[];
  proximas: { id: string; titulo: string }[];
  roadmap: {
    progress: number;
    totalPhases: number;
    totalTasks: number;
    doneTasks: number;
    pendingTasks: number;
    currentPhaseTitle: string | null;
  };
};
