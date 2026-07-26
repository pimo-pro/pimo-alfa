/**
 * plannerReport.ts — Relatério do Kitchen Planner (Fase 19).
 */

import type { PlannerCollision } from "./plannerModules";
import type { PlannerMeasurements } from "./plannerMeasurements";
import type { PlannerPricingSummary } from "./plannerPricing";

export type PlannerStatus = "PLANNER_OK" | "PLANNER_WARN" | "PLANNER_ERROR";

export type PlannerReport = {
  status: PlannerStatus;
  warnings: string[];
  errors: string[];
  industrialIntegrityOk: boolean;
  moduleCount: number;
  collisionCount: number;
  priceFinal: number;
  summaryLine: string;
};

export function buildPlannerReport(input: {
  moduleCount: number;
  collisions?: PlannerCollision[];
  measurements?: PlannerMeasurements;
  pricing?: PlannerPricingSummary;
  warnings?: string[];
  errors?: string[];
  industrialIntegrityOk?: boolean;
}): PlannerReport {
  const warnings = [...(input.warnings ?? [])];
  const errors = [...(input.errors ?? [])];
  const collisions = input.collisions ?? [];
  const industrialIntegrityOk = input.industrialIntegrityOk !== false;

  if (collisions.length > 0) {
    warnings.push(`${collisions.length} colisóo(ões) detectada(s) na planta.`);
  }
  if (input.moduleCount === 0) {
    warnings.push("Nenhum módulo colocado.");
  }
  if (input.pricing?.source === "empty") {
    warnings.push("Pricing da Kitchen Library ausente.");
  }

  let status: PlannerStatus = "PLANNER_OK";
  if (errors.length > 0) status = "PLANNER_ERROR";
  else if (warnings.length > 0) status = "PLANNER_WARN";

  const priceFinal = input.pricing?.priceFinal ?? 0;
  const summaryLine = `planner=${status} modules=${input.moduleCount} price=${priceFinal}`;

  return {
    status,
    warnings,
    errors,
    industrialIntegrityOk,
    moduleCount: input.moduleCount,
    collisionCount: collisions.length,
    priceFinal,
    summaryLine,
  };
}

export function formatPlannerReportText(report: PlannerReport): string {
  const lines = [
    report.summaryLine,
    `integrity=${report.industrialIntegrityOk ? "OK" : "CHECK"}`,
    `collisions=${report.collisionCount}`,
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
