/**
 * FASE 5 — Leitura de profundidades para UI apenas (paridade com cutlist FASE 4).
 * Não altera fabricação nem dimensões de peças.
 */

import { getProfundidadeInternaUtilMm } from "../core/box/boxDepthHelpers";
import { buildEffectiveDrillingRules } from "../modules/drilling/drillingAdapter";
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
  rules: RulesConfig
): BoxProfundidadeLeituraMm {
  const effRules = buildEffectiveDrillingRules(rules);
  const profundidadeExternaMm = Number(box.profundidadeExterna ?? box.dimensoes.profundidade) || 0;
  const profundidadeInternaUtilMm = getProfundidadeInternaUtilMm(
    {
      dimensoes: { profundidade: profundidadeExternaMm },
      espessura: box.espessura,
      portaTipo: box.portaTipo,
      doorsLayer: box.doorsLayer,
      costaAtiva: box.costaAtiva,
    },
    effRules.madeira.espessuraCosta
  );
  return { profundidadeExternaMm, profundidadeInternaUtilMm };
}
