/**
 * 3d/placement/drawerPlacement3D.ts — Gate de placement gavetas (A vs B).
 * Modelo B: drawerEuropeanPlacement (abs?local, origem = centro da frente).
 * Modelo A: pipeline antigo intacto (não passa por aqui).
 */

import type { DrawerLayerItem } from "../../models/BoxLayers";
import {
  drawerEuropeanPlacement,
  isEuropeanDrawerInsideBoxMm,
  type Vec3Mm,
} from "../../core/drawers/european/placement";
import {
  drawerEuropeanTransforms,
  type EuropeanDrawerTransformsMm,
} from "../../core/drawers/european/transforms";

export function isModeloBDrawerLayer(item: DrawerLayerItem | null | undefined): boolean {
  return item?.metadata?.modeloB === true;
}

/** Transforms 3D para uma layer — europeu se modeloB. */
export function resolveDrawerPlacement3D(
  item: DrawerLayerItem
): EuropeanDrawerTransformsMm | null {
  if (!isModeloBDrawerLayer(item)) return null;
  return drawerEuropeanTransforms.buildFromLayer(item);
}

/** Confirma que a pose B está dentro da caixa (mesmo bounding convention de A). */
export function assertModeloBDrawerInsideBox(
  item: DrawerLayerItem,
  boxHeightMm: number
): boolean {
  const t = resolveDrawerPlacement3D(item);
  if (!t) return false;
  return isEuropeanDrawerInsideBoxMm({
    groupYMm: t.group.yMm,
    frontHeightMm: item.height,
    boxHeightMm,
    bottomLocalYMm: t.bottom.yMm,
  });
}

export const drawerPlacement3D = {
  isModeloB: isModeloBDrawerLayer,
  resolve: resolveDrawerPlacement3D,
  assertInsideBox: assertModeloBDrawerInsideBox,
  european: drawerEuropeanPlacement,
};

export type { Vec3Mm, EuropeanDrawerTransformsMm };
export default drawerPlacement3D;
