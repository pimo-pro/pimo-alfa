/**
 * Placements fixos (V3 manual / exportação) → CutLayoutResult validado.
 *
 * Usa o mesmo contrato geométrico industrial que SPM/MPM:
 * - conversão TL canvas → BL físico
 * - finalizeIndustrialLayout(..., mode: 'preserve-positions')
 * - applyRotationGeometryToSheets (via contrato)
 */

import type { CutLayoutResult, CutPlacement, SheetDefinition, SheetResult } from "../cutLayoutTypes";
import type { NestingV3State, V3Piece } from "../../../nesting-v3/nestingV3Types";
import { v3PlacementToCutPlacement } from "./layoutCoordinateAdapter";
import {
  finalizeIndustrialLayout,
  validateIndustrialLayout,
  type IndustrialLayoutValidateOptions,
  type IndustrialLayoutValidationIssue,
} from "./industrialLayoutContract";

function v3EffectiveDims(piece: V3Piece): { w: number; h: number } {
  const rotated = piece.rotation === 90 || piece.rotation === 270;
  return rotated
    ? { w: piece.heightMm, h: piece.widthMm }
    : { w: piece.widthMm, h: piece.heightMm };
}

function sheetDefinitionFromV3Sheet(sheet: NestingV3State["sheets"][number]): SheetDefinition {
  return {
    largura_mm: sheet.widthMm,
    altura_mm: sheet.heightMm,
    espessura_mm: sheet.thicknessMm,
    materialId: sheet.materialId,
    materialName: sheet.materialName,
  };
}

/**
 * Converte estado V3 (placements TL) para CutLayoutResult em BL físico,
 * sem re-nesting. Furos permanecem em coordenadas locais originais da peça.
 */
export function v3StateToCutLayoutResult(state: NestingV3State): CutLayoutResult {
  const sheetResults: SheetResult[] = state.sheets
    .map((sheet, sheetIndex) => {
      const placementsOnSheet = state.placements.filter((p) => p.sheetIndex === sheetIndex);
      if (placementsOnSheet.length === 0) return null;

      const cutPlacements: CutPlacement[] = placementsOnSheet
        .map((pl) => {
          const piece = state.pieces.find((p) => p.id === pl.pieceId);
          if (!piece) return null;

          const { w, h } = v3EffectiveDims(piece);
          const bl = v3PlacementToCutPlacement(pl, h, sheet.heightMm);

          return {
            x_mm: bl.x_mm,
            y_mm: bl.y_mm,
            largura_mm: w,
            altura_mm: h,
            espessura_mm: piece.thicknessMm,
            rotacao: piece.rotation,
            sheetIndex,
            boxId: piece.sourceBoxId ?? "manual",
            partName: piece.name,
            materialId: piece.materialId,
            materialName: piece.materialName,
            drillHoles: piece.originalHoles.map((hole) => ({ ...hole })),
            metadata: {
              v3PieceId: piece.id,
              v3SourceBoxId: piece.sourceBoxId,
              v3SourceProjectId: piece.sourceProjectId,
            },
          } as CutPlacement;
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      if (cutPlacements.length === 0) return null;

      return {
        sheet: sheetDefinitionFromV3Sheet(sheet),
        placements: cutPlacements,
      } satisfies SheetResult;
    })
    .filter((sr): sr is SheetResult => sr !== null);

  return { sheets: sheetResults };
}

export type FixedPlacementsFromV3Result = {
  result: CutLayoutResult;
  valid: boolean;
  issues: IndustrialLayoutValidationIssue[];
};

/**
 * Prepara layout V3 manual/auto para consumo industrial (TCN, PDF PRO, etiquetas).
 * Não altera posições; aplica apenas o pós-processamento geométrico partilhado.
 */
export function fixedPlacementsFromV3State(
  state: NestingV3State,
  validateOpts?: Partial<IndustrialLayoutValidateOptions>
): FixedPlacementsFromV3Result {
  const raw = v3StateToCutLayoutResult(state);
  const primarySheet = state.sheets[0];
  const physicalSheet = primarySheet
    ? sheetDefinitionFromV3Sheet(primarySheet)
    : {
        largura_mm: state.settings.sheetWidthMm,
        altura_mm: state.settings.sheetHeightMm,
        espessura_mm: state.settings.sheetThicknessMm,
      };

  const kerfMm = validateOpts?.kerfMm ?? state.settings.kerfMm;
  const marginMm = validateOpts?.marginMm ?? state.settings.marginMm;

  const result = finalizeIndustrialLayout(raw, {
    mode: "preserve-positions",
    kerfMm,
    marginMm,
    physicalSheet,
  });

  const validation = validateIndustrialLayout(result, {
    kerfMm,
    marginMm,
    physicalSheet,
    coordinateFrame: "physical",
    ...validateOpts,
  });

  return {
    result,
    valid: validation.valid,
    issues: validation.issues,
  };
}

/**
 * Ponto único para garantir geometria industrial antes de TCN/PDF/etiquetas.
 * Idempotente: applyRotationGeometryToSheets usa sempre originalDrillHoles como fonte.
 */
export function ensureIndustrialLayoutGeometry(result: CutLayoutResult): CutLayoutResult {
  return finalizeIndustrialLayout(result, {
    mode: "preserve-positions",
    kerfMm: 0,
    marginMm: 0,
    physicalSheet: result.sheets[0]?.sheet ?? {
      largura_mm: 2800,
      altura_mm: 2070,
      espessura_mm: 19,
    },
  });
}
