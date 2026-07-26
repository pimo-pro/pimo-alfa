/**
 * Sistema Europeu de Gavetas — Modelo B
 *
 * API principal: generateEuropeanDrawer(model|systemId, box)
 *
 * Activo apenas quando o Modelo A estiver desactivado.
 * Nao altera o nucleo do Modelo A nem src/industrial/**.
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
  calcFrontWidthMm,
  calcFrontHeightMm,
  calcBottomWidthMm,
  calcBottomDepthMm,
  calcIndustrialClearances,
  pickRunnerDepthMm,
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

import type {
  DrawerEuropeanModel,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
  EuropeanDrawerResult,
  EuropeanDrawerSystemId,
} from "./types";
import {
  findHeightProfile,
  findNearestDepthMm,
  getEuropeanDrawerModel,
} from "./catalog";
import { buildEuropeanDrawerGeometry } from "./geometry";
import { generateEuropeanDrawerHoles } from "./drilling";
import { validateEuropeanDrawerBox, getAssemblyRules } from "./assembly";
import { buildEuropeanCutlistItems } from "./cutlist";
import { buildEuropeanDrawerPdfSection } from "./pdf";
import { buildEuropeanViewerData } from "./viewer";
import { isDrawerModeloAActive } from "../drawerSystemFlags";

function resolveModel(
  modelOrId: DrawerEuropeanModel | EuropeanDrawerSystemId
): DrawerEuropeanModel {
  if (typeof modelOrId === "string") return getEuropeanDrawerModel(modelOrId);
  return modelOrId;
}

/** Config default a partir do modelo + caixa. */
export function defaultEuropeanDrawerConfig(
  box: EuropeanDrawerBoxInput,
  systemId: EuropeanDrawerSystemId = "blum-legrabox"
): EuropeanDrawerBoxConfig {
  const model = getEuropeanDrawerModel(systemId);
  const height = model.heights[1] ?? model.heights[0]!;
  const depth = findNearestDepthMm(model, Math.min(500, box.dimensoes.profundidade - 40));
  return {
    systemId,
    heightMm: height.heightMm,
    heightCode: height.code || undefined,
    depthMm: depth,
    softClose: true,
    pushOpen: false,
    count: Math.max(1, Math.floor(box.gavetas ?? 1)),
  };
}

/**
 * Gera gaveta(s) europeias completas para um modulo.
 *
 * 1. Validar caixa
 * 2. Calcular medidas / geometria
 * 3. Gerar furos
 * 4. Gerar cutlist + PDF + viewer
 */
export function generateEuropeanDrawer(
  modelOrId: DrawerEuropeanModel | EuropeanDrawerSystemId,
  box: EuropeanDrawerBoxInput,
  configOverride?: Partial<EuropeanDrawerBoxConfig>
): EuropeanDrawerResult {
  const model = resolveModel(modelOrId);
  const base = box.europeanDrawerConfig ?? defaultEuropeanDrawerConfig(box, model.id);
  const config: EuropeanDrawerBoxConfig = {
    ...base,
    ...configOverride,
    systemId: model.id,
  };

  // Normalizar altura/profundidade ao catalogo
  const heightProfile = findHeightProfile(model, config.heightMm);
  config.heightMm = heightProfile.heightMm;
  config.heightCode = heightProfile.code || config.heightCode;
  config.depthMm = findNearestDepthMm(model, config.depthMm);

  const count = Math.max(1, Math.floor(config.count ?? box.gavetas ?? 1));
  config.count = count;

  const validation = validateEuropeanDrawerBox(box, model, config);

  // Se Modelo A ainda activo, devolver estrutura vazia valida=false (B so com A off).
  if (isDrawerModeloAActive()) {
    const emptyGeo = buildEuropeanDrawerGeometry(box, model, config, 0, 1);
    return {
      systemId: model.id,
      model,
      config,
      valid: false,
      errors: ["Modelo A ainda activo — desactivar em Admin ? Produtos ? Gavetas para usar o Modelo B."],
      warnings: validation.warnings,
      geometry: emptyGeo,
      holes: [],
      cutlist: [],
      pdf: buildEuropeanDrawerPdfSection({
        model,
        config,
        geometry: emptyGeo,
        cutlist: [],
        holes: [],
        boxName: box.nome,
      }),
      viewer: { drawers: [] },
      assembly: getAssemblyRules(model),
    };
  }

  const drawersGeo = [];
  const allHoles = [];
  const allCutlist = [];

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
      materialLabel: box.material,
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

  const primaryGeometry = drawersGeo[0]?.geometry ?? buildEuropeanDrawerGeometry(box, model, config, 0, count);

  return {
    systemId: model.id,
    model,
    config,
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    geometry: primaryGeometry,
    holes: allHoles,
    cutlist: allCutlist,
    pdf: buildEuropeanDrawerPdfSection({
      model,
      config,
      geometry: primaryGeometry,
      cutlist: allCutlist,
      holes: allHoles,
      boxName: box.nome,
    }),
    viewer: buildEuropeanViewerData({ drawers: drawersGeo }),
    assembly: getAssemblyRules(model),
  };
}

/**
 * Gera N gavetas europeias e devolve layer items (para boxLayersService).
 */
export function generateEuropeanDrawersForBox(box: EuropeanDrawerBoxInput) {
  const result = generateEuropeanDrawer(
    box.europeanDrawerConfig?.systemId ?? "blum-legrabox",
    box
  );
  return result;
}
