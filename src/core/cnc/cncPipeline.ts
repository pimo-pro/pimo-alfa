import { cutlistToPieces, runCutLayout, type CutLayoutEngineOptions, type CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";
import type { SheetDefinition } from "../cutlayout/cutLayoutTypes";
import { exportCncFiles } from "./cncExport";

export const DEFAULT_CNC_SHEET: SheetDefinition = {
  largura_mm: 2750,
  altura_mm: 1830,
  espessura_mm: 19,
};

export const DEFAULT_CNC_LAYOUT_OPTIONS: CutLayoutEngineOptions = {
  groupByThicknessOnly: true,
  rotationPreferenceMode: "aggressive",
  rotationWeight: 0.8,
  rotationPenalty: 0.45,
};

export function buildCncFromCutlistItems(
  project: unknown,
  items: CutlistItemForPieces[],
  sheet: SheetDefinition = DEFAULT_CNC_SHEET,
  layoutOptions: CutLayoutEngineOptions = DEFAULT_CNC_LAYOUT_OPTIONS
) {
  const pieces = cutlistToPieces(items);
  if (pieces.length === 0) {
    return null;
  }

  const layoutResult = runCutLayout(pieces, sheet, layoutOptions);
  const cnc = exportCncFiles(project, layoutResult, []);
  return { pieces, layoutResult, cnc };
}

