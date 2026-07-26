/**
 * Sistema Europeu de Gavetas  Modelo B
 *
 * API principal: generateEuropeanDrawer(model|systemId, box)
 *
 * Activo apenas quando o Modelo A estiver desactivado.
 * No altera o ncleo do Modelo A nem src/industrial/**.
 */

export type {
  DrawerEuropeanModel,
  DrawerSideProfile,
  DrawerDepthProfile,
  DrawerHeightProfile,
  DrawerHolePattern,
  DrawerGeometry,
  DrawerAssemblyRules,
  DrawerPDFSection,
  DrawerCutlistItem,
  EuropeanDrawerHole,
  EuropeanDrawerResult,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
  EuropeanDrawerSystemId,
  EuropeanDrawerBrand,
  EuropeanDrawerViewerData,
} from "./types";

export {
  EUROPEAN_DRAWER_SYSTEMS,
  BLUM_LEGRABOX,
  BLUM_TANDEMBOX_ANTARO,
  HETTICH_INNOTECH_ATIRA,
  GRASS_NOVA_PRO_SCALA,
  getEuropeanDrawerModel,
  listEuropeanDrawerModels,
  findNearestDepthMm,
  findHeightProfile,
} from "./catalog";

export {
  calcBoxInternalWidthMm,
  calcDrawerInternalWidthMm,
  calcDrawerExternalWidthMm,
  calcFrontWidthMm,
  calcFrontHeightMm,
  calcBottomWidthMm,
  calcBottomDepthMm,
  calcBodyDepthWithoutFrontMm,
  calcIndustrialClearances,
  pickRunnerDepthMm,
  pickHettichRunnerForBox,
  selectHettichRunnerDepth,
  HETTICH_RUNNER_LENGTHS_MM,
  resolveEuropeanUsefulInternalDepthMm,
  EUROPEAN_SIDE_CLEARANCE_EACH_MM,
  EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM,
} from "./measures";

export {
  buildEuropeanDrawerGeometry,
  calcUsefulCabinetHeightMm,
  getIndustrialTolerances,
} from "./geometry";

export {
  generateEuropeanDrawerHoles,
  generateModuleLateralHoles,
  generateFrontFixationHoles,
  generateBottomHoles,
  generateDrawerSideHolesFromModeloA,
  generateDrawerBackHolesFromModeloA,
  europeanHolesToPanelDrillHoles,
} from "./drilling";

export {
  validateEuropeanDrawerBox,
  getAssemblyRules,
  buildAssemblyChecklist,
} from "./assembly";

export { buildEuropeanCutlistItems } from "./cutlist";
export { buildEuropeanDrawerPdfSection, appendEuropeanDrawerPdfSection } from "./pdf";
export { buildEuropeanViewerData, calcEuropeanDrawerPullOffsetMm } from "./viewer";
export {
  europeanGeometryToLayerItem,
  europeanCutlistToCutListItems,
  europeanResultToLayerItems,
  collectModuleLateralDrillHoles,
} from "./adapter";

export {
  resolveEuropeanPieceNaming,
  europeanBodyIndustrialName,
  europeanFrontIndustrialName,
  formatEuropeanIndustrialLabel,
} from "./naming";

export {
  runEuropeanDrawerValidation,
  validateAll,
  applyEuropeanAutoFixes,
  buildEuropeanAutoFixes,
  validationMessages,
  type EuropeanDrawerValidationResult,
  type EuropeanDrawerAutoFixAction,
} from "./validation";

export {
  memo,
  bumpEuropeanPerfConfigEpoch,
  clearAllEuropeanMemos,
  getEuropeanPerfConfigEpoch,
} from "./perf/memo";

export { getCachedEuropeanViewerData, buildViewerDimKey } from "./viewer/perf";

export {
  ensureConfigSafe,
  ensureFiniteNumber,
  ensureNonNegative,
  ensureDimensionPositive,
  sanitizeGeometry,
  sanitizeCutlist,
  sanitizeHoles,
  sanitizePdfSection,
  sanitizeViewerData,
  getRobustDebugLog,
  clearRobustDebugLog,
} from "./robustness";

