/**
 * finalReport.ts — Relatério do Release Final PIMO.PRO-V5 (Fase 20).
 */

import type { FinalDocumentationBundle } from "./finalDocumentation";
import type { FinalIntegrityReport } from "./finalIntegrityCheck";
import type { FinalVersionManifest } from "./finalVersioning";

export type ReleaseFinalStatus = "RELEASE_FINAL_OK" | "RELEASE_FINAL_WARN" | "RELEASE_FINAL_ERROR";

export type FinalReleaseReport = {
  status: ReleaseFinalStatus;
  version: string;
  logicalHash: string;
  releasedAt: string;
  componentsIncluded: string[];
  documentationSections: string[];
  integrity: {
    industrial: boolean;
    cnc: boolean;
    pricing: boolean;
    planner: boolean;
    kitchen: boolean;
    nothingIndustrialAltered: true;
  };
  warnings: string[];
  errors: string[];
  summaryLine: string;
};

export function buildFinalReleaseReport(input: {
  manifest: FinalVersionManifest;
  documentation: FinalDocumentationBundle;
  integrity: FinalIntegrityReport;
  warnings?: string[];
  errors?: string[];
}): FinalReleaseReport {
  const warnings = [...(input.warnings ?? [])];
  const errors = [...(input.errors ?? [])];

  if (!input.integrity.ok) {
    for (const it of input.integrity.items.filter((i) => !i.ok)) {
      warnings.push(`${it.id}: ${it.message}`);
    }
  }
  if (!input.integrity.nothingMutated) {
    errors.push("Integridade: flag nothingMutated inválida.");
  }

  let status: ReleaseFinalStatus = "RELEASE_FINAL_OK";
  if (errors.length > 0 || !input.integrity.industrialOk) status = "RELEASE_FINAL_ERROR";
  else if (warnings.length > 0 || !input.integrity.ok) status = "RELEASE_FINAL_WARN";

  const componentsIncluded = input.manifest.components.map(
    (c) => `${c.id}[${c.status}]`
  );

  return {
    status,
    version: input.manifest.version,
    logicalHash: input.manifest.logicalHash,
    releasedAt: input.manifest.releasedAt,
    componentsIncluded,
    documentationSections: [
      "productAnnouncement",
      "technical",
      "industrial",
      "commercial",
      "planner",
      "releaseNotesPhases",
    ],
    integrity: {
      industrial: input.integrity.industrialOk,
      cnc: input.integrity.cncOk,
      pricing: input.integrity.pricingOk,
      planner: input.integrity.plannerOk,
      kitchen: input.integrity.kitchenOk,
      nothingIndustrialAltered: true,
    },
    warnings,
    errors,
    summaryLine: `${status} ${input.manifest.version} hash=${input.manifest.logicalHash}`,
  };
}

export function formatFinalReleaseReportText(report: FinalReleaseReport): string {
  const lines = [
    report.summaryLine,
    `releasedAt=${report.releasedAt}`,
    `components=${report.componentsIncluded.join(", ")}`,
    `docs=${report.documentationSections.join("|")}`,
    `integrity industrial=${report.integrity.industrial} cnc=${report.integrity.cnc} pricing=${report.integrity.pricing} planner=${report.integrity.planner} kitchen=${report.integrity.kitchen}`,
    `nothingIndustrialAltered=${report.integrity.nothingIndustrialAltered}`,
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
