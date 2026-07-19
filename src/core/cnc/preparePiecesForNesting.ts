import type { CutPiece } from "../cutlayout/cutLayoutTypes";
import { getMaterialByIdOrLabel } from "../materials/service";

/**
 * Enriquece pecas com dimensoes de chapa do material (mesma logica do pipeline CNC/TCN).
 * Extraido para reutilizacao em computeChapasReal sem alterar o comportamento TCN.
 */
export function enrichPiecesWithMaterialSheetDimensions(pieces: CutPiece[]): CutPiece[] {
  return pieces.map((piece) => {
    const materialRecord = piece.materialId ? getMaterialByIdOrLabel(String(piece.materialId)) : null;
    if (!materialRecord) return piece;
    return {
      ...piece,
      sheetWidthMm:
        piece.sheetWidthMm && piece.sheetWidthMm > 0
          ? piece.sheetWidthMm
          : Number(materialRecord.sheetWidthMm) > 0
            ? Number(materialRecord.sheetWidthMm)
            : piece.sheetWidthMm,
      sheetHeightMm:
        piece.sheetHeightMm && piece.sheetHeightMm > 0
          ? piece.sheetHeightMm
          : Number(materialRecord.sheetHeightMm) > 0
            ? Number(materialRecord.sheetHeightMm)
            : piece.sheetHeightMm,
      sheetThicknessMm:
        piece.sheetThicknessMm && piece.sheetThicknessMm > 0
          ? piece.sheetThicknessMm
          : piece.espessura_mm,
    };
  });
}
