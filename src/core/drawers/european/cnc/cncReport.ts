/**
 * cncReport.ts — Relatório de exportação CNC (Fase 17).
 */

export type CncExportStatus = "CNC_OK" | "CNC_WARN" | "CNC_ERROR";

export type CncExportedFileInfo = {
  fileName: string;
  pieceCode: string;
  format: string;
  relativePath: string;
  absolutePath?: string;
  byteLength: number;
  cutCount: number;
  drillCount: number;
  pocketCount: number;
  written: boolean;
};

export type CncExportReport = {
  status: CncExportStatus;
  outputDir: string;
  format: string;
  files: CncExportedFileInfo[];
  piecesCovered: string[];
  totalBytes: number;
  totalCutOps: number;
  totalDrillOps: number;
  warnings: string[];
  errors: string[];
  /** Confirma que a exportação só leu dados industriais existentes. */
  industrialIntegrityOk: boolean;
};

export function buildCncFileReport(input: {
  outputDir: string;
  format: string;
  files: CncExportedFileInfo[];
  warnings?: string[];
  errors?: string[];
  industrialIntegrityOk?: boolean;
}): CncExportReport {
  const warnings = [...(input.warnings ?? [])];
  const errors = [...(input.errors ?? [])];
  const piecesCovered = [...new Set(input.files.map((f) => f.pieceCode))];
  const totalBytes = input.files.reduce((acc, f) => acc + f.byteLength, 0);
  const totalCutOps = input.files.reduce((acc, f) => acc + f.cutCount, 0);
  const totalDrillOps = input.files.reduce((acc, f) => acc + f.drillCount, 0);

  if (input.files.length === 0) {
    errors.push("Nenhum ficheiro CNC gerado.");
  }

  let status: CncExportStatus = "CNC_OK";
  if (errors.length > 0) status = "CNC_ERROR";
  else if (warnings.length > 0) status = "CNC_WARN";

  return {
    status,
    outputDir: input.outputDir,
    format: input.format,
    files: input.files,
    piecesCovered,
    totalBytes,
    totalCutOps,
    totalDrillOps,
    warnings,
    errors,
    industrialIntegrityOk: input.industrialIntegrityOk !== false,
  };
}

export function formatCncReportText(report: CncExportReport): string {
  const lines = [
    `CNC export: ${report.status}`,
    `format=${report.format} dir=${report.outputDir}`,
    `files=${report.files.length} cuts=${report.totalCutOps} drills=${report.totalDrillOps}`,
    `integrity=${report.industrialIntegrityOk ? "OK" : "CHECK"}`,
    ...report.files.map(
      (f) =>
        ` - ${f.fileName} [${f.pieceCode}] CUT=${f.cutCount} DRILL=${f.drillCount} ${f.byteLength}B`
    ),
  ];
  if (report.warnings.length) {
    lines.push("warnings:");
    lines.push(...report.warnings.map((w) => ` ! ${w}`));
  }
  if (report.errors.length) {
    lines.push("errors:");
    lines.push(...report.errors.map((e) => ` x ${e}`));
  }
  return lines.join("\n");
}