export {
  runSafetyConfigGate,
  runSafetyMeasuresGate,
  runSafetyGeometryGate,
  runSafetyDrillingGate,
  runSafetyCutlistGate,
  runSafetyPdfGate,
  runSafetyViewerGate,
  runPrePipelineSafetyGates,
  runPostPipelineSafetyGates,
  mergeSafetyReports,
  buildSafetyReport,
  formatSafetyReportText,
  type EuropeanSafetyReport,
  type EuropeanSafetyGateResult,
} from "./safety";

export {
  buildEuropeanIndustrialDocs,
  buildEuropeanIndustrialMetadata,
  buildFichaTecnica,
  buildMultiPagePdf,
  buildDocsReport,
  formatDocsReportText,
  type EuropeanIndustrialDocs,
  type EuropeanIndustrialMetadata,
  type EuropeanFichaTecnica,
  type EuropeanMultiPagePdf,
  type EuropeanDocsReport,
} from "./docs";

export {
  buildEuropeanDXF,
  buildTechnicalDrawingMode,
  buildFrontView,
  buildSideView,
  buildTopView,
  buildExplodedView,
  buildEuropeanDxfDocument,
  buildDxfReport,
  formatDxfReportText,
  EUROPEAN_DXF_LAYERS,
  buildEuropeanDXFFileContents,
  prepareEuropeanDXFFiles,
  buildDxfFileReport,
  type EuropeanDXFExport,
  type EuropeanTechnicalDrawingMode,
  type EuropeanTechnicalView,
  type EuropeanDxfReport,
  type EuropeanDxfDocument,
  type DxfExportReport,
  type DxfExportOptions,
} from "./dxf";

export {
  buildEuropeanOverlay,
  buildOverlayMeasures,
  buildOverlayAberturas,
  buildOverlayGaps,
  buildOverlayRemates,
  buildOverlayRodaPe,
  buildOverlayReport,
  formatOverlayReportText,
  type EuropeanOverlay,
  type EuropeanOverlayMeasures,
  type EuropeanOverlayAberturas,
  type EuropeanOverlayGaps,
  type EuropeanOverlayReport,
} from "./overlay";

export {
  buildEuropeanReleaseNotes,
  collectEuropeanReleaseEvents,
  formatEuropeanReleaseSections,
  formatEuropeanReleaseText,
  buildReleaseReport,
  formatReleaseReportText,
  EUROPEAN_RELEASE_VERSION,
  EUROPEAN_RELEASE_AUTHOR,
  type EuropeanReleaseNotes,
  type EuropeanReleaseReport,
  type EuropeanReleaseSection,
} from "./release";

export {
  buildEuropeanCncPrograms,
  prepareEuropeanCNCFiles,
  buildEuropeanCNCFileContents,
  buildCncFileReport,
  formatCncReportText,
  buildCncFileName,
  resolveCncPieceKeyFromCodigo,
  mapEuropeanResultToCncPieces,
  mapHolePieceRefToCodigo,
  DEFAULT_CNC_EXPORT_DIR,
  type CncExportReport,
  type CncExportOptions,
  type CncExportStatus,
  type EuropeanCncFormat,
  type EuropeanCncPieceKey,
  type CncPieceProgram,
} from "./cnc";

export {
  buildIndustrialPricing,
  buildKitchenLibraryPricing,
  calculateMaterialCost,
  calculateCncCost,
  type IndustrialPricing,
  type PricingStatus,
} from "../../pricing";

export {
  enforceNaming,
  enforceCutlistIdentity,
  enforcePdfIdentity,
  enforceDrillingIdentity,
  enforceViewerIdentity,
  enforcePieceIdentity,
  isCanonicalEuropeanCode,
  EUROPEAN_INDUSTRIAL_CODES,
  EUROPEAN_INDUSTRIAL_NAMES,
} from "./consistency";

