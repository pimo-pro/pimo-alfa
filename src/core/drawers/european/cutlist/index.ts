/**
 * cutlist/ — Cutlist do Sistema Europeu (Modelo B).
 * Nomes/códigos industriais + materiais/espessuras oficiais.
 */

import type {
  DrawerCutlistItem,
  DrawerEuropeanModel,
  DrawerGeometry,
  EuropeanDrawerBoxConfig,
} from "../types";
import {
  EUROPEAN_BACK_THICKNESS_MM,
  EUROPEAN_BOTTOM_THICKNESS_MM,
  EUROPEAN_FRONT_INT_THICKNESS_MM,
  EUROPEAN_SIDE_THICKNESS_MM,
} from "../measures";
import {
  formatEuropeanIndustrialLabel,
  resolveEuropeanPieceNaming,
} from "../naming";

export function buildEuropeanCutlistItems(params: {
  boxId: string;
  boxName?: string;
  model: DrawerEuropeanModel;
  config: EuropeanDrawerBoxConfig;
  geometry: DrawerGeometry;
  drawerIndex: number;
  drawerCount?: number;
  /** Material da caixa (corpo / laterais / costa / fundo / frente int). */
  materialLabel?: string;
  /** Material independente da frente externa. */
  frontMaterialLabel?: string;
}): DrawerCutlistItem[] {
  const {
    boxId,
    boxName,
    model,
    config,
    geometry,
    drawerIndex,
    drawerCount = 1,
    materialLabel,
    frontMaterialLabel,
  } = params;

  const bodyMat = materialLabel ?? "MDF Branco 19";
  const frontMat = frontMaterialLabel ?? config.frontMaterialId ?? bodyMat;
  const count = Math.max(1, drawerCount);
  const n = drawerIndex + 1;
  const items: DrawerCutlistItem[] = [];

  const pushWood = (
    kind: Parameters<typeof resolveEuropeanPieceNaming>[0],
    tipo: string,
    dims: { larguraMm: number; alturaMm: number; profundidadeMm: number; espessuraMm: number },
    material: string,
    obs?: string
  ) => {
    const naming = resolveEuropeanPieceNaming(kind, drawerIndex, count);
    const industrialLabel = formatEuropeanIndustrialLabel(boxName, naming.codigo, n);
    items.push({
      id: `${boxId}-eu-${naming.codigo}-${n}`,
      nome: naming.nome,
      codigo: naming.codigo,
      quantidade: 1,
      larguraMm: dims.larguraMm,
      alturaMm: dims.alturaMm,
      profundidadeMm: dims.profundidadeMm,
      espessuraMm: dims.espessuraMm,
      material,
      kind: "wood",
      tipo,
      industrialLabel,
      observacoesIndustriais: obs,
    });
  };

  // Corpo (linha de grupo / referência)
  const body = resolveEuropeanPieceNaming("body", drawerIndex, count);
  items.push({
    id: `${boxId}-eu-${body.codigo}-body-${n}`,
    nome: body.nome,
    codigo: body.codigo,
    quantidade: 1,
    larguraMm: geometry.externalWidthMm,
    alturaMm: geometry.usefulHeightMm,
    profundidadeMm: geometry.bodyDepthMm,
    espessuraMm: 0,
    material: bodyMat,
    kind: "optional",
    tipo: "gaveta_corpo",
    industrialLabel: formatEuropeanIndustrialLabel(boxName, body.codigo, n),
    observacoesIndustriais: `Corpo sem frente; corrediça ${geometry.runnerDepthMm} mm; folga lateral 7+7`,
  });

  pushWood(
    "front",
    "gaveta_frente",
    {
      larguraMm: geometry.front.widthMm,
      alturaMm: geometry.front.heightMm,
      profundidadeMm: geometry.front.thicknessMm,
      espessuraMm: geometry.front.thicknessMm,
    },
    frontMat,
    `Material independente; espessura = madeira da caixa; exterior (sobreposta)`
  );

  if (config.dualFront && geometry.frontInt) {
    pushWood(
      "front_int",
      "gaveta_frente_int",
      {
        larguraMm: geometry.frontInt.widthMm,
        alturaMm: geometry.frontInt.heightMm,
        profundidadeMm: EUROPEAN_FRONT_INT_THICKNESS_MM,
        espessuraMm: EUROPEAN_FRONT_INT_THICKNESS_MM,
      },
      bodyMat,
      "Material da caixa; 16 mm; largura = interna ? 4 mm"
    );
  }

  pushWood(
    "lat_esq",
    "gaveta_lat_esq",
    {
      larguraMm: geometry.leftSide.depthMm,
      alturaMm: geometry.leftSide.heightMm,
      profundidadeMm: EUROPEAN_SIDE_THICKNESS_MM,
      espessuraMm: EUROPEAN_SIDE_THICKNESS_MM,
    },
    bodyMat,
    "16 mm; folga 7 mm à parede da caixa; drill via pipeline Modelo A"
  );

  pushWood(
    "lat_dir",
    "gaveta_lat_dir",
    {
      larguraMm: geometry.rightSide.depthMm,
      alturaMm: geometry.rightSide.heightMm,
      profundidadeMm: EUROPEAN_SIDE_THICKNESS_MM,
      espessuraMm: EUROPEAN_SIDE_THICKNESS_MM,
    },
    bodyMat,
    "16 mm; folga 7 mm à parede da caixa; drill via pipeline Modelo A"
  );

  pushWood(
    "costa",
    "gaveta_traseira",
    {
      larguraMm: geometry.back.widthMm,
      alturaMm: geometry.back.heightMm,
      profundidadeMm: EUROPEAN_BACK_THICKNESS_MM,
      espessuraMm: EUROPEAN_BACK_THICKNESS_MM,
    },
    bodyMat,
    "16 mm; drill via pipeline Modelo A"
  );

  pushWood(
    "fundo",
    "gaveta_fundo",
    {
      larguraMm: geometry.bottom.widthMm,
      alturaMm: EUROPEAN_BOTTOM_THICKNESS_MM,
      profundidadeMm: geometry.bottom.depthMm,
      espessuraMm: EUROPEAN_BOTTOM_THICKNESS_MM,
    },
    bodyMat,
    "10 mm; entra 10 mm nas laterais; inset frontal 10 mm se sem gav_fre_int"
  );

  items.push({
    id: `${boxId}-eu-slides-${n}`,
    nome: `Par corrediças Hettich ${geometry.runnerDepthMm} mm`,
    codigo: "corredica_hettich",
    quantidade: 1,
    larguraMm: geometry.runnerDepthMm,
    alturaMm: 0,
    profundidadeMm: geometry.runnerDepthMm,
    espessuraMm: 0,
    material: "Hettich",
    kind: "hardware",
    tipo: "corredica",
    observacoesIndustriais: `2 unidades (par); comprimento ${geometry.runnerDepthMm} mm (${model.side.runnerFamily})`,
  });

  if (config.softClose) {
    items.push({
      id: `${boxId}-eu-soft-${n}`,
      nome: "Soft-Close",
      quantidade: 1,
      larguraMm: 0,
      alturaMm: 0,
      profundidadeMm: 0,
      espessuraMm: 0,
      material: model.brand,
      kind: "optional",
      tipo: "soft_close",
      observacoesIndustriais: "Amortecedor / equivalente",
    });
  }

  if (config.pushOpen) {
    items.push({
      id: `${boxId}-eu-push-${n}`,
      nome: "Push-Open",
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
