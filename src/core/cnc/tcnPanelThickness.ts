import type { CutPlacement, SheetDefinition } from "../cutlayout/cutLayoutTypes";
import { listMaterials } from "../materials/service";

/**
 * Espessura canónica do painel para TCN: sempre `CutPlacement.espessura_mm` quando válida;
 * fallback à espessura da chapa do layout (stock do grupo).
 */
export function resolveTcnPanelThicknessMm(pl: CutPlacement, sheet: SheetDefinition): number {
  const panel = Number(pl.espessura_mm);
  const sheetT = Number(sheet.espessura_mm);
  const used = Number.isFinite(panel) && panel > 0 ? panel : sheetT;
  return Math.max(0.1, used);
}

/**
 * Valor DS do cabeçalho `::UNm`: espessura real do(s) painel(is), via `resolveTcnPanelThicknessMm` — não a chapa stock.
 * Sem peças → fallback à espessura da chapa. Várias espessuras na mesma folha → máximo (nesting homogéneo é o caso usual).
 */
export function resolveTcnUnmDsMm(placements: CutPlacement[], sheet: SheetDefinition): number {
  const sheetT = Math.max(0.1, Number(sheet.espessura_mm) || 0.1);
  if (placements.length === 0) return sheetT;
  const mms = placements.map((pl) => resolveTcnPanelThicknessMm(pl, sheet));
  const rounded = mms.map((t) => Math.round(t * 1000) / 1000);
  const uniq = new Set(rounded);
  return uniq.size === 1 ? mms[0]! : Math.max(...mms);
}

/** DEV: compara espessura da peça vs catálogo de materiais vs chapa (diagnóstico FASE 7G). */
export function logTcnThicknessDebug(pl: CutPlacement, sheet: SheetDefinition): void {
  if (!import.meta.env.DEV) return;
  const panel = Number(pl.espessura_mm);
  let materialT = Number.NaN;
  const mid = pl.materialId;
  if (mid) {
    const m = listMaterials().find((x) => String(x.id) === String(mid));
    if (m) materialT = Number(m.sheetThicknessMm);
  }
  const sheetT = Number(sheet.espessura_mm);
  const usado = resolveTcnPanelThicknessMm(pl, sheet);
  console.debug(
    `[TCN-THICKNESS] panel=${panel} material=${materialT} sheet=${sheetT} usado=${usado} part=${pl.partName ?? ""}`
  );
}