export {
  ALL_SCENARIOS,
  buildEuropeanQaScenarios,
  runScenario,
  runStressTests,
  buildQaSummary,
  formatQaSummaryText,
  formatScenarioConsoleLine,
  reportConsole,
  downloadQaResultsJson,
  serializeQaResultsJson,
  QA_RESULTS_FILENAME,
  type EuropeanQaScenario,
  type EuropeanQaScenarioResult,
  type EuropeanQaSummary,
  type RunStressTestsOptions,
} from "./qa";

import type {
  DrawerEuropeanModel,
  DrawerPDFSection,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
  EuropeanDrawerResult,
  EuropeanDrawerSystemId,
} from "./types";
import { findHeightProfile, getEuropeanDrawerModel } from "./catalog";
import { buildEuropeanDrawerGeometry } from "./geometry";
import { generateEuropeanDrawerHoles } from "./drilling";
import { getAssemblyRules } from "./assembly";
import { buildEuropeanCutlistItems } from "./cutlist";
import { buildEuropeanDrawerPdfSection } from "./pdf";
import { buildEuropeanViewerData } from "./viewer";
import { isDrawerModeloAActive } from "../drawerSystemFlags";
import {
  applyEuropeanAutoFixes,
  buildEuropeanAutoFixes,
  validateAll,
  validateBoxCompatibility,
} from "./validation";
import { bumpEuropeanPerfConfigEpoch } from "./perf/memo";
import { ensureConfigSafe } from "./robustness/safeConfig";
import {
  enforceCutlistIdentity,
  enforceDrillingIdentity,
  enforcePdfIdentity,
  enforcePieceIdentity,
  enforceViewerIdentity,
} from "./consistency";
import {
  mergeSafetyReports,
  runPostPipelineSafetyGates,
  runPrePipelineSafetyGates,
  type EuropeanSafetyReport,
} from "./safety";
import { buildEuropeanIndustrialDocs } from "./docs";
import { buildEuropeanDXF, buildTechnicalDrawingMode } from "./dxf";
import { buildEuropeanOverlay } from "./overlay";
import { buildEuropeanReleaseNotes } from "./release";
import { buildIndustrialPricing } from "../../pricing";
import {
  HETTICH_RUNNER_LENGTHS_MM,
  isHettichRunnerLengthMm,
  pickHettichRunnerForBox,
  resolveEuropeanUsefulInternalDepthMm,
} from "./measures";

function attachIndustrialDocs(
  result: EuropeanDrawerResult,
  box?: EuropeanDrawerBoxInput
): EuropeanDrawerResult {
  const withDocs: EuropeanDrawerResult = {
    ...result,
    docs: buildEuropeanIndustrialDocs(result, box),
  };
  const dxf = buildEuropeanDXF(withDocs);
  const technical = buildTechnicalDrawingMode(withDocs);
  const withTech: EuropeanDrawerResult = {
    ...withDocs,
    dxf,
    technical,
  };
  const overlay = buildEuropeanOverlay(withTech, box);
  const withOverlay: EuropeanDrawerResult = {
    ...withTech,
    overlay,
  };
  const releaseNotes = buildEuropeanReleaseNotes(withOverlay);
  const withRelease: EuropeanDrawerResult = {
    ...withOverlay,
    releaseNotes,
  };
  const pricing = buildIndustrialPricing(withRelease);
  return {
    ...withRelease,
    pricing,
  };
}

function toResultSafetyReport(report: EuropeanSafetyReport): NonNullable<EuropeanDrawerResult["safetyReport"]> {
  return {
    status: report.status,
    totalDurationMs: report.totalDurationMs,
    errors: report.errors.map((e) => ({
      gate: e.gate,
      code: e.code,
      message: e.message,
      piece: e.piece,
    })),
    warnings: report.warnings.map((w) => ({
      gate: w.gate,
      code: w.code,
      message: w.message,
      piece: w.piece,
    })),
    piecesAffected: report.piecesAffected,
    gates: report.gates.map((g) => ({
      gate: g.gate,
      ok: g.ok,
      durationMs: g.durationMs,
    })),
  };
}

