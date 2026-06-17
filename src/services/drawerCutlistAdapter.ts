/**
 * Conversão: DrawerLayerItem[] → CutListItem[]
 *
 * Extrai todas as subpeças das gavetas (frente, laterais, fundo, traseira) para a cutlist.
 * Taxonomia unificada (docs/matriz-faces-A-B-FINAL.md): gaveta_frente, gaveta_lat_esq,
 * gaveta_lat_dir, gaveta_fundo, gaveta_traseira.
 */

import type { CutListItem } from "../core/types";
import type { DrawerLayerItem } from "../models/BoxLayers";

/** Convenção industrial unificada (FASE 2): uma corrediça por lado. */
export const DRAWER_SLIDES_PER_DRAWER = 2;

export const DRAWER_PIECE_TIPOS = [
  "gaveta_frente",
  "gaveta_lat_esq",
  "gaveta_lat_dir",
  "gaveta_fundo",
  "gaveta_traseira",
] as const;

export type DrawerPieceTipo = (typeof DRAWER_PIECE_TIPOS)[number];

export function isDrawerPieceTipo(tipo: string): tipo is DrawerPieceTipo {
  return (DRAWER_PIECE_TIPOS as readonly string[]).includes(tipo);
}

export function boxUsesModernDrawerPipeline(box: { drawersLayer?: DrawerLayerItem[] | null }): boolean {
  return (box.drawersLayer?.length ?? 0) > 0;
}

export type DrawerHardwareSummary = {
  drawerId: string;
  drawerIndex: number;
  boxId: string;
  slideType: string;
  slideQuantity: number;
  slideLengthMm?: number;
  softClose: boolean;
  metalBoxType?: string;
  handleType?: string;
};

/**
 * Ferragens por gaveta a partir de drawersLayer (BOM unificado com cutlist).
 */
export function extractDrawerHardwareSummaryFromLayerItems(
  layerItems: DrawerLayerItem[]
): DrawerHardwareSummary[] {
  return layerItems.map((item, index) => ({
    drawerId: item.id,
    drawerIndex: index + 1,
    boxId: item.parentBoxId,
    slideType: item.slideType ?? "Genérica",
    slideQuantity: DRAWER_SLIDES_PER_DRAWER,
    slideLengthMm: item.bodyDepth ?? item.depth,
    softClose: Boolean(item.softClose),
    metalBoxType: item.metalBoxType,
    handleType: item.handleType,
  }));
}

export type DrawerIndustrialBom = {
  pieces: CutListItem[];
  hardware: DrawerHardwareSummary[];
};

/**
 * BOM industrial unificado: peças (cutlist) + ferragens por gaveta.
 */
export function extractDrawerIndustrialBomFromLayerItems(
  layerItems: DrawerLayerItem[],
  materialType: string = "MDF"
): DrawerIndustrialBom {
  return {
    pieces: extractDrawerCutlistFromLayerItems(layerItems, materialType),
    hardware: extractDrawerHardwareSummaryFromLayerItems(layerItems),
  };
}

/**
 * Converte uma DrawerLayerItem em múltiplas CutListItems
 * (uma para cada peça: frente, lateral esq, lateral dir, fundo, traseira)
 */
