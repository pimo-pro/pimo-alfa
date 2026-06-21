import { divSepRulesStore } from "../../admin/rules/divSepRules/rulesStore";
import type { CavilhaLengthRule, DivSepRules } from "../../admin/rules/divSepRules/rulesDefaults";

export const DEFAULT_CAVILHA_LENGTH_RULES: CavilhaLengthRule[] = [
  { minMm: 60, maxMm: 99, offsetFromEdgeMm: 15 },
  { minMm: 100, maxMm: 150, offsetFromEdgeMm: 30 },
  { minMm: 151, maxMm: 199, offsetFromEdgeMm: 40 },
  { minMm: 200, maxMm: 1200, offsetFromEdgeMm: 60 },
];

export function getDivSepRules(): DivSepRules {
  return divSepRulesStore.get();
}

/**
 * Distância da borda (mm) para posicionamento de cavilha conforme comprimento da peça.
 * Regras configuráveis em ADMIN → Produtos → DIV/SEP Rules.
 */
export function calcularPosicaoCavilha(comprimento: number, rules?: DivSepRules): number {
  const cfg = rules ?? getDivSepRules();
  const length = Math.max(0, Number(comprimento) || 0);
  const table = cfg.cavilhaLengthRules?.length ? cfg.cavilhaLengthRules : DEFAULT_CAVILHA_LENGTH_RULES;
  for (const row of table) {
    if (length >= row.minMm && length <= row.maxMm) {
      return row.offsetFromEdgeMm;
    }
  }
  const last = table[table.length - 1];
  return last?.offsetFromEdgeMm ?? 60;
}

/** Posições simétricas ao longo do comprimento (mm a partir da origem 0). */
export function calcularPosicoesCavilha(comprimento: number, rules?: DivSepRules): number[] {
  const length = Math.max(0, Number(comprimento) || 0);
  if (length <= 0) return [];
  const offset = calcularPosicaoCavilha(length, rules);
  if (length <= offset * 2) {
    return [length / 2];
  }
  return [offset, length - offset];
}

export function getCavilhaDiameterMm(rules?: DivSepRules): number {
  return rules?.cavilhaDiameterMm ?? 10;
}

export function getCavilhaDepthMm(rules?: DivSepRules): number {
  return rules?.cavilhaDepthMm ?? 13;
}

export function getParafusoDistanceFromCavilhaMm(rules?: DivSepRules): number {
  return rules?.parafusoDistanceFromCavilhaMm ?? 30;
}
