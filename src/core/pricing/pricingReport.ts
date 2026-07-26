/**
 * pricingReport.ts — Relatério do motor de custo industrial (Fase 18).
 */

export type PricingStatus = "PRICING_OK" | "PRICING_WARN" | "PRICING_ERROR";

export type PricingReport = {
  status: PricingStatus;
  warnings: string[];
  errors: string[];
  industrialIntegrityOk: boolean;
  summaryLine: string;
};

export function buildPricingReport(input: {
  warnings?: string[];
  errors?: string[];
  industrialIntegrityOk?: boolean;
  costIndustrial?: number;
  priceFinal?: number;
}): PricingReport {
  const warnings = [...(input.warnings ?? [])];
  const errors = [...(input.errors ?? [])];
  const industrialIntegrityOk = input.industrialIntegrityOk !== false;

  if (input.costIndustrial != null && !(input.costIndustrial >= 0)) {
    errors.push("Custo industrial inválido.");
  }
  if (input.priceFinal != null && !(input.priceFinal >= 0)) {
    errors.push("Preço final inválido.");
  }

  let status: PricingStatus = "PRICING_OK";
  if (errors.length > 0) status = "PRICING_ERROR";
  else if (warnings.length > 0) status = "PRICING_WARN";

  const summaryLine = `pricing=${status} cost=${input.costIndustrial ?? 0} price=${input.priceFinal ?? 0}`;

  return {
    status,
    warnings,
    errors,
    industrialIntegrityOk,
    summaryLine,
  };
}

export function formatPricingReportText(report: PricingReport): string {
  const lines = [report.summaryLine, `integrity=${report.industrialIntegrityOk ? "OK" : "CHECK"}`];
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