export function drawerLayerItemToCutList(
  item: DrawerLayerItem,
  drawerIndex: number,
  materialType: string = "MDF"
): CutListItem[] {
  const pieces: CutListItem[] = [];
  
  const baseId = `${item.parentBoxId}-drawer-${drawerIndex}`;
  const hasMetalBox = item.metalBoxType != null && item.metalBoxType !== "Nenhuma";
  const drawerHardware = [
    {
      tipo: "corredica",
      nome: item.slideType ?? "Genérica",
      quantidade: DRAWER_SLIDES_PER_DRAWER,
      softClose: Boolean(item.softClose),
      capacidadeCargaKg: item.capacityKg ?? 40,
    },
    ...(hasMetalBox
      ? [{
          tipo: "caixa_metalica",
          nome: item.metalBoxType,
          quantidade: 1,
        }]
      : []),
    ...(item.handleType && item.handleType !== "Nenhum"
      ? [{
          tipo: "handle",
          nome: item.handleType,
          posicao: item.handlePosition ?? "Centro",
          offsetMm: item.handleOffsetMm ?? 0,
          quantidade: 1,
        }]
      : []),
  ];
  
  // FRENTE
  pieces.push({
    id: `${baseId}-front`,
    nome: `Gaveta ${drawerIndex + 1} - Frente`,
    quantidade: 1,
    dimensoes: {
      largura: item.width,
      altura: item.height,
      profundidade: item.frontThickness,
    },
    espessura: item.frontThickness,
    material: materialType,
    tipo: "gaveta_frente",
    sourceType: "parametric",
    boxId: item.parentBoxId,
    materialId: item.materialId,
    grainDirection: "horizontal",
    metadata: {
      drawerHardware,
      drawerRules: {
        slideType: item.slideType ?? "Genérica",
        softClose: Boolean(item.softClose),
        metalBoxType: item.metalBoxType ?? "Nenhuma",
        handleType: item.handleType ?? "Nenhum",
        handlePosition: item.handlePosition ?? "Centro",
        handleOffsetMm: item.handleOffsetMm ?? 0,
      },
    },
  });

  if (hasMetalBox) return pieces;
  
  // LATERAL ESQUERDA
  if (item.leftSideWidth && item.leftSideWidth > 0) {
    pieces.push({
      id: `${baseId}-left`,
      nome: `Gaveta ${drawerIndex + 1} - Lateral Esquerda`,
      quantidade: 1,
      dimensoes: {
        largura: item.leftSideDepth ?? 0,
        altura: item.leftSideHeight ?? 0,
        profundidade: item.leftSideWidth,
      },
      espessura: item.leftSideWidth,
      material: materialType,
      tipo: "gaveta_lat_esq",
      sourceType: "parametric",
      boxId: item.parentBoxId,
      materialId: item.materialId,
      grainDirection: "vertical",
    });
  }
  
  // LATERAL DIREITA
  if (item.rightSideWidth && item.rightSideWidth > 0) {
    pieces.push({
      id: `${baseId}-right`,
      nome: `Gaveta ${drawerIndex + 1} - Lateral Direita`,
      quantidade: 1,
      dimensoes: {
        largura: item.rightSideDepth ?? 0,
        altura: item.rightSideHeight ?? 0,
        profundidade: item.rightSideWidth,
      },
      espessura: item.rightSideWidth,
      material: materialType,
      tipo: "gaveta_lat_dir",
      sourceType: "parametric",
      boxId: item.parentBoxId,
      materialId: item.materialId,
      grainDirection: "vertical",
    });
  }
  
  // FUNDO
  if (item.bottomThickness && item.bottomThickness > 0) {
    pieces.push({
      id: `${baseId}-bottom`,
      nome: `Gaveta ${drawerIndex + 1} - Fundo`,
      quantidade: 1,
      dimensoes: {
        largura: item.bottomWidth ?? 0,
        altura: item.bottomDepth ?? 0,
        profundidade: item.bottomThickness,
      },
      espessura: item.bottomThickness,
      material: materialType,
      tipo: "gaveta_fundo",
      sourceType: "parametric",
      boxId: item.parentBoxId,
      materialId: item.materialId,
      grainDirection: "none",
    });
  }
  
  // TRASEIRA
  if (item.backThickness && item.backThickness > 0) {
    pieces.push({
      id: `${baseId}-back`,
      nome: `Gaveta ${drawerIndex + 1} - Traseira`,
      quantidade: 1,
      dimensoes: {
        largura: item.backWidth ?? 0,
        altura: item.backHeight ?? 0,
        profundidade: item.backThickness ?? 0,
      },
      espessura: item.backThickness ?? 0,
      material: materialType,
      tipo: "gaveta_traseira",
      sourceType: "parametric",
      boxId: item.parentBoxId,
      materialId: item.materialId,
      grainDirection: "horizontal",
    });
  }
  
  return pieces;
}

/**
 * Converte todas as DrawerLayerItems de um box em CutListItems
 */
export function extractDrawerCutlistFromLayerItems(
  layerItems: DrawerLayerItem[],
  materialType: string = "MDF"
): CutListItem[] {
  const allPieces: CutListItem[] = [];
  
  for (let i = 0; i < layerItems.length; i++) {
    const item = layerItems[i];
    const pieces = drawerLayerItemToCutList(item, i, materialType);
    allPieces.push(...pieces);
  }
  
  return allPieces;
}
