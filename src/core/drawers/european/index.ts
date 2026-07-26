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
import {
  HETTICH_RUNNER_LENGTHS_MM,
  isHettichRunnerLengthMm,
  pickHettichRunnerForBox,
  resolveEuropeanUsefulInternalDepthMm,
} from "./measures";

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
  const allHoles = [];
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
    allHoles.push(...holes);
    allCutlist.push(...cutlist);
  }

  const primaryGeometry =
    drawersGeo[0]?.geometry ?? buildEuropeanDrawerGeometry(box, model, config, 0, count);
  const assembly = getAssemblyRules(model);
  const pdf = buildEuropeanDrawerPdfSection({
    model,
    config,
    geometry: primaryGeometry,
    cutlist: allCutlist,
    holes: allHoles,
    boxName: box.nome,
  });
  const viewer = buildEuropeanViewerData({ drawers: drawersGeo });

  return { primaryGeometry, allHoles, allCutlist, pdf, viewer, assembly, drawersGeo };
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

  const boxWithUseful: EuropeanDrawerBoxInput = {
    ...box,
    profundidadeInternaUtilMm: box.profundidadeInternaUtilMm ?? useful,
  };

  if (isDrawerModeloAActive()) {
    const emptyGeo = buildEuropeanDrawerGeometry(boxWithUseful, model, config, 0, 1);
    return {
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
    };
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

  const built = buildPipeline(boxWithUseful, model, config);
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
    return {
      systemId: model.id,
      model,
      config,
      valid: false,
      errors: validation.errors.map((e) => e.message),
      warnings: validation.warnings.map((w) => w.message),
      autoFixes: autoFixMeta,
      geometry: built.primaryGeometry,
      holes: [],
      cutlist: [],
      pdf: emptyPdf(model, config, built.primaryGeometry, box.nome),
      viewer: { drawers: [] },
      assembly: built.assembly,
    };
  }

  void HETTICH_RUNNER_LENGTHS_MM;

  return {
    systemId: model.id,
    model,
    config,
    valid: true,
    errors: [],
    warnings: validation.warnings.map((w) => w.message),
    autoFixes: autoFixMeta,
    geometry: built.primaryGeometry,
    holes: built.allHoles,
    cutlist: built.allCutlist,
    pdf: built.pdf,
    viewer: built.viewer,
    assembly: built.assembly,
  };
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
