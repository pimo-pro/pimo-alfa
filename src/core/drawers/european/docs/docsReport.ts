/**
 * docsReport.ts — Relatério da camada de documentação industrial (Fase 11).
 */

export type EuropeanDocsStatus = "DOCS_OK" | "DOCS_WARN" | "DOCS_ERROR";

export type EuropeanDocsReport = {
  status: EuropeanDocsStatus;
  sectionsGenerated: string[];
  piecesDocumented: number;
  holesDocumented: number;
  logicalPages: number;
  warnings: string[];
  errors: string[];
};

export function buildDocsReport(input: {
  sectionsGenerated: string[];
  piecesDocumented: number;
  holesDocumented: number;
  logicalPages: number;
  warnings?: string[];
  errors?: string[];
}): EuropeanDocsReport {
  const warnings = input.warnings ?? [];
  const errors = input.errors ?? [];
  let status: EuropeanDocsStatus = "DOCS_OK";
  if (errors.length > 0) status = "DOCS_ERROR";
  else if (warnings.length > 0) status = "DOCS_WARN";
  return {
    status,
    sectionsGenerated: input.sectionsGenerated,
    piecesDocumented: input.piecesDocumented,
    holesDocumented: input.holesDocumented,
    logicalPages: input.logicalPages,
    warnings,
    errors,
  };
}

export function formatDocsReportText(report: EuropeanDocsReport): string {
  const lines = [
    `European Industrial Docs — ${report.status}`,
    `secoes: ${report.sectionsGenerated.join(", ") || "—"}`,
    `pecas: ${report.piecesDocumented}`,
    `furos: ${report.holesDocumented}`,
    `paginas: ${report.logicalPages}`,
  ];
  if (report.warnings.length) {
    lines.push("avisos:");
    for (const w of report.warnings) lines.push(`  - ${w}`);
  }
  if (report.errors.length) {
    lines.push("erros:");
    for (const e of report.errors) lines.push(`  - ${e}`);
  }
  return lines.join("\n");
}
