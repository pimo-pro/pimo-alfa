/**
 * overlayBuilder.ts — MC Overlay completo (Modelo B).
 */

import type { EuropeanDrawerBoxInput, EuropeanDrawerResult } from "../types";
import { buildOverlayMeasures, type EuropeanOverlayMeasures } from "./overlayMeasures";
import { buildOverlayAberturas, type EuropeanOverlayAberturas } from "./overlayAberturas";
import { buildOverlayRemates, type EuropeanOverlayRemates } from "./overlayRemates";
import { buildOverlayRodaPe, type EuropeanOverlayRodaPe } from "./overlayRodaPe";
import { buildOverlayGaps, type EuropeanOverlayGaps } from "./overlayGaps";
import { buildOverlayReport, type EuropeanOverlayReport } from "./overlayReport";

export type EuropeanOverlayDxfIntegration = {
  extraLayers: Array<"REMATE" | "RODAPE" | "OVERLAY">;
  remateEntityCount: number;
  rodapeEntityCount: number;
  gapAnnotationCount: number;
  linkedTechnicalViews: string[];
};

export type EuropeanOverlayTechnicalIntegration = {
  viewIds: string[];
  aberturaByView: Record<string, string[]>;
  gapByView: Record<string, string[]>;
};

export type EuropeanOverlay = {
  kind: "european-mc-overlay";
  title: string;
  measures: EuropeanOverlayMeasures;
  aberturas: EuropeanOverlayAberturas;
  remates: EuropeanOverlayRemates;
  rodape: EuropeanOverlayRodaPe;
  gaps: EuropeanOverlayGaps;
  dxfIntegration: EuropeanOverlayDxfIntegration;
  technicalIntegration: EuropeanOverlayTechnicalIntegration;
  metadata: {
    systemId: string;
    modelDisplayName: string;
    runnerLengthMm: number;
    drawerCount: number;
    heightMm: number;
  };
  report: EuropeanOverlayReport;
};

function groupByView(
  items: Array<{ id: string; technicalView: string }>
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const it of items) {
    const key = it.technicalView;
    if (!map[key]) map[key] = [];
    map[key].push(it.id);
  }
  return map;
}

/**
 * Constrói MC Overlay avançado — somente leitura sobre o resultado.
 */
export function buildEuropeanOverlay(
  result: EuropeanDrawerResult,
  box?: EuropeanDrawerBoxInput
): EuropeanOverlay {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const measures = buildOverlayMeasures(result, box);
    const aberturas = buildOverlayAberturas(result, measures, box);
    const remates = buildOverlayRemates(result, box);
    const rodape = buildOverlayRodaPe(result, box);
    const gaps = buildOverlayGaps(result, aberturas);

    if (measures.internalUsefulWidthMm <= 0) {
      warnings.push("Largura interna útil <= 0 no overlay.");
    }
    if (!box) {
      warnings.push("Box omitida — medidas de módulo/remates usam fallbacks da geometry.");
    }
    if (!result.valid) {
      warnings.push("Resultado industrial invalid — overlay gerado do estado disponível.");
    }

    const technicalViewIds =
      result.technical?.viewIds ?? ["front", "side_right", "side_left", "top", "exploded"];

    const dxfIntegration: EuropeanOverlayDxfIntegration = {
      extraLayers: ["REMATE", "RODAPE", "OVERLAY"],
      remateEntityCount: remates.items.length,
      rodapeEntityCount: 1,
      gapAnnotationCount: gaps.items.length,
      linkedTechnicalViews: technicalViewIds,
    };

    const technicalIntegration: EuropeanOverlayTechnicalIntegration = {
      viewIds: technicalViewIds,
      aberturaByView: groupByView(aberturas.items),
      gapByView: groupByView(gaps.items),
    };

    const report = buildOverlayReport({
      sections: ["measures", "aberturas", "remates", "rodape", "gaps", "dxf", "technical"],
      measureCount: 6 + (measures.moduleInternal ? 4 : 0),
      aberturaCount: aberturas.items.length,
      gapCount: gaps.items.length,
      remateCount: remates.items.length,
      warnings,
      errors,
    });

    return {
      kind: "european-mc-overlay",
      title: `MC Overlay — ${result.model.displayName}`,
      measures,
      aberturas,
      remates,
      rodape,
      gaps,
      dxfIntegration,
      technicalIntegration,
      metadata: {
        systemId: result.systemId,
        modelDisplayName: result.model.displayName,
        runnerLengthMm: result.config.depthMm,
        drawerCount: Math.max(1, Math.floor(result.config.count ?? 1)),
        heightMm: result.config.heightMm,
      },
      report,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    const measures = buildOverlayMeasures(result, box);
    const aberturas = buildOverlayAberturas(result, measures, box);
    const remates = buildOverlayRemates(result, box);
    const rodape = buildOverlayRodaPe(result, box);
    const gaps = buildOverlayGaps(result, aberturas);
    return {
      kind: "european-mc-overlay",
      title: "MC Overlay — erro",
      measures,
      aberturas,
      remates,
      rodape,
      gaps,
      dxfIntegration: {
        extraLayers: ["REMATE", "RODAPE", "OVERLAY"],
        remateEntityCount: 0,
        rodapeEntityCount: 0,
        gapAnnotationCount: 0,
        linkedTechnicalViews: [],
      },
      technicalIntegration: { viewIds: [], aberturaByView: {}, gapByView: {} },
      metadata: {
        systemId: result.systemId,
        modelDisplayName: result.model.displayName,
        runnerLengthMm: result.config.depthMm,
        drawerCount: 1,
        heightMm: result.config.heightMm,
      },
      report: buildOverlayReport({
        sections: [],
        measureCount: 0,
        aberturaCount: 0,
        gapCount: 0,
        remateCount: 0,
        warnings,
        errors,
      }),
    };
  }
}