function safetyFailResult(
  model: DrawerEuropeanModel,
  config: EuropeanDrawerBoxConfig,
  box: EuropeanDrawerBoxInput,
  report: EuropeanSafetyReport,
  geometry?: ReturnType<typeof buildEuropeanDrawerGeometry>,
  assembly?: ReturnType<typeof getAssemblyRules>
): EuropeanDrawerResult {
  const geo = geometry ?? buildEuropeanDrawerGeometry(box, model, config, 0, 1);
  return attachIndustrialDocs(
    {
      systemId: model.id,
      model,
      config,
      valid: false,
      errors: report.errors.map((e) => `[safety:${e.gate}/${e.code}] ${e.message}`),
      warnings: report.warnings.map((w) => `[safety:${w.gate}/${w.code}] ${w.message}`),
      autoFixes: [],
      geometry: geo,
      holes: [],
      cutlist: [],
      pdf: emptyPdf(model, config, geo, box.nome),
      viewer: { drawers: [] },
      assembly: assembly ?? getAssemblyRules(model),
      safetyReport: toResultSafetyReport(report),
    },
    box
  );
}

function resolveModel(
  modelOrId: DrawerEuropeanModel | EuropeanDrawerSystemId
): DrawerEuropeanModel {
  if (typeof modelOrId === "string") return getEuropeanDrawerModel(modelOrId);
  return modelOrId;
}

function snapHettichDepth(requestedMm: number, usefulInternalMm: number): number {
  const picked = pickHettichRunnerForBox({
    id: "_",
    dimensoes: { largura: 1, altura: 1, profundidade: usefulInternalMm + 50 },
    espessura: 19,
    profundidadeInternaUtilMm: usefulInternalMm,
  });
  if (isHettichRunnerLengthMm(requestedMm) && requestedMm < usefulInternalMm) {
    return requestedMm;
  }
  return picked;
}

/** Config default a partir do modelo + caixa. */
export function defaultEuropeanDrawerConfig(
  box: EuropeanDrawerBoxInput,
  systemId: EuropeanDrawerSystemId = "hettich-innotech-atira"
): EuropeanDrawerBoxConfig {
  const model = getEuropeanDrawerModel(systemId);
  const height = model.heights[1] ?? model.heights[0]!;
  const useful = resolveEuropeanUsefulInternalDepthMm(box);
  const depth = pickHettichRunnerForBox({ ...box, profundidadeInternaUtilMm: useful });
  return {
    systemId,
    heightMm: height.heightMm,
    heightCode: height.code || undefined,
    depthMm: depth,
    softClose: true,
    pushOpen: false,
    count: Math.max(1, Math.floor(box.gavetas ?? 1)),
    dualFront: false,
  };
}

function emptyPdf(
  model: DrawerEuropeanModel,
  config: EuropeanDrawerBoxConfig,
  geometry: EuropeanDrawerResult["geometry"],
  boxName?: string
): DrawerPDFSection {
  return buildEuropeanDrawerPdfSection({
    model,
    config,
    geometry,
    cutlist: [],
    holes: [],
    boxName,
  });
}

