/**
 * Interface unificada para exportação CNC (TCN).
 * Gera um ficheiro por painel (chapa): <project>_panel_<index>.tcn.
 */

import type { CutLayoutResult } from "../cutlayout/cutLayoutTypes";
import type { CncDrillOperation, CncExportResult, CncExportFile } from "./cncTypes";
import { generateTcnForPanel } from "./tcnGenerator";

/**
 * Gera um ficheiro TCN por painel.
 */
export function exportCncFiles(
  _project: unknown,
  layoutResult: CutLayoutResult,
  _drillOperations: CncDrillOperation[]
): CncExportResult {
  const projectName =
    typeof _project === "object" &&
    _project !== null &&
    "projectName" in _project &&
    typeof (_project as { projectName?: unknown }).projectName === "string"
      ? (_project as { projectName: string }).projectName
      : "Sheet";
  const acamBaseName = projectName
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "Sheet";

  /** Maior painel do conjunto: usado como referência para anchor top-right no TCN (X_new = maxW - X_old, Y_new = maxH - Y_old). */
  const maxSheetWidth = layoutResult.sheets.length
    ? Math.max(...layoutResult.sheets.map((s) => s.sheet.largura_mm))
    : 0;
  const maxSheetHeight = layoutResult.sheets.length
    ? Math.max(...layoutResult.sheets.map((s) => s.sheet.altura_mm))
    : 0;

  const files: CncExportFile[] = [];
  layoutResult.sheets.forEach((sheetResult, index) => {
    const sheet = sheetResult.sheet;
    const thicknessMm = sheet.espessura_mm;
    const panelIndex = index + 1;
    const filenameBase = `${acamBaseName}_panel_${panelIndex}`;
    files.push({
      filenameBase,
      panelIndex,
      thicknessMm,
      tcn: generateTcnForPanel(sheetResult, 3, filenameBase, maxSheetWidth, maxSheetHeight),
    });
  });

  return { files };
}
