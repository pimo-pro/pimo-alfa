/**
 * Conversão: DrawerLayerItem[] → CutListItem[]
 * 
 * Extrai TODAS as peças das gavetas (frente, laterais, fundo, traseira)
 * para aparecerem na lista de corte (cutlist) e no PDF técnico.
 */

import type { CutListItem } from "../core/types";
import type { DrawerLayerItem } from "../models/BoxLayers";

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
  });
  
  // LATERAL ESQUERDA (apenas se tipo "normal")
  if (item.drawerType === "normal" && item.leftSideWidth && item.leftSideWidth > 0) {
    pieces.push({
      id: `${baseId}-left`,
      nome: `Gaveta ${drawerIndex + 1} - Lateral Esquerda`,
      quantidade: 1,
      dimensoes: {
        largura: item.leftSideWidth,
        altura: item.leftSideHeight ?? 0,
        profundidade: item.leftSideDepth ?? 0,
      },
      espessura: item.leftSideWidth,
      material: materialType,
      tipo: "gaveta_lateral_esquerda",
      sourceType: "parametric",
      boxId: item.parentBoxId,
      materialId: item.materialId,
      grainDirection: "vertical",
    });
  }
  
  // LATERAL DIREITA (apenas se tipo "normal")
  if (item.drawerType === "normal" && item.rightSideWidth && item.rightSideWidth > 0) {
    pieces.push({
      id: `${baseId}-right`,
      nome: `Gaveta ${drawerIndex + 1} - Lateral Direita`,
      quantidade: 1,
      dimensoes: {
        largura: item.rightSideWidth,
        altura: item.rightSideHeight ?? 0,
        profundidade: item.rightSideDepth ?? 0,
      },
      espessura: item.rightSideWidth,
      material: materialType,
      tipo: "gaveta_lateral_direita",
      sourceType: "parametric",
      boxId: item.parentBoxId,
      materialId: item.materialId,
      grainDirection: "vertical",
    });
  }
  
  // FUNDO (apenas se tipo "normal")
  if (item.drawerType === "normal" && item.bottomThickness && item.bottomThickness > 0) {
    pieces.push({
      id: `${baseId}-bottom`,
      nome: `Gaveta ${drawerIndex + 1} - Fundo`,
      quantidade: 1,
      dimensoes: {
        largura: item.bottomWidth ?? 0,
        altura: item.bottomThickness,
        profundidade: item.bottomDepth ?? 0,
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
