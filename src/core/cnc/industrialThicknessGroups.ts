import type { CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";
import { inferCutlistItemThicknessMm } from "./industrialNestingGroup";

/** Nome de pasta ZIP para uma espessura (ex.: 18mm, 19_5mm). */
export function formatThicknessBucket(thicknessMm: number): string {
  if (!Number.isFinite(thicknessMm) || thicknessMm <= 0) return "0mm";
  const rounded = Math.round(thicknessMm * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", "_");
  return `${label}mm`;
}

function normalizeThicknessKey(thicknessMm: number): number {
  return Math.round(thicknessMm * 100) / 100;
}

/**
 * Agrupa itens de cutlist por espessura (mm).
 * Deve ser executado antes de CutLayout, TCN ou Etiquetas industriais.
 */
export function groupCutlistItemsByThickness<T extends CutlistItemForPieces>(
  items: T[]
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const raw = inferCutlistItemThicknessMm(item);
    if (!Number.isFinite(raw) || raw <= 0) continue;
    const key = normalizeThicknessKey(raw);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

export function sortThicknessKeys(keys: Iterable<number>): number[] {
  return [...keys].sort((a, b) => a - b);
}

/** Nome do PDF de layout: layout_18mm.pdf, layout_19_5mm.pdf, … */
export function industrialThicknessLayoutPdfFileName(thicknessMm: number): string {
  return `layout_${formatThicknessBucket(thicknessMm)}.pdf`;
}

/** Nome do PDF de etiquetas: etiquetas_18mm.pdf, etiquetas_19_5mm.pdf, … */
export function industrialThicknessEtiquetasPdfFileName(thicknessMm: number): string {
  return `etiquetas_${formatThicknessBucket(thicknessMm)}.pdf`;
}

export function industrialThicknessCncBasePath(thicknessMm: number): string {
  return `cnc/${formatThicknessBucket(thicknessMm)}`;
}

export function industrialThicknessLayoutPdfPath(thicknessMm: number): string {
  return `${industrialThicknessCncBasePath(thicknessMm)}/${industrialThicknessLayoutPdfFileName(thicknessMm)}`;
}

export function industrialThicknessEtiquetasPdfPath(thicknessMm: number): string {
  return `${industrialThicknessCncBasePath(thicknessMm)}/${industrialThicknessEtiquetasPdfFileName(thicknessMm)}`;
}

export function industrialThicknessTcnDirPath(thicknessMm: number): string {
  return `${industrialThicknessCncBasePath(thicknessMm)}/tcn`;
}
