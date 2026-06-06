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
  return {
    comprimentoMm: Math.max(1, remate.width),
    larguraMm: Math.max(1, remate.height),
    espessuraMm,
  };
}

/** Profundidade 3D no viewer = espessura do material (sem campo manual). */
export function resolveRemateViewerDepthMm(remate: Pick<RematePiece, "materialPresetId">): number {
  return resolveRemateMaterialThicknessMm(remate);
}
