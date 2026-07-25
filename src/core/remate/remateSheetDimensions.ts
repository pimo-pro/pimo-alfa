import { getMaterialByIdOrLabel } from "../materials/service";
import type { RematePiece } from "./rematePieceTypes";

/** Espessura da chapa (mm) — sempre derivada do material associado. */
export function resolveRemateMaterialThicknessMm(remate: Pick<RematePiece, "materialPresetId">): number {
  const material = getMaterialByIdOrLabel(remate.materialPresetId);
  const sheetThicknessMm = Number(material?.sheetThicknessMm);
  if (Number.isFinite(sheetThicknessMm) && sheetThicknessMm > 0) {
    return sheetThicknessMm;
  }
  const legacyThicknessMm = Number(material?.espessura);
  return Number.isFinite(legacyThicknessMm) && legacyThicknessMm > 0 ? legacyThicknessMm : 19;
}

/** Dimensões planas para cutlist / nesting / TCN (peça de chapa). */
export function resolveRemateSheetCutDimensions(remate: Pick<RematePiece, "width" | "height" | "materialPresetId">): {
  comprimentoMm: number;
  larguraMm: number;
  espessuraMm: number;
} {
  const espessuraMm = resolveRemateMaterialThicknessMm(remate);
  // Não inventar 1×1 mm — dims em falta ficam 0 (cutlist filtra).
  return {
    comprimentoMm: Math.max(0, Number(remate.width) || 0),
    larguraMm: Math.max(0, Number(remate.height) || 0),
    espessuraMm,
  };
}

/** Profundidade 3D no viewer = espessura do material (sem campo manual). */
export function resolveRemateViewerDepthMm(remate: Pick<RematePiece, "materialPresetId">): number {
  return resolveRemateMaterialThicknessMm(remate);
}
