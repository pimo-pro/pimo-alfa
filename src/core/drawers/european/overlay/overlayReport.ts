/**
 * overlayReport.ts — Relatério MC Overlay avançado (Fase 13).
 */

export type EuropeanOverlayStatus = "OVERLAY_OK" | "OVERLAY_WARN" | "OVERLAY_ERROR";

export type EuropeanOverlayReport = {
  status: EuropeanOverlayStatus;
  sections: string[];
  measureCount: number;
  aberturaCount: number;
  gapCount: number;
  remateCount: number;
  warnings: string[];
  errors: string[];
};

export function buildOverlayReport(input: {
  sections: string[];
  measureCount: number;
  aberturaCount: number;
  gapCount: number;
  remateCount: number;
  warnings?: string[];
  errors?: string[];
}): EuropeanOverlayReport {
  const warnings = input.warnings ?? [];
  const errors = input.errors ?? [];
  let status: EuropeanOverlayStatus = "OVERLAY_OK";
  if (errors.length > 0) status = "OVERLAY_ERROR";
  else if (warnings.length > 0) status = "OVERLAY_WARN";
  return {
    status,
    sections: input.sections,
    measureCount: input.measureCount,
    aberturaCount: input.aberturaCount,
    gapCount: input.gapCount,
    remateCount: input.remateCount,
    warnings,
    errors,
  };
}

export function formatOverlayReportText(report: EuropeanOverlayReport): string {
  const lines = [
    `European MC Overlay — ${report.status}`,
    `secoes: ${report.sections.join(", ")}`,
    `medidas: ${report.measureCount}`,
    `aberturas: ${report.aberturaCount}`,
    `gaps: ${report.gapCount}`,
    `remates: ${report.remateCount}`,
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
