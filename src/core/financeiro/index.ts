export {
  FINANCEIRO_IVA_DEFAULT_PCT,
  FINANCEIRO_CUSTO_KEYS,
  FINANCEIRO_CUSTO_MATERIAL_KEYS,
  emptyFinanceiroOverrides,
  normalizeFinanceiroOverrides,
  defaultFinanceiroAdminSettings,
  normalizeFinanceiroAdminSettings,
} from "./financeiroUnificadoTypes";
export type {
  FinanceiroChapasMode,
  FinanceiroCustoKey,
  FinanceiroCustoMaterialKey,
  FinanceiroCustosOverrides,
  FinanceiroOverrides,
  FinanceiroUnificadoSnapshot,
  FinanceiroAdminSettings,
} from "./financeiroUnificadoTypes";

export {
  computeFinanceiroAdminCustos,
  loadGlobalFinanceiroAdminSettings,
  saveGlobalFinanceiroAdminSettings,
  FINANCEIRO_ADMIN_SETTINGS_STORAGE_KEY,
} from "./financeiroAdminRules";
export type {
  FinanceiroAdmSettings,
  FinanceiroMontagemSettings,
  FinanceiroPortesSettings,
  FinanceiroMontagemMode,
  FinanceiroValorMode,
} from "./financeiroAdminRules";

export {
  classifyFinanceiroCustoKey,
  computeFinanceiroUnificado,
  financeiroCustoRows,
  financeiroMetricRows,
} from "./financeiroUnificado";
export type { FinanceiroUnificadoProjectSlice } from "./financeiroUnificado";

export {
  buildFinanceiroPecasRows,
  buildFinanceiroPecasPdfRows,
  financeiroPecasPdfHead,
} from "./financeiroPecasBuilder";
export type { FinanceiroPecaRow, FinanceiroPecasBuildInput } from "./financeiroPecasBuilder";
