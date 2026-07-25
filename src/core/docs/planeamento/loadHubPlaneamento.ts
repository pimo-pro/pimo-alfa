/**
 * Loader local de Planeamento Futuro para o Hub (sem fetch).
 * Não altera loaders existentes de progresso/refs/whatsnew/removed.
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
    concluidaNoResumo: stages["concluída"].filter((e) => e.links?.progressoResumoId),
  };
}
