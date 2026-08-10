/**
 * Criação de folhas (sheets) para Nesting V4 com base em material e espessura.
 */

import type { V4Piece, V4Sheet } from "./nestingV4Types";
import type { NestingV4Settings } from "./nestingV4Settings";
import { sheetDimsForMaterial } from "./nestingV4Settings";

function sheetGroupKey(piece: V4Piece): string {
  return `${piece.materialId ?? "default"}|${piece.thicknessMm}`;
}

/**
 * Cria uma folha inicial por grupo material+espessura presente nas peças.
 * Sem peças, devolve uma folha com as dimensões padrão das settings.
 */
export function buildInitialSheetsForPieces(
  pieces: V4Piece[],
  settings: NestingV4Settings
): V4Sheet[] {
  if (pieces.length === 0) {
    return [{
      index: 0,
      widthMm: settings.sheetWidthMm,
      heightMm: settings.sheetHeightMm,
      thicknessMm: settings.sheetThicknessMm,
      materialName: "Folha padrão",
    }];
  }

  const groups = new Map<string, V4Piece>();
  for (const piece of pieces) {
    const key = sheetGroupKey(piece);
    if (!groups.has(key)) groups.set(key, piece);
  }

  return Array.from(groups.values()).map((sample, index) => {
    const dims = sheetDimsForMaterial(sample.materialId, settings);
    return {
      index,
      widthMm: dims.sheetWidthMm,
      heightMm: dims.sheetHeightMm,
      thicknessMm: sample.thicknessMm || dims.sheetThicknessMm,
      materialId: sample.materialId,
      materialName: sample.materialName ?? "Folha",
    } satisfies V4Sheet;
  });
}

export function cloneDefaultSheet(index: number, template: V4Sheet): V4Sheet {
  return { ...template, index };
}

export function defaultSheetFromSettings(settings: NestingV4Settings): V4Sheet {
  return {
    index: 0,
    widthMm: settings.sheetWidthMm,
    heightMm: settings.sheetHeightMm,
    thicknessMm: settings.sheetThicknessMm,
    materialName: "Folha padrão",
  };
}
