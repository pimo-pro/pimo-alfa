/**
 * Helpers partilhados — FASE FINAL certificação industrial de gavetas.
 * Apenas testes; não altera código de produção.
 */

import {
  generateDrawerGroup,
  drawerGroupToLayerItems,
  type DrawerGenerationConfig,
} from "../core/drawers";
import { computeWardrobeLocalLayout } from "../core/wardrobe/wardrobeRules";
import { settingsDefaults } from "../core/settings/settingsSchema";
import type { DrawerLayerItem } from "../models/BoxLayers";
import type { BoxModule } from "../core/types";
import type { DrawerParametricOverrides } from "../core/drawers/DrawerParametrics";
import type { DrawerSlideType } from "../core/settings/settingsSchema";

export const DRAWER_SETTINGS = settingsDefaults.gavetas;

export type DrawerScenarioConfig = {
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
  boxThickness?: number;
  boxId?: string;
  drawerCount: number;
  drawerType?: "normal" | "pro";
  heightMode?: "equal" | "top_small_mid_medium_bottom_large" | "custom";
  slideType?: DrawerSlideType;
  metalBoxType?: string;
  softClose?: boolean;
  runnerClearanceMm?: number;
  drawerOverrides?: Array<DrawerParametricOverrides | undefined>;
  drawerSettingsOverrides?: Partial<typeof DRAWER_SETTINGS>;
  originX?: number;
  originY?: number;
};

export function buildDrawerScenario(config: DrawerScenarioConfig) {
  const drawerSettings = {
    ...DRAWER_SETTINGS,
    ...(config.drawerSettingsOverrides ?? {}),
    ...(config.slideType ? { gavetaTipoCorredica: config.slideType } : {}),
    ...(config.metalBoxType ? { gavetaTipoCaixaMetalica: config.metalBoxType as typeof DRAWER_SETTINGS.gavetaTipoCaixaMetalica } : {}),
    ...(typeof config.softClose === "boolean" ? { gavetaSoftClose: config.softClose } : {}),
    ...(config.runnerClearanceMm != null
      ? { gavetaRecuoProfundidadeCorredicaMm: config.runnerClearanceMm }
      : {}),
  };

  const genConfig: DrawerGenerationConfig = {
    boxWidth: config.boxWidth,
    boxHeight: config.boxHeight,
    boxDepth: config.boxDepth,
    boxThickness: config.boxThickness ?? 19,
    boxId: config.boxId ?? "cert-box",
    drawerCount: config.drawerCount,
    drawerType: config.drawerType ?? "normal",
    heightMode: config.heightMode ?? "equal",
    availableDepths: drawerSettings.gavetaProfundidadesDisponiveisMm,
    drawerSettings,
    drawerOverrides: config.drawerOverrides,
    originX: config.originX,
    originY: config.originY,
    espessuraCostaMm: 10,
    costaAtiva: true,
  };

  const group = generateDrawerGroup(genConfig);
  const layers = drawerGroupToLayerItems(group);
  return { group, layers, genConfig, drawerSettings };
}

export function buildWardrobeHjDrawerScenario() {
  const baseCabinetId = "base-1800-roupeiro-h-2400-cfg7";
  const widthMm = 1800;
  const heightMm = 2400;
  const depthMm = 560;
  const layout = computeWardrobeLocalLayout({
    baseCabinetId,
    widthMm,
    heightMm,
    depthMm,
    feetHeightMm: 100,
  });

  return buildDrawerScenario({
    boxWidth: layout.drawerCompartmentBoxWidthForGen_mm ?? widthMm / 2,
    boxHeight: layout.drawerCompartmentBoxHeightForGen_mm ?? 500,
    boxDepth: depthMm,
    boxId: "wardrobe-h-cfg7",
    drawerCount: 3,
    drawerType: "normal",
    heightMode: "equal",
    originX: layout.drawerOriginXLocal_mm ?? 0,
    originY: layout.drawerOriginYLocal_mm ?? 0,
  });
}

export function minimalBoxWithDrawers(
  layers: DrawerLayerItem[],
  overrides: Partial<BoxModule> = {}
): BoxModule {
  return {
    id: overrides.id ?? "box-cert",
    nome: overrides.nome ?? "Caixa Certificação",
    dimensoes: overrides.dimensoes ?? { largura: 600, altura: 720, profundidade: 560 },
    espessura: overrides.espessura ?? 19,
    tipoBorda: "reta",
    tipoFundo: "integrado",
    models: [],
    prateleiras: 0,
    portaTipo: "sem_porta",
    gavetas: layers.length,
    alturaGaveta: 0,
    doorsLayer: [],
    drawersLayer: layers,
    cutList: [],
    cutListComPreco: [],
    ferragens: [],
    precoTotalPecas: 0,
    estrutura3D: null,
    ...overrides,
  } as BoxModule;
}

/** Espelho de `inferPieceKind` em pdfEtiquetas.ts (apenas QA). */
export function classifyDrawerPieceForEtiqueta(tipo: string, nome: string): string {
  const t = tipo.toLowerCase();
  const n = nome.toUpperCase();
  if (
    t === "gaveta_frente_ext" ||
    t === "gaveta_frente_int" ||
    t === "gaveta_frente" ||
    n.includes("GAVETA_FRENTE") ||
    n.includes("GAV_FRENT")
  )
    return "FRENTE_GAVETA";
  if (t === "gaveta_lat_esq" || t === "gaveta_lat_dir" || n.includes("GAV_LAT")) return "GAV_LATERAIS";
  if (t === "gaveta_traseira" || n.includes("GAV_COST") || n.includes("GAV_TRA")) return "GAV_TRAS";
  if (t === "gaveta_fundo" || n.includes("GAV_FUN") || n.includes("GAVETA_FUNDO")) return "FUNDO_GAVETA";
  return "GENERIC";
}

export function snapshotDrawerLayer(layer: DrawerLayerItem, index: number) {
  return {
    index,
    width: layer.width,
    height: layer.height,
    bodyDepth: layer.bodyDepth,
    bodyWidth: layer.bodyWidth,
    bodyHeight: layer.bodyHeight,
    posX: layer.posX,
    posY: layer.posY,
    posZ: layer.posZ,
    slideType: layer.slideType,
    metalBoxType: layer.metalBoxType,
    softClose: layer.softClose,
    nominalDepth: layer.metadata?.nominalDepth,
    pullDistanceMm: layer.pullDistanceMm,
  };
}

export function countDrawerPiecesByTipo(
  tipos: string[]
): Record<string, number> {
  return tipos.reduce<Record<string, number>>((acc, tipo) => {
    acc[tipo] = (acc[tipo] ?? 0) + 1;
    return acc;
  }, {});
}
