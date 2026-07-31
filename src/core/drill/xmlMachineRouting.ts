/**
 * Routing industrial: peça ? máquina XML (CNC vs DRILL).
 *
 * CNC (`cnc/XML/{qr}.xml`): cima, fundo, costa de módulo, frentes/portas, prateleira.
 * DRILL (`drill/XML/{qr}_DRILL.xml`): laterais módulo, laterais/costa/frente gaveta, sep, div.
 * COMPLETO (`drill/XML/{qr}_COMPLETO.xml`): auditoria — todas as peças com XML (CNC+DRILL).
 */

import type { CutListItemComPreco } from "../types";
import { isLateralPanel } from "./lateralDowels";
import { isDrawerPieceTipo } from "../../services/drawerCutlistAdapter";

/** Destino de ficheiro no export. `completo` = cópia de auditoria em drill/XML. */
export type XmlMachineTarget = "cnc" | "drill" | "completo";

const CNC_TIPOS = new Set([
  "cima",
  "fundo",
  "costa",
  "COSTA",
  "frente_fixa",
  "porta",
  "porta_simples",
  "porta_dupla",
  "porta_correr",
  "prateleira",
]);

const DRILL_TIPOS = new Set([
  "lateral_esquerda",
  "lateral_direita",
  "gaveta_lat_esq",
  "gaveta_lat_dir",
  "gaveta_traseira",
  "gaveta_frente",
  "gaveta_frente_int",
  "gaveta_frente_ext",
  "divisorio",
  "separador",
  // Caixa / variantes industriais (cx_gav_*)
  "cx_gav_lat_dir",
  "cx_gav_lat_esq",
  "cx_gav_cima",
  "cx_gav_lat_direita",
  "cx_gav_lat_esquerda",
]);

/**
 * Destino de máquina da peça (CNC ou DRILL).
 * `null` = não gera XML de máquina (ex.: remate, rodapé, fundo de gaveta sem furos).
 * Nota: o ficheiro `_COMPLETO` é gerado à parte para todas as peças com XML.
 */
export function resolveXmlMachineTarget(
  item: Pick<CutListItemComPreco, "tipo" | "nome" | "drillHoles"> | string
): "cnc" | "drill" | null {
  const tipo = typeof item === "string" ? item : String(item.tipo ?? "");
  if (!tipo) return null;
  if (DRILL_TIPOS.has(tipo) || isLateralPanel({ tipo } as CutListItemComPreco)) return "drill";
  if (CNC_TIPOS.has(tipo)) return "cnc";

  const lower = tipo.toLowerCase();
  const nome =
    typeof item === "string" ? "" : String((item as { nome?: string }).nome ?? "").toLowerCase();
  const token = `${lower} ${nome}`;

  if (token.includes("cx_gav") || token.includes("cx-gav")) return "drill";
  if (lower.includes("lateral") && !lower.includes("gaveta")) return "drill";
  if (lower.startsWith("gaveta_lat") || lower.includes("gav_lat")) return "drill";
  if (lower === "gaveta_traseira" || lower.includes("gav_cost")) return "drill";
  if (lower.startsWith("gaveta_frente") || lower.includes("gav_frent")) return "drill";
  if (lower === "divisorio" || lower === "separador" || lower === "div" || lower === "sep") {
    return "drill";
  }
  if (
    lower === "cima" ||
    lower === "fundo" ||
    lower === "costa" ||
    lower.startsWith("porta") ||
    lower === "frente_fixa" ||
    lower === "prateleira"
  ) {
    return "cnc";
  }

  // Qualquer peça com furos que não seja CNC nesting ? DRILL
  if (typeof item !== "string") {
    const holes = (item as { drillHoles?: unknown[] }).drillHoles;
    if (Array.isArray(holes) && holes.length > 0 && isDrawerPieceTipo(tipo)) return "drill";
  }

  return null;
}

/** Peça deve ter etiqueta/passo DRILL activo (apenas estação DRILL — não COMPLETO). */
export function pieceShouldHaveDrillLabel(
  item: Pick<CutListItemComPreco, "tipo" | "nome" | "drillHoles">
): boolean {
  if (resolveXmlMachineTarget(item) !== "drill") return false;
  return (item.drillHoles?.length ?? 0) > 0 || isLateralPanel(item as CutListItemComPreco);
}

/** Peça elegível para XML na estação DRILL. */
export function isDrillStationXmlPiece(item: CutListItemComPreco): boolean {
  return resolveXmlMachineTarget(item) === "drill";
}

/** Peça elegível para XML na estação CNC (furação em CNC). */
export function isCncStationXmlPiece(item: CutListItemComPreco): boolean {
  return resolveXmlMachineTarget(item) === "cnc";
}

export function isDrawerDrillPieceTipo(tipo: string): boolean {
  return (
    tipo === "gaveta_lat_esq" ||
    tipo === "gaveta_lat_dir" ||
    tipo === "gaveta_traseira" ||
    tipo === "gaveta_frente" ||
    tipo === "gaveta_frente_int" ||
    tipo === "gaveta_frente_ext" ||
    (isDrawerPieceTipo(tipo) && resolveXmlMachineTarget(tipo) === "drill")
  );
}
