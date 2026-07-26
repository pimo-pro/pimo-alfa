/**
 * dxfFileReport.ts — Relatério de exportação DXF física (Fase 16).
 */

export type DxfFileExportStatus = "DXF_FILE_OK" | "DXF_FILE_WARN" | "DXF_FILE_ERROR";

export type DxfExportedFileInfo = {
  fileName: string;
  pieceCode: string;
  relativePath: string;
  absolutePath?: string;
  byteLength: number;
  entityCount: number;
  written: boolean;
};

export type DxfExportReport = {
  status: DxfFileExportStatus;
  outputDir: string;
  files: DxfExportedFileInfo[];
  piecesCovered: string[];
  totalBytes: number;
  warnings: string[];
  errors: string[];
};

export function buildDxfFileReport(input: {
  outputDir: string;
  files: DxfExportedFileInfo[];
  warnings?: string[];
  errors?: string[];
}): DxfExportReport {
  const warnings = [...(input.warnings ?? [])];
  const errors = [...(input.errors ?? [])];
  const piecesCovered = [...new Set(input.files.map((f) => f.pieceCode))];
  const totalBytes = input.files.reduce((acc, f) => acc + f.byteLength, 0);

  if (input.files.length === 0) {
    errors.push("Nenhum ficheiro DXF gerado.");
  }

  let status: DxfFileExportStatus = "DXF_FILE_OK";
  if (errors.length > 0) status = "DXF_FILE_ERROR";
  else if (warnings.length > 0) status = "DXF_FILE_WARN";

  return {
    status,
    outputDir: input.outputDir,
    files: input.files,
    piecesCovered,
    totalBytes,
    warnings,
    errors,
  };
}
