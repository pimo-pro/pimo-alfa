/**
 * Nesting V3 — Exportação TCN.
 *
 * REGRA: Chama as funções industriais existentes. NUNCA as modifica.
 * Converte o estado V3 para o formato CutLayoutResult que o exportCncFiles espera.
 */

import type { NestingV3State, V3Piece } from "./nestingV3Types";
import { rotateHoles } from "./nestingV3Engine";
import type { CutLayoutResult, SheetResult, CutPlacement } from "../core/cutlayout/cutLayoutTypes";
import { exportCncFiles } from "../core/cnc/cncExport";
import type { CncExportResult } from "../core/cnc/cncTypes";

// ── Dimensões efectivas com rotação ──────────────────────────────────────────

function effectiveDims(piece: V3Piece): { w: number; h: number } {
  const rotated = piece.rotation === 90 || piece.rotation === 270;
  return rotated
    ? { w: piece.heightMm, h: piece.widthMm }
    : { w: piece.widthMm, h: piece.heightMm };
}

// ── Converter NestingV3State → CutLayoutResult ────────────────────────────────

function v3StateToLayoutResult(state: NestingV3State): CutLayoutResult {
  const sheetResults: SheetResult[] = state.sheets.map((sheet, si) => {
    const placementsOnSheet = state.placements.filter((p) => p.sheetIndex === si);

    const cutPlacements: CutPlacement[] = placementsOnSheet.map((pl) => {
      const piece = state.pieces.find((p) => p.id === pl.pieceId);
      if (!piece) return null as unknown as CutPlacement;

      const { w, h } = effectiveDims(piece);

      // Furos rodados com a peça
      const rotatedHoles = rotateHoles(
        piece.originalHoles,
        piece.rotation,
        piece.widthMm,
        piece.heightMm
      );

      return {
        x_mm: pl.xMm,
        y_mm: pl.yMm,
        largura_mm: w,
        altura_mm: h,
        espessura_mm: piece.thicknessMm,
        rotacao: piece.rotation,
        sheetIndex: si,
        boxId: piece.sourceBoxId ?? "manual",
        partName: piece.name,
        materialId: piece.materialId,
        materialName: piece.materialName,
        drillHoles: rotatedHoles,
      } satisfies CutPlacement;
    }).filter(Boolean);

    return {
      sheet: {
        largura_mm: sheet.widthMm,
        altura_mm: sheet.heightMm,
        espessura_mm: sheet.thicknessMm,
        materialId: sheet.materialId,
        materialName: sheet.materialName,
      },
      placements: cutPlacements,
    } satisfies SheetResult;
  });

  return {
    sheets: sheetResults,
  };
}

// ── Export TCN público ────────────────────────────────────────────────────────

/**
 * Gera ficheiros TCN a partir do estado do Nesting V3.
 * Usa exactamente a mesma função industrial `exportCncFiles`.
 */
export function exportNestingV3ToCnc(
  state: NestingV3State,
  projectName = "NestingV3"
): CncExportResult {
  const layoutResult = v3StateToLayoutResult(state);
  return exportCncFiles(
    { projectName },
    layoutResult,
    []
  );
}

// ── Download helper ───────────────────────────────────────────────────────────

export function downloadNestingV3Tcn(state: NestingV3State, projectName = "NestingV3"): void {
  const result = exportNestingV3ToCnc(state, projectName);
  for (const file of result.files) {
    const blob = new Blob([file.tcn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.filenameBase}.tcn`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ── Estatísticas para display ─────────────────────────────────────────────────

export interface V3ExportStats {
  totalPieces: number;
  placedPieces: number;
  unplacedPieces: number;
  sheetsUsed: number;
  filesGenerated: number;
}

export function getV3ExportStats(state: NestingV3State): V3ExportStats {
  const sheetsWithPieces = new Set(state.placements.map((p) => p.sheetIndex));
  return {
    totalPieces: state.pieces.length,
    placedPieces: state.placements.length,
    unplacedPieces: state.unplacedPieceIds.length,
    sheetsUsed: sheetsWithPieces.size,
    filesGenerated: sheetsWithPieces.size,
  };
}
