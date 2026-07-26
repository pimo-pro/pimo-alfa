/**
 * europeanDrawerAdapter.ts — Integração somente-leitura com Modelo B.
 * Não altera generateEuropeanDrawer nem resultados industriais.
 */

import {
  generateEuropeanDrawer,
  type EuropeanDrawerResult,
  type EuropeanReleaseNotes,
} from "../../drawers/european";
import type { IndustrialPricing } from "../../pricing";

export type KitchenEuropeanDrawerSample = {
  source: "modelo-b";
  systemId: string;
  valid: boolean;
  hasTechnical: boolean;
  hasDxf: boolean;
  hasOverlay: boolean;
  hasDocs: boolean;
  hasReleaseNotes: boolean;
  hasSafety: boolean;
  hasPricing: boolean;
  viewIds: string[];
  dxfStatus?: string;
  docsStatus?: string;
  overlayStatus?: string;
  releaseVersion?: string;
  pricingStatus?: string;
  /** Snapshot leve — não muta o result. */
  summary: {
    holes: number;
    woodPieces: number;
    runnerMm: number;
    heightMm: number;
    costIndustrial?: number;
    priceFinal?: number;
  };
};

/**
 * Gera uma amostra Modelo B e mapeia camadas docs/dxf/overlay/technical/release/pricing.
 */
export function adaptEuropeanDrawerSample(options?: {
  widthMm?: number;
  heightMm?: number;
  depthMm?: number;
  drawerCount?: number;
}): {
  sample: KitchenEuropeanDrawerSample;
  result: EuropeanDrawerResult;
} {
  const widthMm = options?.widthMm ?? 538;
  const heightMm = options?.heightMm ?? 720;
  const depthMm = options?.depthMm ?? 560;
  const drawerCount = options?.drawerCount ?? 2;

  const result = generateEuropeanDrawer(
    "hettich-innotech-atira",
    {
      id: "kitchen-lib-sample",
      nome: "Kitchen Library Sample",
      dimensoes: { largura: widthMm, altura: heightMm, profundidade: depthMm },
      espessura: 19,
      gavetas: drawerCount,
      material: "mdf_branco",
      profundidadeInternaUtilMm: Math.max(300, depthMm - 2 * 19 - 20),
    },
    {
      systemId: "hettich-innotech-atira",
      heightMm: 144,
      depthMm: 450,
      softClose: true,
      pushOpen: false,
      count: drawerCount,
    }
  );

  const release: EuropeanReleaseNotes | undefined = result.releaseNotes;
  const pricing: IndustrialPricing | undefined = result.pricing;

  const sample: KitchenEuropeanDrawerSample = {
    source: "modelo-b",
    systemId: result.systemId,
    valid: result.valid,
    hasTechnical: Boolean(result.technical),
    hasDxf: Boolean(result.dxf),
    hasOverlay: Boolean(result.overlay),
    hasDocs: Boolean(result.docs),
    hasReleaseNotes: Boolean(release),
    hasSafety: Boolean(result.safetyReport),
    hasPricing: Boolean(pricing),
    viewIds: result.technical?.viewIds ?? [],
    dxfStatus: result.dxf?.report.status,
    docsStatus: result.docs?.report.status,
    overlayStatus: result.overlay?.report.status,
    releaseVersion: release?.version,
    pricingStatus: pricing?.report.status,
    summary: {
      holes: result.holes.length,
      woodPieces: result.cutlist.filter((i) => i.kind === "wood").length,
      runnerMm: result.config.depthMm,
      heightMm: result.config.heightMm,
      costIndustrial: pricing?.totals.costIndustrial,
      priceFinal: pricing?.totals.priceFinal,
    },
  };

  return { sample, result };
}
