import { DRAWER_VERTICAL_GAP_MM } from "./drawerGeometryConstants";
import { getDrawerUsableInternalHeightMm } from "./drawerVerticalPosition";

export type DrawerVerticalSlot = {
  index: number;
  heightMm: number;
  centerYMm: number;
  bottomMm: number;
  topMm: number;
};

/** Altura útil após folga de base industrial. */
export function getDrawerStackUsableHeightMm(boxInternalHeightMm: number): number {
  return getDrawerUsableInternalHeightMm(boxInternalHeightMm);
}

/** Soma das alturas de frente + folgas verticais = altura útil. */
export function sumDrawerFrontHeightsAndGaps(heightsMm: number[]): number {
  if (heightsMm.length === 0) return 0;
  const gaps = Math.max(0, heightsMm.length - 1) * DRAWER_VERTICAL_GAP_MM;
  return heightsMm.reduce((acc, h) => acc + h, 0) + gaps;
}

/** Faixas verticais (centro Y local do módulo) para validar colisões. */
export function buildDrawerVerticalSlots(
  heightsMm: number[],
  boxInternalHeightMm: number,
  baseOffsetMm: number,
  resolveCenterY: (index: number, heights: number[], boxH: number, base: number) => number
): DrawerVerticalSlot[] {
  return heightsMm.map((heightMm, index) => {
    const centerYMm = resolveCenterY(index, heightsMm, boxInternalHeightMm, baseOffsetMm);
    return {
      index,
      heightMm,
      centerYMm,
      bottomMm: centerYMm - heightMm / 2,
      topMm: centerYMm + heightMm / 2,
    };
  });
}

export function drawerVerticalSlotsOverlap(slots: DrawerVerticalSlot[]): boolean {
  for (let i = 0; i < slots.length - 1; i++) {
    const a = slots[i]!;
    const b = slots[i + 1]!;
    const gap = b.bottomMm - a.topMm;
    if (gap < DRAWER_VERTICAL_GAP_MM - 0.01) return true;
  }
  return false;
}
