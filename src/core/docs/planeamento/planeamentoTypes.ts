/**
 * Tipos do hub — Planeamento Futuro (Fase 10).
 */

export type PlaneamentoStage =
  | "futura"
  | "em_andamento"
  | "concluída"
  | "bloqueada"
  | "dependente";

export type PlaneamentoSource =
  | "progressoSections"
  | "progressoResumo"
  | "projectRoadmap"
  | "removedRegistry"
  | "painelReferencia";

export type PlaneamentoLinks = {
  /** Secção em PROGRESSO_SECTIONS (id). */
  progressoSectionId?: string;
  /** Label do item em progressoSections (ligação cruzada). */
  progressoItemLabel?: string;
  /** Id em progressoResumo (TAREFAS_CONCLUIDAS / EM_ANDAMENTO / PROXIMAS). */
  progressoResumoId?: string;
  /** Id estático conhecido em removed.json (sem fetch no loader). */
  removedId?: string;
  /** Id de nota em refs (opcional). */
  refsNoteId?: string;
  /** Token para matching de news.json no UI (título normalizado). */
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
  /** Itens concluídos espelhados no progressoResumo (ligação). */
  concluidaNoResumo: PlaneamentoEntry[];
};
