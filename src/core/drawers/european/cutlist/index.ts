/**
 * cutlist/ — Cutlist do Sistema Europeu (Modelo B).
 */

import type {
  DrawerCutlistItem,
  DrawerEuropeanModel,
  DrawerGeometry,
  EuropeanDrawerBoxConfig,
} from "../types";

export function buildEuropeanCutlistItems(params: {
  boxId: string;
  boxName?: string;
  model: DrawerEuropeanModel;
  config: EuropeanDrawerBoxConfig;
  geometry: DrawerGeometry;
  drawerIndex: number;
  materialLabel?: string;
}): DrawerCutlistItem[] {
  const { boxId, boxName, model, config, geometry, drawerIndex, materialLabel } = params;
  const mat = materialLabel ?? "MDF Branco 19";
  const prefix = boxName ? `${boxName} ` : "";
  const n = drawerIndex + 1;
  const items: DrawerCutlistItem[] = [];

  items.push({
    id: `${boxId}-eu-front-${n}`,
    nome: `${prefix}GAV${n} Frente (${model.displayName})`,
    quantidade: 1,
    larguraMm: geometry.front.widthMm,
    alturaMm: geometry.front.heightMm,
    profundidadeMm: geometry.front.thicknessMm,
    espessuraMm: geometry.front.thicknessMm,
    material: mat,
    kind: "wood",
    tipo: "gaveta_frente",
    observacoesIndustriais: `Sistema ${model.displayName}; altura ${config.heightMm} mm`,
  });

  items.push({
    id: `${boxId}-eu-bottom-${n}`,
    nome: `${prefix}GAV${n} Fundo`,
    quantidade: 1,
    larguraMm: geometry.bottom.widthMm,
    alturaMm: geometry.bottom.thicknessMm,
    profundidadeMm: geometry.bottom.depthMm,
    espessuraMm: geometry.bottom.thicknessMm,
    material: "MDF 16",
    kind: "wood",
    tipo: "gaveta_fundo",
    observacoesIndustriais: "Fundo para caixa metalica europeia",
  });

  items.push({
    id: `${boxId}-eu-metal-${n}`,
    nome: `${prefix}GAV${n} Caixa metalica ${model.displayName}`,
    quantidade: 1,
    larguraMm: geometry.internalWidthMm,
    alturaMm: geometry.usefulHeightMm,
    profundidadeMm: geometry.runnerDepthMm,
    espessuraMm: model.side.wallThicknessMm,
    material: model.displayName,
    kind: "metal",
    tipo: "caixa_metalica",
    observacoesIndustriais: `Prof. ${geometry.runnerDepthMm} mm; Soft-Close=${config.softClose}; Push-Open=${config.pushOpen}`,
  });

  items.push({
    id: `${boxId}-eu-slides-${n}`,
    nome: `${prefix}GAV${n} Par corredicas ${model.side.runnerFamily}`,
    quantidade: 1,
    larguraMm: geometry.runnerDepthMm,
    alturaMm: 0,
    profundidadeMm: geometry.runnerDepthMm,
    espessuraMm: 0,
    material: model.side.runnerFamily,
    kind: "hardware",
    tipo: "corredica",
    observacoesIndustriais: "2 unidades (par) por gaveta",
  });

  if (config.softClose) {
    items.push({
      id: `${boxId}-eu-soft-${n}`,
      nome: `${prefix}GAV${n} Soft-Close`,
      quantidade: 1,
      larguraMm: 0,
      alturaMm: 0,
      profundidadeMm: 0,
      espessuraMm: 0,
      material: model.brand,
      kind: "optional",
      tipo: "soft_close",
      observacoesIndustriais: "Amortecedor / Blumotion / equivalente",
    });
  }

  if (config.pushOpen) {
    items.push({
      id: `${boxId}-eu-push-${n}`,
      nome: `${prefix}GAV${n} Push-Open`,
      quantidade: 1,
      larguraMm: 0,
      alturaMm: 0,
      profundidadeMm: 0,
      espessuraMm: 0,
      material: model.brand,
      kind: "optional",
      tipo: "push_open",
      observacoesIndustriais: "Tip-on / Push-to-open",
    });
  }

  return items;
}
