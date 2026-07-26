/**
 * dxfExport.ts — Exportação DXF em memória + vistas + metadata + report.
 */

import type { EuropeanDrawerResult } from "../types";
import { buildEuropeanDxfDocument, type EuropeanDxfDocument } from "./dxfBuilder";
import { buildTechnicalDrawingMode, type EuropeanTechnicalDrawingMode } from "./technicalDrawingMode";
import { buildDxfReport, type EuropeanDxfReport } from "./dxfReport";

export type EuropeanDXFExport = {
  kind: "european-dxf-export";
  title: string;
  document: EuropeanDxfDocument;
  technical: EuropeanTechnicalDrawingMode;
  metadata: {
    systemId: string;
    modelDisplayName: string;
    runnerLengthMm: number;
    heightMm: number;
    drawerCount: number;
    pieceCodes: string[];
  };
  report: EuropeanDxfReport;
};

/**
 * Constrói export DXF completo em memória (sem ficheiro físico).
 */
export function buildEuropeanDXF(result: EuropeanDrawerResult): EuropeanDXFExport {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const document = buildEuropeanDxfDocument(result);
    const technical = buildTechnicalDrawingMode(result);
    const pieceCodes = [
      ...new Set(
        result.cutlist
          .filter((i) => i.kind === "wood")
          .map((i) => i.codigo)
          .filter((c): c is string => Boolean(c))
      ),
    ];

    if (document.contourCount === 0) warnings.push("Nenhum contorno de peça gerado.");
    if (document.holeEntityCount === 0 && result.holes.length > 0) {
      warnings.push("Furos no resultado mas 0 entidades DRILLING.");
    }
    if (!result.valid) warnings.push("Resultado industrial invalid — DXF gerado do estado disponível.");

    const report = buildDxfReport({
      entityCount: document.entities.length,
      layerCount: document.layers.length,
      viewCount: technical.views.length,
      contourCount: document.contourCount,
      holeEntityCount: document.holeEntityCount,
      warnings,
      errors,
    });

    return {
      kind: "european-dxf-export",
      title: `DXF — ${result.model.displayName}`,
      document,
      technical,
      metadata: {
        systemId: result.systemId,
        modelDisplayName: result.model.displayName,
        runnerLengthMm: result.config.depthMm,
        heightMm: result.config.heightMm,
        drawerCount: Math.max(1, Math.floor(result.config.count ?? 1)),
        pieceCodes,
      },
      report,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    const technical = buildTechnicalDrawingMode(result);
    const document = buildEuropeanDxfDocument(result);
    return {
      kind: "european-dxf-export",
      title: `DXF — erro`,
      document,
      technical,
      metadata: {
        systemId: result.systemId,
        modelDisplayName: result.model.displayName,
        runnerLengthMm: result.config.depthMm,
        heightMm: result.config.heightMm,
        drawerCount: 1,
        pieceCodes: [],
      },
      report: buildDxfReport({
        entityCount: 0,
        layerCount: 0,
        viewCount: 0,
        contourCount: 0,
        holeEntityCount: 0,
        warnings,
        errors,
      }),
    };
  }
}
