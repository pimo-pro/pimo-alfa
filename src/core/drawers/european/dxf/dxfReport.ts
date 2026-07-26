/**
 * dxfReport.ts — Relatório da camada DXF / desenho técnico (Fase 12).
 */

export type EuropeanDxfStatus = "DXF_OK" | "DXF_WARN" | "DXF_ERROR";

export type EuropeanDxfReport = {
  status: EuropeanDxfStatus;
  entityCount: number;
  layerCount: number;
  viewCount: number;
  contourCount: number;
  holeEntityCount: number;
  warnings: string[];
  errors: string[];
};

export function buildDxfReport(input: {
  entityCount: number;
  layerCount: number;
  viewCount: number;
  contourCount: number;
  holeEntityCount: number;
  warnings?: string[];
  errors?: string[];
}): EuropeanDxfReport {
  const warnings = input.warnings ?? [];
  const errors = input.errors ?? [];
  let status: EuropeanDxfStatus = "DXF_OK";
  if (errors.length > 0) status = "DXF_ERROR";
  else if (warnings.length > 0) status = "DXF_WARN";
  return {
    status,
    entityCount: input.entityCount,
    layerCount: input.layerCount,
    viewCount: input.viewCount,
    contourCount: input.contourCount,
    holeEntityCount: input.holeEntityCount,
    warnings,
    errors,
  };
}

export function formatDxfReportText(report: EuropeanDxfReport): string {
  const lines = [
    `European DXF / Technical — ${report.status}`,
    `entidades: ${report.entityCount}`,
    `layers: ${report.layerCount}`,
    `vistas: ${report.viewCount}`,
    `contornos: ${report.contourCount}`,
    `furos DXF: ${report.holeEntityCount}`,
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
