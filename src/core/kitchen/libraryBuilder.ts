/**
 * libraryBuilder.ts — Construção completa da Kitchen Library industrial.
 */

import { buildBaseModules } from "./modules/baseModules";
import { buildTallModules } from "./modules/tallModules";
import { buildUpperModules } from "./modules/upperModules";
import { buildCornerModules } from "./modules/cornerModules";
import { buildFrontModels } from "./fronts/frontModels";
import { buildDoorModels } from "./doors/doorModels";
import { buildRemateModels } from "./remates/remateModels";
import { buildRodapeModels } from "./rodape/rodapeModels";
import { buildKitchenIndustrialRules } from "./rules/industrialRules";
import { adaptEuropeanDrawerSample, type KitchenEuropeanDrawerSample } from "./drawers/europeanDrawerAdapter";
import { buildLibraryReport, type KitchenLibraryReport } from "./libraryReport";
import {
  buildIndustrialPricing,
  buildKitchenLibraryPricing,
  type IndustrialPricing,
} from "../pricing";
import type {
  KitchenDoorModel,
  KitchenFrontModel,
  KitchenIndustrialRules,
  KitchenModuleSpec,
  KitchenRemateModel,
  KitchenRodapeModel,
} from "./types";

export type KitchenLibrary = {
  kind: "kitchen-industrial-library";
  title: string;
  version: string;
  generatedAt: string;
  modules: {
    all: KitchenModuleSpec[];
    base: KitchenModuleSpec[];
    tall: KitchenModuleSpec[];
    upper: KitchenModuleSpec[];
    corner: KitchenModuleSpec[];
  };
  fronts: KitchenFrontModel[];
  doors: KitchenDoorModel[];
  remates: KitchenRemateModel[];
  rodape: KitchenRodapeModel[];
  rules: KitchenIndustrialRules;
  drawers: {
    modeloB: KitchenEuropeanDrawerSample;
  };
  /** Referências documentais agregadas. */
  integrations: {
    technicalViews: boolean;
    dxf: boolean;
    overlay: boolean;
    docs: boolean;
    releaseNotes: boolean;
    safety: boolean;
    pricing: boolean;
  };
  /** Custo industrial (Fase 18). */
  pricing?: IndustrialPricing;
  report: KitchenLibraryReport;
};

export const KITCHEN_LIBRARY_VERSION = "K.v15.0";

/**
 * Constrói a biblioteca industrial completa (somente leitura sobre Modelo B).
 */
export function buildKitchenLibrary(options?: {
  /** Se false, não invoca generateEuropeanDrawer (catalog only). Default true. */
  includeModeloBSample?: boolean;
}): KitchenLibrary {
  const warnings: string[] = [];
  const errors: string[] = [];

  const base = buildBaseModules();
  const tall = buildTallModules();
  const upper = buildUpperModules();
  const corner = buildCornerModules();
  const all = [...base, ...tall, ...upper, ...corner];
  const fronts = buildFrontModels();
  const doors = buildDoorModels();
  const remates = buildRemateModels();
  const rodape = buildRodapeModels();
  const rules = buildKitchenIndustrialRules();

  let modeloB: KitchenEuropeanDrawerSample = {
    source: "modelo-b",
    systemId: "hettich-innotech-atira",
    valid: false,
    hasTechnical: false,
    hasDxf: false,
    hasOverlay: false,
    hasDocs: false,
    hasReleaseNotes: false,
    hasSafety: false,
    hasPricing: false,
    viewIds: [],
    summary: { holes: 0, woodPieces: 0, runnerMm: 0, heightMm: 0 },
  };

  let pricing: IndustrialPricing | undefined;
  let modeloBResult: ReturnType<typeof adaptEuropeanDrawerSample>["result"] | undefined;

  if (options?.includeModeloBSample !== false) {
    try {
      const adapted = adaptEuropeanDrawerSample();
      modeloB = adapted.sample;
      modeloBResult = adapted.result;
      if (!adapted.sample.valid) {
        warnings.push("Amostra Modelo B retornou valid=false (flags/ambiente?).");
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  } else {
    warnings.push("Amostra Modelo B omitida (includeModeloBSample=false).");
  }

  if (modeloBResult?.pricing) {
    pricing = buildKitchenLibraryPricing(modeloBResult.pricing, Math.max(1, all.length));
  } else if (modeloBResult) {
    const basePricing = buildIndustrialPricing(modeloBResult);
    pricing = buildKitchenLibraryPricing(basePricing, Math.max(1, all.length));
    modeloB = {
      ...modeloB,
      hasPricing: true,
      pricingStatus: basePricing.report.status,
      summary: {
        ...modeloB.summary,
        costIndustrial: basePricing.totals.costIndustrial,
        priceFinal: basePricing.totals.priceFinal,
      },
    };
  }

  const modeloBIntegrated =
    modeloB.hasTechnical &&
    modeloB.hasDxf &&
    modeloB.hasOverlay &&
    modeloB.hasDocs &&
    modeloB.hasReleaseNotes &&
    modeloB.hasSafety;

  if (all.length === 0) errors.push("Nenhum modulo gerado.");
  if (fronts.length === 0) errors.push("Nenhuma frente gerada.");
  if (doors.length === 0) errors.push("Nenhuma porta gerada.");

  const report = buildLibraryReport({
    moduleCount: all.length,
    frontCount: fronts.length,
    doorCount: doors.length,
    remateCount: remates.length,
    rodapeCount: rodape.length,
    ruleGroupCount: 6,
    modeloBIntegrated: options?.includeModeloBSample === false ? false : modeloBIntegrated,
    warnings,
    errors,
  });

  return {
    kind: "kitchen-industrial-library",
    title: "Kitchen Library (Industrial)",
    version: KITCHEN_LIBRARY_VERSION,
    generatedAt: new Date().toISOString(),
    modules: { all, base, tall, upper, corner },
    fronts,
    doors,
    remates,
    rodape,
    rules,
    drawers: { modeloB },
    integrations: {
      technicalViews: modeloB.hasTechnical || all.every((m) => m.integrations.technicalViews),
      dxf: modeloB.hasDxf || all.every((m) => m.integrations.dxf),
      overlay: modeloB.hasOverlay || all.every((m) => m.integrations.overlay),
      docs: modeloB.hasDocs || all.every((m) => m.integrations.docs),
      releaseNotes: modeloB.hasReleaseNotes,
      safety: modeloB.hasSafety,
      pricing: Boolean(pricing),
    },
    pricing,
    report,
  };
}
