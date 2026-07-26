/**
 * enforcePdfIdentity.ts — Linhas PDF com identidade industrial SSOT.
 */

import type { DrawerPDFSection } from "../types";
import { enforceNaming } from "./enforceNaming";
import { resolveBaseCode } from "./namingMap";

/**
 * Corrige nomes/códigos nas tabelas PDF sem alterar layout/medidas.
 */
export function enforcePdfIdentity(
  pdf: DrawerPDFSection,
  options?: { drawerCount?: number }
): DrawerPDFSection {
  const drawerCount = Math.max(1, options?.drawerCount ?? 1);

  const pieceRows = pdf.pieceRows.map((row) => {
    // Extrair código entre [codigo] se existir
    const bracket = /\[([^\]]+)\]/.exec(row.nome);
    const rawCode = bracket?.[1];
    const rawName = row.nome.replace(/\s*\[[^\]]+\]\s*/g, "").trim();
    const id = enforceNaming({
      nome: rawName,
      codigo: rawCode,
      drawerCount,
      drawerIndex0: 0,
    });
    if (!id) return row;
    return {
      ...row,
      nome: `${id.nome} [${id.codigo}]`,
    };
  });

  const holeRows = pdf.holeRows.map((row) => {
    const base = resolveBaseCode(row.peca);
    if (!base) return row; // module_* / hardware refs
    const id = enforceNaming({
      pieceRef: row.peca,
      codigo: row.peca,
      drawerCount,
      drawerIndex0: 0,
    });
    if (!id) return row;
    return { ...row, peca: id.codigo };
  });

  return {
    ...pdf,
    pieceRows,
    holeRows,
  };
}
