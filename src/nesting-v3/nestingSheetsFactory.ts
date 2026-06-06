/**
 * Criação de folhas (sheets) para Nesting V3 com base em material e espessura.
 */

import type { V3Piece, V3Sheet } from "./nestingV3Types";
import type { NestingV3Settings } from "./nestingV3Settings";
import { sheetDimsForMaterial } from "./nestingV3Settings";

function sheetGroupKey(piece: V3Piece): string {
  return `${piece.materialId ?? "default"}|${piece.thicknessMm}`;
}

/**
 * Cria uma folha inicial por grupo material+espessura presente nas peças.
 * Sem peças, devolve uma folha com as dimensões padrão das settings.
 */
export function buildInitialSheetsForPieces(
  pieces: V3Piece[],
  settings: NestingV3Settings
): V3Sheet[] {
  if (pieces.length === 0) {
    return [{
      index: 0,
      widthMm: settings.sheetWidthMm,
      heightMm: settings.sheetHeightMm,
      thicknessMm: settings.sheetThicknessMm,
      materialName: "Folha padrão",
    }];
  }

  const groups = new Map<string, V3Piece>();
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
    } satisfies V3Sheet;
  });
}

export function cloneDefaultSheet(index: number, template: V3Sheet): V3Sheet {
  return { ...template, index };
}

export function defaultSheetFromSettings(settings: NestingV3Settings): V3Sheet {
  return {
    index: 0,
    widthMm: settings.sheetWidthMm,
    heightMm: settings.sheetHeightMm,
    thicknessMm: settings.sheetThicknessMm,
    materialName: "Folha padrão",
  };
}
