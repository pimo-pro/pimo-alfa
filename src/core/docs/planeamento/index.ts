/**
 * Planeamento Futuro — barrel (Fase 10).
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
