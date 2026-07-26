/**
 * finalAssembler.ts ù Consolida artefactos PIMO.PRO-V5 sem alterar componentes.
 */

import { generateEuropeanDrawer } from "../drawers/european";
import type { EuropeanDrawerResult } from "../drawers/european/types";
import { buildKitchenLibrary, type KitchenLibrary } from "../kitchen";
import {
  createPlannerState,
  plannerAddModule,
  plannerBuildExport,
  type PlannerExportPackage,
  type PlannerState,
} from "../planner";
import { prepareEuropeanDXFFiles } from "../drawers/european/dxf/export/dxfFileContents";
import { prepareEuropeanCNCFiles } from "../drawers/european/cnc/cncBuilder";
import { buildFinalDocumentation, type FinalDocumentationBundle } from "./finalDocumentation";
import { runFinalIntegrityCheck, type FinalIntegrityReport } from "./finalIntegrityCheck";
import { buildFinalReleaseReport, type FinalReleaseReport } from "./finalReport";
import {
  buildFinalVersionManifest,
  type FinalVersionManifest,
  PIMO_PRO_V5_VERSION,
} from "./finalVersioning";

export type FinalAssembledRelease = {
  kind: "pimo-pro-v5-final-release";
  version: string;
  manifest: FinalVersionManifest;
  result: EuropeanDrawerResult;
  library: KitchenLibrary;
  planner: PlannerState;
  plannerExport: PlannerExportPackage;
  /** Conteùdos DXF em memùria (nùo escreve disco). */
  dxfFiles: Array<{ fileName: string; pieceCode: string }>;
  /** Conteùdos CNC em memùria (nùo escreve disco). */
  cncFiles: Array<{ fileName: string; pieceCode: string; format: string }>;
  documentation: FinalDocumentationBundle;
  integrity: FinalIntegrityReport;
  report: FinalReleaseReport;
};

export type AssembleFinalReleaseOptions = {
  /** Se false, nùo gera amostra Modelo B (apenas library). Default true. */
  includeModeloBSample?: boolean;
  /** Coloca mùdulos demo no planner. Default true. */
  seedPlannerModules?: boolean;
};

/**
 * Consolida Modelo B + Kitchen + Planner + docs/pricing/DXF/CNC referùncias.
 * Nùo muta geometry/furos/cutlist existentes ù apenas lù e agrega.
 */
export function assemblePimoProV5FinalRelease(
  options?: AssembleFinalReleaseOptions
): FinalAssembledRelease {
  const includeModeloB = options?.includeModeloBSample !== false;

  const result = includeModeloB
    ? generateEuropeanDrawer(
        "hettich-innotech-atira",
        {
          id: "release-final-sample",
          nome: "PIMO.PRO-V5 Sample",
          dimensoes: { largura: 538, altura: 720, profundidade: 560 },
          espessura: 19,
          gavetas: 1,
          material: "mdf_branco",
          profundidadeInternaUtilMm: 500,
        },
        {
          systemId: "hettich-innotech-atira",
          heightMm: 144,
          depthMm: 450,
          softClose: true,
          pushOpen: false,
          count: 1,
        }
      )
    : ({} as EuropeanDrawerResult);

  const library = buildKitchenLibrary({ includeModeloBSample: includeModeloB });

  let planner = createPlannerState({ library });
  if (options?.seedPlannerModules !== false) {
    planner = plannerAddModule(planner, "base-600", { xMm: 0, yMm: 0 });
    planner = plannerAddModule(planner, "base-800", { xMm: 600, yMm: 0 });
    planner = plannerAddModule(planner, "upper-600", { xMm: 1600, yMm: 0 });
  }
  const plannerExport = plannerBuildExport(planner);

  const dxfPrepared = result?.dxf
    ? prepareEuropeanDXFFiles(result)
    : { files: [] as Array<{ fileName: string; pieceCode: string }> };
  const cncPrepared = result?.geometry
    ? prepareEuropeanCNCFiles(result, { format: "cnc" })
    : { files: [] as Array<{ fileName: string; pieceCode: string; format: string }> };

  const integrity = runFinalIntegrityCheck({ result, library, planner });

  const manifest = buildFinalVersionManifest({
    industrialStatus: integrity.industrialOk ? "OK" : "WARN",
    cncStatus: integrity.cncOk ? "OK" : "WARN",
    pricingStatus: integrity.pricingOk ? "OK" : "WARN",
    plannerStatus: integrity.plannerOk ? "OK" : "WARN",
  });

  const documentation = buildFinalDocumentation({
    manifest,
    result,
    library,
    plannerExport,
  });

  const report = buildFinalReleaseReport({
    manifest,
    documentation,
    integrity,
  });

  return {
    kind: "pimo-pro-v5-final-release",
    version: PIMO_PRO_V5_VERSION,
    manifest,
    result,
    library,
    planner,
    plannerExport,
    dxfFiles: dxfPrepared.files.map((f) => ({
      fileName: f.fileName,
      pieceCode: f.pieceCode,
    })),
    cncFiles: cncPrepared.files.map((f) => ({
      fileName: f.fileName,
      pieceCode: f.pieceCode,
      format: f.format,
    })),
    documentation,
    integrity,
    report,
  };
}
