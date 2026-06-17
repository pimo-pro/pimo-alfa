/**
 * DrawerGroup
 * 
 * Representa um conjunto de gavetas em um box, com distribuição
 * automática de alturas e posicionamento vertical.
 */

import type { Drawer } from "./Drawer";
import { resolveDrawerVerticalPositions, DRAWER_VERTICAL_BASE_OFFSET_MM } from "./drawerVerticalPosition";

export interface DrawerGroup {
  id: string;
  parentBoxId: string;
  drawers: Drawer[];
  
  // Configuração de distribuição
  heightMode: "equal" | "top_small_mid_medium_bottom_large" | "custom";
  customHeights?: number[];
  
  // Dimensões do box de referência
  boxDimensions: {
    width: number;
    height: number;
    depth: number;
    thickness: number;
  };
}

/**
 * Calcula a distribuição de alturas para as gavetas
 */
export function calculateDrawerHeights(
  count: number,
  totalHeight: number,
  mode: "equal" | "top_small_mid_medium_bottom_large" | "custom",
  customHeights?: number[]
): number[] {
  if (count <= 0) return [];

  // Modo custom
  if (mode === "custom" && customHeights && customHeights.length > 0) {
    return Array.from({ length: count }, (_, index) => {
      const value = customHeights[index];
      return Number.isFinite(value) && value > 0 ? value : totalHeight / count;
    });
  }

  // Modo equal
  if (mode === "equal" || count === 1) {
    const each = totalHeight / count;
    return Array.from({ length: count }, () => each);
  }

  // Modo progressivo (2 gavetas)
  if (count === 2) {
    const top = totalHeight * 0.4;
    const bottom = totalHeight - top;
    return [top, bottom];
  }

  // Modo progressivo (3+ gavetas)
  const topWeight = 0.2;
  const bottomWeight = 0.4;
  const middleWeight = 1 - topWeight - bottomWeight;
  const middleCount = count - 2;
  const middleEach = middleWeight / middleCount;
  const weights = [topWeight, ...Array.from({ length: middleCount }, () => middleEach), bottomWeight];
  const heights = weights.map((w) => w * totalHeight);
  
  // Ajuste de arredondamento
  const sum = heights.reduce((acc, value) => acc + value, 0);
  const diff = totalHeight - sum;
  heights[heights.length - 1] += diff;
  
  return heights;
}

/**
 * Calcula as posições Y das gavetas a partir da base do box
 */
export function calculateDrawerPositions(
  heights: number[],
  boxHeight: number,
  baseOffset: number = DRAWER_VERTICAL_BASE_OFFSET_MM
): number[] {
  return resolveDrawerVerticalPositions(heights, boxHeight, baseOffset);
}

/**
 * Recalcula o layout de todas as gavetas do grupo
 */
export function recalculateDrawerGroupLayout(group: DrawerGroup): DrawerGroup {
  const heights = calculateDrawerHeights(
    group.drawers.length,
    group.boxDimensions.height, // Sem base offset - regra (altura/N - 6mm)
    group.heightMode,
    group.customHeights
  );

  const positions = calculateDrawerPositions(
    heights,
    group.boxDimensions.height,
    DRAWER_VERTICAL_BASE_OFFSET_MM
  );

  const updatedDrawers = group.drawers.map((drawer, index) => ({
    ...drawer,
    position: {
      ...drawer.position,
      y: positions[index],
    },
  }));

  return {
    ...group,
    drawers: updatedDrawers,
  };
}

/**
 * Adiciona uma gaveta ao grupo
 */
export function addDrawerToGroup(group: DrawerGroup, drawer: Drawer): DrawerGroup {
  return recalculateDrawerGroupLayout({
    ...group,
    drawers: [...group.drawers, drawer],
  });
}

/**
 * Remove uma gaveta do grupo
 */
export function removeDrawerFromGroup(group: DrawerGroup, drawerId: string): DrawerGroup {
  return recalculateDrawerGroupLayout({
    ...group,
    drawers: group.drawers.filter((d) => d.id !== drawerId),
  });
}

/**
 * Atualiza o modo de distribuição de alturas
 */
export function updateHeightMode(
  group: DrawerGroup,
  mode: "equal" | "top_small_mid_medium_bottom_large" | "custom",
  customHeights?: number[]
): DrawerGroup {
  return recalculateDrawerGroupLayout({
    ...group,
    heightMode: mode,
    customHeights,
  });
}
