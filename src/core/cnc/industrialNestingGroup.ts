import type { CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";
import type { CutPiece } from "../cutlayout/cutLayoutTypes";
import {
  getDefaultOfficialMaterial,
  resolveIndustrialMaterialAtThickness,
} from "../materials/materials.api";

export function inferCutlistItemThicknessMm(item: CutlistItemForPieces): number {
  const fromEspessura = Number((item as { espessura?: number }).espessura);
  if (Number.isFinite(fromEspessura) && fromEspessura > 0) return fromEspessura;
  const fromEspessuraMm = Number((item as { espessura_mm?: number }).espessura_mm);
  if (Number.isFinite(fromEspessuraMm) && fromEspessuraMm > 0) return fromEspessuraMm;
  const fromDepth = Number(item.dimensoes?.profundidade);
  if (Number.isFinite(fromDepth) && fromDepth > 0) return fromDepth;
  return 0;
}

/** Chave canónica de agrupamento: materialId + espessura (mesma lógica do motor de nesting). */
export function getIndustrialNestingGroupKey(
  materialId: string | undefined,
  thicknessMm: number
): string {
  const mat = (materialId ?? "material").trim() || "material";
  const t = Math.round(Math.abs(thicknessMm) * 100) / 100;
  return `${mat}|${t}`;
}

export function resolveCanonicalMaterialIdForNesting(
  materialRef: string | undefined,
  thicknessMm: number
): string {
  const raw = (materialRef ?? "").trim();
  if (!raw) return "material";
  const resolved = resolveIndustrialMaterialAtThickness(
    raw,
    thicknessMm,
    getDefaultOfficialMaterial().canonicalId
  );
  return resolved.materialId;
}

export function getCutlistItemNestingGroupKey(item: CutlistItemForPieces): string {
  const thickness = inferCutlistItemThicknessMm(item);
  const materialRef = String(item.materialId ?? item.material ?? "").trim() || undefined;
  return getIndustrialNestingGroupKey(
    resolveCanonicalMaterialIdForNesting(materialRef, thickness),
    thickness
  );
}

export function getCutPieceNestingGroupKey(piece: CutPiece): string {
  return getIndustrialNestingGroupKey(piece.materialId, piece.espessura_mm);
}

export function sanitizeIndustrialFileToken(value: string, fallback = "Sheet"): string {
  return value.replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_-]+/gu, "_") || fallback;
}
