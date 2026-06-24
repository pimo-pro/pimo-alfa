import type { CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";
import type { MaterialRecord } from "../materials/types";
import { getMaterialByIdOrLabel } from "../materials/service";
import { getDefaultOfficialMaterial } from "../materials/materials.api";
import {
  getCutlistItemNestingGroupKey,
  inferCutlistItemThicknessMm,
  resolveCanonicalMaterialIdForNesting,
} from "./industrialNestingGroup";

/** @deprecated Use formatThicknessFolderSuffix — mantido para referências legadas internas. */
export function formatThicknessBucket(thicknessMm: number): string {
  return formatThicknessFolderSuffix(thicknessMm).toLowerCase();
}

export function formatThicknessFolderSuffix(thicknessMm: number): string {
  if (!Number.isFinite(thicknessMm) || thicknessMm <= 0) return "0MM";
  const rounded = Math.round(thicknessMm * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", "_");
  return `${label}MM`;
}

/** Token de material para pastas CNC: MDF_BRANCO, HDF_CRU, … */
export function formatMaterialFolderToken(materialLabel: string): string {
  return (
    String(materialLabel ?? "MATERIAL")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\p{L}\p{N}_-]+/gu, "")
      .toUpperCase()
      .slice(0, 48) || "MATERIAL"
  );
}

/** Nome de pasta CNC: MDF_BRANCO_19MM */
export function formatMaterialThicknessFolderName(
  materialLabel: string,
  thicknessMm: number
): string {
  return `${formatMaterialFolderToken(materialLabel)}_${formatThicknessFolderSuffix(thicknessMm)}`;
}

export function resolveMaterialLabelForCutlistItem(
  item: CutlistItemForPieces,
  materials?: MaterialRecord[]
): string {
  const thickness = inferCutlistItemThicknessMm(item);
  const materialRef = String(item.materialId ?? item.material ?? "").trim();
  const canonicalId = resolveCanonicalMaterialIdForNesting(materialRef, thickness);

  if (materials?.length) {
    const fromList = materials.find(
      (m) =>
        m.id === canonicalId ||
        m.label.trim().toLowerCase() === materialRef.toLowerCase() ||
        m.industrialMaterialId?.trim().toLowerCase() === materialRef.toLowerCase()
    );
    if (fromList?.label?.trim()) return fromList.label.trim();
  }

  const resolved =
    getMaterialByIdOrLabel(canonicalId) ??
    (materialRef ? getMaterialByIdOrLabel(materialRef) : null);
  return resolved?.label?.trim() || materialRef || getDefaultOfficialMaterial().label;
}

/**
 * Agrupa itens por material + espessura (mesma chave do motor de nesting).
 */
export function groupCutlistItemsByMaterialAndThickness<T extends CutlistItemForPieces>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getCutlistItemNestingGroupKey(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

/** @deprecated Preferir groupCutlistItemsByMaterialAndThickness. */
export function groupCutlistItemsByThickness<T extends CutlistItemForPieces>(
  items: T[]
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const raw = inferCutlistItemThicknessMm(item);
    if (!Number.isFinite(raw) || raw <= 0) continue;
    const key = Math.round(raw * 100) / 100;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

export function sortThicknessKeys(keys: Iterable<number>): number[] {
  return [...keys].sort((a, b) => a - b);
}

export function sortMaterialThicknessGroupKeys(
  keys: Iterable<string>,
  itemsByKey: Map<string, CutlistItemForPieces[]>,
  materials?: MaterialRecord[]
): string[] {
  return [...keys].sort((a, b) => {
    const sampleA = itemsByKey.get(a)?.[0];
    const sampleB = itemsByKey.get(b)?.[0];
    const labelA = sampleA ? resolveMaterialLabelForCutlistItem(sampleA, materials) : a;
    const labelB = sampleB ? resolveMaterialLabelForCutlistItem(sampleB, materials) : b;
    const cmp = labelA.localeCompare(labelB, "pt");
    if (cmp !== 0) return cmp;
    const tA = sampleA ? inferCutlistItemThicknessMm(sampleA) : 0;
    const tB = sampleB ? inferCutlistItemThicknessMm(sampleB) : 0;
    return tA - tB;
  });
}

/** Nome do PDF de layout dentro da pasta CNC. */
export function industrialThicknessLayoutPdfFileName(bucket: string): string {
  return `layout_${bucket}.pdf`;
}

/** Nome do PDF de etiquetas dentro da pasta CNC. */
export function industrialThicknessEtiquetasPdfFileName(bucket: string): string {
  return `etiquetas_${bucket}.pdf`;
}

export function industrialThicknessCncBasePath(bucket: string): string {
  return `cnc/${bucket}`;
}

export function industrialThicknessLayoutPdfPath(bucket: string): string {
  return `${industrialThicknessCncBasePath(bucket)}/${industrialThicknessLayoutPdfFileName(bucket)}`;
}

export function industrialThicknessEtiquetasPdfPath(bucket: string): string {
  return `${industrialThicknessCncBasePath(bucket)}/${industrialThicknessEtiquetasPdfFileName(bucket)}`;
}

export function industrialThicknessTcnDirPath(bucket: string): string {
  return `${industrialThicknessCncBasePath(bucket)}/tcn`;
}
