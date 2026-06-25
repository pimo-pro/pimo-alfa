/**
 * Nesting V3 — Exportação TCN.
 *
 * Usa o contrato industrial partilhado (fixedPlacementsFromV3State) antes de
 * invocar exportCncFiles — o mesmo pipeline geométrico que produção individual/lote.
 */

import type { NestingV3State } from "./nestingV3Types";
import type { CutLayoutResult } from "../core/cutlayout/cutLayoutTypes";
import { exportCncFiles } from "../core/cnc/cncExport";
import type { CncExportResult } from "../core/cnc/cncTypes";
import { fixedPlacementsFromV3State } from "../core/cutlayout/integration/fixedPlacementsAdapter";

/**
 * Prepara layoutResult industrial a partir do estado V3 (manual ou pós auto-layout).
 */
export function prepareNestingV3IndustrialLayout(state: NestingV3State): CutLayoutResult {
  const { result } = fixedPlacementsFromV3State(state);
  return result;
}

/**
 * Gera ficheiros TCN a partir do estado do Nesting V3.
 * Pipeline: V3 → BL físico → finalizeIndustrialLayout(preserve-positions) → exportCncFiles.
 */
export function exportNestingV3ToCnc(
  state: NestingV3State,
  projectName = "NestingV3"
): CncExportResult {
  const layoutResult = prepareNestingV3IndustrialLayout(state);
  return exportCncFiles({ projectName }, layoutResult, []);
}

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
