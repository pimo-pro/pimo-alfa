/**
 * Fase 5E — activação controlada de Chapas Reais.
 * Default global permanece `por_peca`; activação só via Admin → Orçamentos.
 */

import type { OrcamentosMaterialCostMode } from "./orcamentosTypes";

/** Default de fábrica — não alterar sem decisão explícita de produto. */
export const ORCAMENTOS_MATERIAL_COST_MODE_DEFAULT: OrcamentosMaterialCostMode = "por_peca";

/**
 * Procedimento de activação em produção (Admin).
 * €/chapa = derivado (€/m² × área chapa); sem campo de tarifa manual.
 */
export const CHAPAS_REAIS_ACTIVATION_STEPS = [
  "Confirmar €/m² do material dominante (catálogo / pricing) — o €/chapa deriva automaticamente (€/m² × área da chapa padrão).",
  "Admin → Sistema → Orçamentos: modo «Por chapas reais (exclusivo)» → Guardar.",
  "Financeiro Unificado: Painéis a 0 €; Chapas reais = N × €/chapa só com nesting em modo Real (sheets[]).",
  "Se o badge for Estimado, Chapas reais = 0 € até haver sheets reais — ler avisos no painel.",
  "Gavetas (montagem N×€), ferragens, orla e operações não são zerados pelo modo chapas.",
] as const;

export const CHAPAS_REAIS_ACTIVATION_WARNING =
  "Modo exclusivo: substitui o custo material por peça (Painéis / portas de divisão / remates). " +
  "O default global continua «Por peça» — esta mudança só afecta a fábrica após Guardar nas Orçamentos.";
