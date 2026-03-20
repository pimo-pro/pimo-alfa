import type { OperationResult } from "../../types";
import type { CutLayoutEngineOptions, CutLayoutResult, CutPiece, SheetDefinition } from "../cutLayoutTypes";

export function runCutLayoutResult(
  pieces: CutPiece[],
  sheetDef: SheetDefinition,
  options: CutLayoutEngineOptions | undefined,
  runCutLayout: (_pieces: CutPiece[], _sheetDef: SheetDefinition, _options?: CutLayoutEngineOptions) => CutLayoutResult
): OperationResult<CutLayoutResult> {
  try {
    const data = runCutLayout(pieces, sheetDef, options);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao executar cut layout.";
    return { success: false, error: message };
  }
}