function buildPipeline(
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel,
  config: EuropeanDrawerBoxConfig
) {
  const count = Math.max(1, Math.floor(config.count ?? box.gavetas ?? 1));
  const drawersGeo = [];
  const allCutlist = [];
  const frontMat = config.frontMaterialId ?? box.material;

  for (let i = 0; i < count; i++) {
    const geometry = buildEuropeanDrawerGeometry(box, model, config, i, count);
    const holes = generateEuropeanDrawerHoles({
      model,
      box,
      config,
      stackIndex: i,
      stackCount: count,
    });
    const cutlist = buildEuropeanCutlistItems({
      boxId: box.id,
      boxName: box.nome,
      model,
      config,
      geometry,
      drawerIndex: i,
      drawerCount: count,
      materialLabel: box.material,
      frontMaterialLabel: frontMat,
    });
    drawersGeo.push({
      id: `eu-drawer-${box.id}-${i}`,
      index: i,
      geometry,
      holes,
    });
    allCutlist.push(...cutlist);
  }

  const primaryGeometry = enforcePieceIdentity(
    drawersGeo[0]?.geometry ?? buildEuropeanDrawerGeometry(box, model, config, 0, count)
  );
  const assembly = getAssemblyRules(model);

  const allCutlistEnforced = enforceCutlistIdentity(allCutlist, { drawerCount: count });

  for (const d of drawersGeo) {
    d.geometry = enforcePieceIdentity(d.geometry);
    d.holes = enforceDrillingIdentity(d.holes, {
      drawerCount: count,
      drawerIndex0: d.index,
    });
  }
  // Reagregar furos já normalizados por índice de gaveta (evita colapsar fronts multi).
  const allHolesEnforced = drawersGeo.flatMap((d) => d.holes);

  const pdf = enforcePdfIdentity(
    buildEuropeanDrawerPdfSection({
      model,
      config,
      geometry: primaryGeometry,
      cutlist: allCutlistEnforced,
      holes: allHolesEnforced,
      boxName: box.nome,
    }),
    { drawerCount: count }
  );
  const viewer = enforceViewerIdentity(buildEuropeanViewerData({ drawers: drawersGeo }), {
    drawerCount: count,
  });

  return {
    primaryGeometry,
    allHoles: allHolesEnforced,
    allCutlist: allCutlistEnforced,
    pdf,
    viewer,
    assembly,
    drawersGeo,
  };
}

export type GenerateEuropeanDrawerOptions = {
  /** Aplicar auto-fixes seguros antes da geração (default true). */
  applyAutoFixes?: boolean;
};

/**
 * Gera gaveta(s) europeias completas para um modulo.
 *
 * Pipeline otimizado: autoFix (leve) ? 1× buildPipeline ? validateAll ? gate.
 * Sem alteração de regras industriais — apenas menos passagens.
 */
