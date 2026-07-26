/**
 * finalDocumentation.ts — Documentação completa do release PIMO.PRO-V5.
 */

import type { EuropeanDrawerResult } from "../drawers/european/types";
import type { KitchenLibrary } from "../kitchen";
import type { PlannerExportPackage } from "../planner";
import type { FinalVersionManifest } from "./finalVersioning";
import { PIMO_PRO_V5_VERSION } from "./finalVersioning";
import { getModeloBProductAnnouncement } from "./productAnnouncement";

export type FinalDocumentationBundle = {
  /** Narrativa oficial do Modelo B / PIMO.PRO-V5.0 */
  productAnnouncement: string;
  technical: string;
  industrial: string;
  commercial: string;
  planner: string;
  releaseNotesPhases: string;
  fullText: string;
};

const PHASE_NOTES: Array<{ phase: string; title: string; summary: string }> = [
  { phase: "1-9", title: "Modelo B base", summary: "Sistemas Blum/Hettich/Grass, geometry, drilling, cutlist, PDF, viewer." },
  { phase: "10", title: "Safety Gates", summary: "Validação industrial pós-pipeline." },
  { phase: "11", title: "Docs industriais", summary: "Ficha técnica e PDF multipágina." },
  { phase: "12", title: "DXF + technical", summary: "DXF em memória e vistas técnicas." },
  { phase: "13", title: "MC Overlay", summary: "Medidas, aberturas, gaps, remates, rodapé." },
  { phase: "14", title: "Release Notes B", summary: "Notas automáticas do Modelo B." },
  { phase: "15", title: "Kitchen Library", summary: "Catálogo de módulos, frentes, portas, remates." },
  { phase: "16", title: "DXF físico", summary: "Exportação .dxf por peça." },
  { phase: "17", title: "CNC Post-Processor", summary: "cnc/xml/mpr/cix/bpp a partir de geometry+holes+dxf." },
  { phase: "18", title: "Pricing Engine", summary: "Custo industrial e preço final." },
  { phase: "19", title: "Kitchen Planner", summary: "Configurador cliente sobre a library." },
  { phase: "20", title: "Release Final", summary: "Consolidação PIMO.PRO-V5.0." },
];

export function buildFinalDocumentation(input: {
  manifest: FinalVersionManifest;
  result?: EuropeanDrawerResult | null;
  library?: KitchenLibrary | null;
  plannerExport?: PlannerExportPackage | null;
}): FinalDocumentationBundle {
  const { manifest, result, library, plannerExport } = input;
  const productAnnouncement = getModeloBProductAnnouncement();

  const technical = [
    `# Documentação técnica — ${PIMO_PRO_V5_VERSION}`,
    ``,
    `- Vistas: ${(result?.technical?.viewIds ?? library?.drawers.modeloB.viewIds ?? []).join(", ") || "n/d"}`,
    `- DXF: ${result?.dxf?.report?.status ?? library?.drawers.modeloB.dxfStatus ?? "n/d"}`,
    `- Overlay: ${result?.overlay?.report?.status ?? "n/d"}`,
    `- CNC: pipeline Fase 17 (CUT/DRILL) disponível quando geometry+holes+dxf OK`,
    `- Medidas amostra: runner=${result?.config.depthMm ?? library?.drawers.modeloB.summary.runnerMm ?? "n/d"} mm`,
  ].join("\n");

  const industrial = [
    `# Documentação industrial — ${PIMO_PRO_V5_VERSION}`,
    ``,
    `- Sistema: ${result?.systemId ?? library?.drawers.modeloB.systemId ?? "n/d"}`,
    `- Cutlist peças: ${result?.cutlist?.length ?? 0}`,
    `- Furos: ${result?.holes?.length ?? library?.drawers.modeloB.summary.holes ?? 0}`,
    `- Safety: ${result?.safetyReport?.status ?? "n/d"}`,
    `- Docs: ${result?.docs?.report?.status ?? library?.drawers.modeloB.docsStatus ?? "n/d"}`,
    `- Regras kitchen: ${library ? Object.keys(library.rules).length + " grupos" : "n/d"}`,
  ].join("\n");

  const commercial = [
    `# Documentação comercial — ${PIMO_PRO_V5_VERSION}`,
    ``,
    `- Moeda: ${result?.pricing?.currency ?? library?.pricing?.currency ?? "EUR"}`,
    `- Custo industrial: ${result?.pricing?.totals.costIndustrial ?? library?.pricing?.totals.costIndustrial ?? "n/d"}`,
    `- Preço final: ${result?.pricing?.totals.priceFinal ?? library?.pricing?.totals.priceFinal ?? "n/d"}`,
    `- Margem: ${Math.round((result?.pricing?.margin.marginPercent ?? library?.pricing?.margin.marginPercent ?? 0) * 100)}%`,
    `- Módulos library: ${library?.modules.all.length ?? 0}`,
    `- Preço/módulo: ${library?.pricing?.totals.pricePerModule ?? result?.pricing?.totals.pricePerModule ?? "n/d"}`,
  ].join("\n");

  const planner = [
    `# Documentação planner — ${PIMO_PRO_V5_VERSION}`,
    ``,
    plannerExport
      ? [
          `- Título: ${plannerExport.summary.title}`,
          `- Módulos: ${plannerExport.summary.moduleCount}`,
          `- Gavetas: ${plannerExport.summary.drawerCount}`,
          `- Preço plano: ${plannerExport.summary.priceFinal} ${plannerExport.summary.currency}`,
          `- Vistas: ${plannerExport.technicalViews.join(", ")}`,
        ].join("\n")
      : `- Planner disponível em /kitchen-planner (sem export nesta amostra).`,
  ].join("\n");

  const releaseNotesPhases = [
    `# Release Notes — fases 1–20 (${PIMO_PRO_V5_VERSION})`,
    ``,
    `Hash: ${manifest.logicalHash}`,
    `Data: ${manifest.releasedAt}`,
    ``,
    ...PHASE_NOTES.map((p) => `## Fase ${p.phase} — ${p.title}\n${p.summary}`),
    ``,
    `## Componentes`,
    ...manifest.components.map((c) => `- [${c.status}] ${c.label} (fase ${c.phase})`),
  ].join("\n");

  const fullText = [
    productAnnouncement,
    "",
    technical,
    "",
    industrial,
    "",
    commercial,
    "",
    planner,
    "",
    releaseNotesPhases,
  ].join("\n");

  return {
    productAnnouncement,
    technical,
    industrial,
    commercial,
    planner,
    releaseNotesPhases,
    fullText,
  };
}
