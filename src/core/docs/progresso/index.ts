/**
 * Progresso do Projeto  barrel (Fase 9).
 */

export type {
  ProgressoItemStatus,
  ProgressoSection,
  ProgressoSectionItem,
  ProgressoCounters,
  HubProgressoSnapshot,
} from "./progressoTypes";
export { PROGRESSO_SECTIONS } from "./progressoSections";
export { computeProgressoCounters } from "./progressoCounters";
export { loadHubProgresso } from "./loadHubProgresso";
export {
  getRoadmap,
  getCurrentPhase,
  getGlobalProgress,
  getPhaseProgress,
  getRoadmapStats,
  statusLabel,
} from "./progressoRoadmap";