export function generateEuropeanDrawer(
  modelOrId: DrawerEuropeanModel | EuropeanDrawerSystemId,
  box: EuropeanDrawerBoxInput,
  configOverride?: Partial<EuropeanDrawerBoxConfig>,
  options?: GenerateEuropeanDrawerOptions
): EuropeanDrawerResult {
  const applyFixes = options?.applyAutoFixes !== false;
  const model = resolveModel(modelOrId);
  const base = box.europeanDrawerConfig ?? defaultEuropeanDrawerConfig(box, model.id);
  let config: EuropeanDrawerBoxConfig = {
    ...base,
    ...configOverride,
    systemId: model.id,
  };

  const heightProfile = findHeightProfile(model, config.heightMm);
  config.heightMm = heightProfile.heightMm;
  config.heightCode = heightProfile.code || config.heightCode;

  const useful = resolveEuropeanUsefulInternalDepthMm(box);
  config.depthMm = snapHettichDepth(config.depthMm, useful);
  config.count = Math.max(1, Math.floor(config.count ?? box.gavetas ?? 1));
  config = ensureConfigSafe(config, box);

  const boxWithUseful: EuropeanDrawerBoxInput = {
    ...box,
    profundidadeInternaUtilMm: box.profundidadeInternaUtilMm ?? useful,
  };

  if (isDrawerModeloAActive()) {
    const emptyGeo = buildEuropeanDrawerGeometry(boxWithUseful, model, config, 0, 1);
    return attachIndustrialDocs(
      {
        systemId: model.id,
        model,
        config,
        valid: false,
        errors: [
          "Modelo A ainda activo — desactivar em Admin ? Produtos ? Gavetas para usar o Modelo B.",
        ],
        warnings: [],
        autoFixes: [],
        geometry: emptyGeo,
        holes: [],
        cutlist: [],
        pdf: emptyPdf(model, config, emptyGeo, box.nome),
        viewer: { drawers: [] },
        assembly: getAssemblyRules(model),
      },
      boxWithUseful
    );
  }

  // AutoFix antes da geracao (mesmas regras; so se caixa incompativel)
  if (applyFixes) {
    const boxCheck = validateBoxCompatibility(boxWithUseful, model, config);
    if (!boxCheck.valid) {
      const preFixes = buildEuropeanAutoFixes(boxWithUseful, model, config, boxCheck.errors);
      if (preFixes.length > 0) {
        config = applyEuropeanAutoFixes(config, preFixes);
        config.depthMm = snapHettichDepth(config.depthMm, useful);
        const hp = findHeightProfile(model, config.heightMm);
        config.heightMm = hp.heightMm;
        config.heightCode = hp.code || config.heightCode;
        bumpEuropeanPerfConfigEpoch();
      }
    }
  }

  // Fase 10 — Safety Gates pré-pipeline (bloqueio; sem auto-correção)
  const preSafety = runPrePipelineSafetyGates(config, boxWithUseful, model);
  if (preSafety.status === "INVALID") {
    return safetyFailResult(model, config, boxWithUseful, preSafety);
  }

  const built = buildPipeline(boxWithUseful, model, config);

  // Fase 10 — Safety Gates pós-pipeline
  const postSafety = runPostPipelineSafetyGates({
    geometry: built.primaryGeometry,
    holes: built.allHoles,
    cutlist: built.allCutlist,
    pdf: built.pdf,
    viewer: built.viewer,
  });
  const safetyReport = mergeSafetyReports(preSafety, postSafety);
  if (safetyReport.status === "INVALID") {
    return safetyFailResult(
      model,
      config,
      boxWithUseful,
      safetyReport,
      built.primaryGeometry,
      built.assembly
    );
  }

  const validation = validateAll({
    box: boxWithUseful,
    model,
    config,
    geometry: built.primaryGeometry,
    holes: built.allHoles,
    cutlist: built.allCutlist,
    pdf: built.pdf,
    viewer: built.viewer,
    assembly: built.assembly,
  });

  const autoFixMeta = validation.autoFixes.map((f) => ({
    code: f.code,
    description: f.description,
  }));

  if (!validation.valid) {
    return attachIndustrialDocs(
      {
        systemId: model.id,
        model,
        config,
        valid: false,
        errors: validation.errors.map((e) => e.message),
        warnings: [
          ...validation.warnings.map((w) => w.message),
          ...safetyReport.warnings.map((w) => `[safety:${w.gate}/${w.code}] ${w.message}`),
        ],
        autoFixes: autoFixMeta,
        geometry: built.primaryGeometry,
        holes: [],
        cutlist: [],
        pdf: emptyPdf(model, config, built.primaryGeometry, box.nome),
        viewer: { drawers: [] },
        assembly: built.assembly,
        safetyReport: toResultSafetyReport(safetyReport),
      },
      boxWithUseful
    );
  }

  void HETTICH_RUNNER_LENGTHS_MM;

  return attachIndustrialDocs(
    {
      systemId: model.id,
      model,
      config,
      valid: true,
      errors: [],
      warnings: [
        ...validation.warnings.map((w) => w.message),
        ...safetyReport.warnings.map((w) => `[safety:${w.gate}/${w.code}] ${w.message}`),
      ],
      autoFixes: autoFixMeta,
      geometry: built.primaryGeometry,
      holes: built.allHoles,
      cutlist: built.allCutlist,
      pdf: built.pdf,
      viewer: built.viewer,
      assembly: built.assembly,
      safetyReport: toResultSafetyReport(safetyReport),
    },
    boxWithUseful
  );
}

/**
 * Calcula config corrigida (para botao UI "Aplicar correcoes automaticas").
 */
export function suggestEuropeanAutoFixedConfig(
  box: EuropeanDrawerBoxInput,
  config: EuropeanDrawerBoxConfig
): EuropeanDrawerBoxConfig {
  const model = getEuropeanDrawerModel(config.systemId);
  const dry = generateEuropeanDrawer(model, box, config, { applyAutoFixes: false });
  if (dry.valid) return { ...config };
  const fixed = generateEuropeanDrawer(model, box, config, { applyAutoFixes: true });
  return { ...fixed.config };
}

/**
 * Gera N gavetas europeias e devolve layer items (para boxLayersService).
 */
export function generateEuropeanDrawersForBox(box: EuropeanDrawerBoxInput) {
  return generateEuropeanDrawer(box.europeanDrawerConfig?.systemId ?? "hettich-innotech-atira", box);
}
