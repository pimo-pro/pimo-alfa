/**
 * libraryReport.ts — Relatório da Kitchen Library (Fase 15).
 */

export type KitchenLibraryStatus = "LIBRARY_OK" | "LIBRARY_WARN" | "LIBRARY_ERROR";

export type KitchenLibraryReport = {
  status: KitchenLibraryStatus;
  moduleCount: number;
  frontCount: number;
  doorCount: number;
  remateCount: number;
  rodapeCount: number;
  ruleGroupCount: number;
  modeloBIntegrated: boolean;
  warnings: string[];
  errors: string[];
};

export function buildLibraryReport(input: {
  moduleCount: number;
  frontCount: number;
  doorCount: number;
  remateCount: number;
  rodapeCount: number;
  ruleGroupCount: number;
  modeloBIntegrated: boolean;
  warnings?: string[];
  errors?: string[];
}): KitchenLibraryReport {
  const warnings = [...(input.warnings ?? [])];
  const errors = [...(input.errors ?? [])];
  if (!input.modeloBIntegrated) {
    warnings.push("Modelo B sample não integrou todas as camadas esperadas.");
  }
  let status: KitchenLibraryStatus = "LIBRARY_OK";
  if (errors.length > 0) status = "LIBRARY_ERROR";
  else if (warnings.length > 0) status = "LIBRARY_WARN";
  return {
    status,
    moduleCount: input.moduleCount,
    frontCount: input.frontCount,
    doorCount: input.doorCount,
    remateCount: input.remateCount,
    rodapeCount: input.rodapeCount,
    ruleGroupCount: input.ruleGroupCount,
    modeloBIntegrated: input.modeloBIntegrated,
    warnings,
    errors,
  };
}
