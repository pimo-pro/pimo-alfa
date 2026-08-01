/**
 * Partição de custos ADMIN/Totais: Painéis (carcaça) vs Portas (material 1×).
 * Alinhado a classifyFinanceiroCustoKey — evita somar material de portas em Painéis + Portas.
 */

import { isIndustrialDoorPanelTipo } from "../doors/industrialDoorPanels";
import { classifyFinanceiroCustoKey } from "./financeiroUnificado";

/** Peça cujo material deve ir para Painéis (carcaça), não Portas/Gavetas/Remates. */
export function isCarcassPanelForAdminCost(tipo: string): boolean {
  return classifyFinanceiroCustoKey(tipo) === "paineis";
}

export function isDoorPieceForAdminCost(tipo: string): boolean {
  return isIndustrialDoorPanelTipo(tipo) || classifyFinanceiroCustoKey(tipo) === "portas";
}
