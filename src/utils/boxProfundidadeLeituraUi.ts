/**
 * FASE 5 — Leitura de profundidades para UI apenas (paridade com cutlist FASE 4).
 * Não altera fabricação nem dimensões de peças.
 */

import { getProfundidadeInternaUtilMm } from "../core/box/boxDepthHelpers";
import { COSTA_INDUSTRIAL_CANONICAL_ID } from "../core/materials/materials.api";
import { getIndustrialMaterial } from "../core/materials/service";
import type { RulesConfig } from "../core/rules/rulesConfig";
import type { BoxModule } from "../core/types";

/** Subconjunto comum a `WorkspaceBox` e `BoxModule` para o cálculo de leitura. */
export type BoxLikeProfundidadeLeitura = Pick<
  BoxModule,
  "dimensoes" | "espessura" | "portaTipo" | "doorsLayer" | "costaAtiva" | "profundidadeExterna"
>;

export type BoxProfundidadeLeituraMm = {
  profundidadeExternaMm: number;
  profundidadeInternaUtilMm: number;
};

export function computeBoxProfundidadeLeituraMm(
  box: BoxLikeProfundidadeLeitura,
  _rules: RulesConfig
): BoxProfundidadeLeituraMm {
  const profundidadeExternaMm = Number(box.profundidadeExterna ?? box.dimensoes.profundidade) || 0;
  const profundidadeInternaUtilMm = getProfundidadeInternaUtilMm(
    {
      dimensoes: { profundidade: profundidadeExternaMm },
      espessura: box.espessura,
      portaTipo: box.portaTipo,
      doorsLayer: box.doorsLayer,
      costaAtiva: box.costaAtiva,
    },
    getIndustrialMaterial(COSTA_INDUSTRIAL_CANONICAL_ID).espessuraPadrao
  );
  return { profundidadeExternaMm, profundidadeInternaUtilMm };
}
