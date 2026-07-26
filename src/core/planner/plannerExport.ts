/**
 * plannerExport.ts — Exportações documentais da cozinha planeada.
 * Não altera ficheiros DXF/CNC existentes — apenas referencia integrações.
 */

import type { KitchenLibrary } from "../kitchen";
import type { PlannerMeasurements } from "./plannerMeasurements";
import type { PlannerPlacedModule } from "./plannerModules";
import type { PlannerPricingSummary } from "./plannerPricing";

export type PlannerExportPackage = {
  kind: "kitchen-planner-export";
  generatedAt: string;
  summary: {
    title: string;
    moduleCount: number;
    drawerCount: number;
    doorCount: number;
    occupiedWidthMm: number;
    priceFinal: number;
    currency: string;
  };
  modules: Array<{
    instanceId: string;
    moduleId: string;
    industrialCode: string;
    kind: string;
    name: string;
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
    depthMm: number;
    drawers: number;
    doors: number;
  }>;
  drawers: Array<{ instanceId: string; moduleId: string; count: number }>;
  pricing: PlannerPricingSummary;
  measurements: PlannerMeasurements;
  technicalViews: string[];
  dxfPerModule: Array<{ instanceId: string; moduleId: string; available: boolean; note: string }>;
  cncPerModule: Array<{ instanceId: string; moduleId: string; available: boolean; note: string }>;
  text: string;
};

export function buildPlannerExport(input: {
  modules: PlannerPlacedModule[];
  measurements: PlannerMeasurements;
  pricing: PlannerPricingSummary;
  library?: KitchenLibrary | null;
  title?: string;
}): PlannerExportPackage {
  const { modules, measurements, pricing, library } = input;
  const drawerCount = modules.reduce((s, m) => s + m.drawerCount, 0);
  const doorCount = modules.reduce((s, m) => s + m.doorCount, 0);
  const technicalViews = library?.drawers.modeloB.viewIds ?? [
    "front",
    "side_right",
    "side_left",
    "top",
  ];
  const hasDxf = library?.integrations.dxf ?? true;

  const dxfPerModule = modules.map((m) => ({
    instanceId: m.instanceId,
    moduleId: m.moduleId,
    available: hasDxf && Boolean(m.industrialCode),
    note: hasDxf
      ? `DXF documental via Kitchen Library / Modelo B (${m.industrialCode})`
      : "DXF indisponivel na library",
  }));

  const cncPerModule = modules.map((m) => ({
    instanceId: m.instanceId,
    moduleId: m.moduleId,
    available: hasDxf,
    note: `CNC referencial por modulo (${m.industrialCode}) — export fisico via Fase 17`,
  }));

  const pkg: PlannerExportPackage = {
    kind: "kitchen-planner-export",
    generatedAt: new Date().toISOString(),
    summary: {
      title: input.title ?? "Cozinha planeada",
      moduleCount: modules.length,
      drawerCount,
      doorCount,
      occupiedWidthMm: measurements.occupiedWidthMm,
      priceFinal: pricing.priceFinal,
      currency: pricing.currency,
    },
    modules: modules.map((m) => ({
      instanceId: m.instanceId,
      moduleId: m.moduleId,
      industrialCode: m.industrialCode,
      kind: m.kind,
      name: m.name,
      xMm: m.xMm,
      yMm: m.yMm,
      widthMm: m.widthMm,
      heightMm: m.heightMm,
      depthMm: m.depthMm,
      drawers: m.drawerCount,
      doors: m.doorCount,
    })),
    drawers: modules
      .filter((m) => m.drawerCount > 0)
      .map((m) => ({
        instanceId: m.instanceId,
        moduleId: m.moduleId,
        count: m.drawerCount,
      })),
    pricing,
    measurements,
    technicalViews,
    dxfPerModule,
    cncPerModule,
    text: "",
  };

  pkg.text = formatPlannerExportText(pkg);
  return pkg;
}

export function formatPlannerExportText(pkg: PlannerExportPackage): string {
  const lines = [
    `Kitchen Planner Export — ${pkg.summary.title}`,
    `generated: ${pkg.generatedAt}`,
    `modules: ${pkg.summary.moduleCount} | drawers: ${pkg.summary.drawerCount} | doors: ${pkg.summary.doorCount}`,
    `occupied: ${pkg.summary.occupiedWidthMm} mm`,
    `price: ${pkg.summary.priceFinal} ${pkg.summary.currency}`,
    `views: ${pkg.technicalViews.join(", ")}`,
    "",
    "Modules:",
    ...pkg.modules.map(
      (m) =>
        ` - ${m.industrialCode} ${m.moduleId} @(${m.xMm},${m.yMm}) ${m.widthMm}x${m.heightMm}x${m.depthMm}`
    ),
  ];
  return lines.join("\n");
}

export function downloadPlannerExportJson(pkg: PlannerExportPackage, filename?: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? "kitchen-planner-export.json";
  a.click();
  URL.revokeObjectURL(url);
}
