/**
 * Interface unificada para exportação CNC (TCN).
 * Gera um ficheiro por chapa (sheet): <project>_panel_<index>.tcn.
 */

import type { CutLayoutResult } from "../cutlayout/cutLayoutTypes";
import type { CncDrillOperation, CncExportResult, CncExportFile } from "./cncTypes";
import { generateTcnForPanel } from "./tcnGenerator";

/**
 * Gera um ficheiro TCN por chapa, contendo todas as peças da chapa.
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

  const files: CncExportFile[] = [];
  layoutResult.sheets.forEach((sheetResult, index) => {
    console.log("[EXPORT] panels no sheet:", sheetResult.placements.length);
    const sheet = sheetResult.sheet;
    const thicknessMm = sheet.espessura_mm;
    const panelIndex = index + 1;
    const filenameBase = `${acamBaseName}_panel_${panelIndex}`;
    files.push({
      filenameBase,
      panelIndex,
      thicknessMm,
      tcn: generateTcnForPanel(sheetResult, 3, filenameBase, sheet.largura_mm, sheet.altura_mm),
    });
  });

  return { files };
}
