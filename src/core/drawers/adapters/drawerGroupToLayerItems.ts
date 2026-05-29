/**
 * Adaptador: DrawerGroup -> DrawerLayerItem[]
 * 
 * Converte o domínio de gavetas para o formato de layers
 * usado pelo sistema de renderização.
 */

import type { DrawerLayerItem } from "../../../models/BoxLayers";
import type { Drawer } from "../Drawer";
import type { DrawerGroup } from "../DrawerGroup";

/**
 * Converte um grupo de gavetas para o formato de layers
 */
export function drawerGroupToLayerItems(group: DrawerGroup): DrawerLayerItem[] {
  return group.drawers.map((drawer) => drawerToLayerItem(drawer));
}

/**
 * Converte uma gaveta individual para LayerItem
 */
export function drawerToLayerItem(drawer: Drawer): DrawerLayerItem {
  const {
    id,
    parentBoxId,
    type,
    sideMaterial,
    handleType,
    handlePosition,
    handleOffset,
    slideType,
    metalBoxType,
    softClose,
    specs,
    motion,
    position,
    materialId,
  } = drawer;

  return {
    id,
    parentBoxId,
    type,
    drawerType: type,
    sideMaterial,
    handleType,
    handlePosition,
    handleOffsetMm: handleOffset,
    slideType,
    metalBoxType,
    softClose,
    capacityKg: specs.slide.capacityKg,
    drawerWarnings: specs.validation.warnings,
    
    // Dimensões da frente
    width: specs.front.width,
    height: specs.front.height,
    depth: specs.body.depth + specs.front.thickness,
    frontThickness: specs.front.thickness,
    
    // Dimensões do corpo
    bodyWidth: specs.body.width,
    bodyHeight: specs.body.height,
    bodyDepth: specs.body.depth,
    
    // Laterais
    leftSideWidth: specs.leftSide.width,
    leftSideHeight: specs.leftSide.height,
    leftSideDepth: specs.leftSide.depth,
    rightSideWidth: specs.rightSide.width,
    rightSideHeight: specs.rightSide.height,
    rightSideDepth: specs.rightSide.depth,
    
    // Traseira
    backWidth: specs.back.width,
    backHeight: specs.back.height,
    backThickness: specs.back.thickness,
    
    // Fundo
    bottomWidth: specs.bottom.width,
    bottomDepth: specs.bottom.height,
    bottomThickness: specs.bottom.thickness,

    // Posicoes das pecas
    frontPosX: drawer.pieces.front.positionX,
    frontPosY: drawer.pieces.front.positionY,
    frontPosZ: drawer.pieces.front.positionZ,
    leftSidePosX: drawer.pieces.leftSide.positionX,
    leftSidePosY: drawer.pieces.leftSide.positionY,
    leftSidePosZ: drawer.pieces.leftSide.positionZ,
    rightSidePosX: drawer.pieces.rightSide.positionX,
    rightSidePosY: drawer.pieces.rightSide.positionY,
    rightSidePosZ: drawer.pieces.rightSide.positionZ,
    bottomPosX: drawer.pieces.bottom.positionX,
    bottomPosY: drawer.pieces.bottom.positionY,
    bottomPosZ: drawer.pieces.bottom.positionZ,
    backPosX: drawer.pieces.back.positionX,
    backPosY: drawer.pieces.back.positionY,
    backPosZ: drawer.pieces.back.positionZ,
    
    // Espessuras
    sideThickness: specs.leftSide.width,
    
    // Material
    materialId,
    
    // Estado
    openDirection: "pull",
    isOpen: motion.isOpen,
    pullDistanceMm: specs.positioning.pullDistance,
    
    // Posição
    posX: position.x,
    posY: position.y,
    posZ: position.z,
    rotY: 0,
  };
}

/**
 * Converte LayerItem de volta para Drawer (para updates)
 */
export function layerItemToDrawer(
  item: DrawerLayerItem
): Partial<Drawer> {
  return {
    id: item.id,
    parentBoxId: item.parentBoxId,
    type: item.type ?? item.drawerType ?? "normal",
    sideMaterial: item.sideMaterial ?? "wood",
    handleType: item.handleType ?? "Nenhum",
    handlePosition: item.handlePosition ?? "Centro",
    handleOffset: item.handleOffsetMm ?? 0,
    slideType: item.slideType ?? "Genérica",
    metalBoxType: item.metalBoxType ?? "Nenhuma",
    softClose: Boolean(item.softClose),
    motion: {
      isOpen: item.isOpen,
      openProgress: item.isOpen ? 1 : 0,
      currentOffset: item.isOpen ? (item.pullDistanceMm ?? 0) : 0,
    },
    position: {
      x: item.posX ?? 0,
      y: item.posY ?? 0,
      z: item.posZ ?? 0,
    },
    materialId: item.materialId,
  };
}

/**
 * Atualiza um DrawerGroup baseado em mudanças nas LayerItems
 */
export function updateDrawerGroupFromLayerItems(
  group: DrawerGroup,
  layerItems: DrawerLayerItem[]
): DrawerGroup {
  const updatedDrawers = group.drawers.map((drawer) => {
    const layerItem = layerItems.find((item) => item.id === drawer.id);
    if (!layerItem) return drawer;

    const updates = layerItemToDrawer(layerItem);
    return {
      ...drawer,
      ...updates,
    };
  });

  return {
    ...group,
    drawers: updatedDrawers,
  };
}
