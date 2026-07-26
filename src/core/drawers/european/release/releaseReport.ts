/**
 * releaseReport.ts — Relatério da camada Release Notes (Fase 14).
 */

export type EuropeanReleaseStatus = "RELEASE_OK" | "RELEASE_WARN" | "RELEASE_ERROR";

export type EuropeanReleaseReport = {
  status: EuropeanReleaseStatus;
  sectionsGenerated: number;
  eventsCollected: number;
  industrialIntegrity: boolean;
  warnings: string[];
  errors: string[];
};

export function buildReleaseReport(input: {
  sectionsGenerated: number;
  eventsCollected: number;
  industrialIntegrity: boolean;
  warnings?: string[];
  errors?: string[];
}): EuropeanReleaseReport {
  const warnings = [...(input.warnings ?? [])];
  const errors = [...(input.errors ?? [])];
  if (!input.industrialIntegrity) {
    warnings.push("Integridade industrial: result.valid=false no momento da geração das notes.");
  }
  let status: EuropeanReleaseStatus = "RELEASE_OK";
  if (errors.length > 0) status = "RELEASE_ERROR";
  else if (warnings.length > 0) status = "RELEASE_WARN";
  return {
    status,
    sectionsGenerated: input.sectionsGenerated,
    eventsCollected: input.eventsCollected,
    industrialIntegrity: input.industrialIntegrity,
    warnings,
    errors,
  };
}

export function formatReleaseReportText(report: EuropeanReleaseReport): string {
  const lines = [
    `European Release Notes — ${report.status}`,
    `secoes: ${report.sectionsGenerated}`,
    `eventos: ${report.eventsCollected}`,
    `integridade: ${report.industrialIntegrity ? "OK" : "WARN"}`,
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
