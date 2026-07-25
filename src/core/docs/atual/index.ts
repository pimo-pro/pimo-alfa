/**
 * Secção Atual — barrel (Fase 11).
 */

export type {
  AtualAlertLevel,
  AtualAlert,
  AtualKpi,
  AtualPhaseSummary,
  AtualResumo,
  AtualHistoricoItem,
  AtualRecentChange,
  AtualSnapshot,
} from "./atualTypes";

export { buildAtualSnapshot } from "./atualSnapshot";
export { loadHubAtual } from "./loadHubAtual";
