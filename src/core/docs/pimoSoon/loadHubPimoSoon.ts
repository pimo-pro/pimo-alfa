/**
 * Loader local de pimo-soon (Plano Futuro) — sem fetch.
 */

import { PIMO_SOON_FASES } from "./pimoSoonFases";
import { PIMO_SOON_NOTAS } from "./pimoSoonNotas";
import type { HubPimoSoonSnapshot } from "./pimoSoonTypes";

export function loadHubPimoSoon(): HubPimoSoonSnapshot {
  return {
    tag: "pimo-soon",
    title: "pimo-soon — Plano Futuro",
    blurb:
      "Plano futuro do projeto: fases que poderão ser desenvolvidas posteriormente, sem pressão e sem impacto no pipeline industrial. Base estratégica para evolução contínua do sistema.",
    fases: PIMO_SOON_FASES,
    notas: PIMO_SOON_NOTAS,
  };
}
