/**
 * 3d/placement/drawerPlacement3D.ts —Gate de placement gavetas (A vs B).
 * Modelo B: drawerEuropeanPlacement. Modelo A: pipeline antigo intacto.
 */

import type { DrawerLayerItem } from "../../models/BoxLayers";
import {
  drawerEuropeanPlacement,
  type Vec3Mm,
} from "../../core/drawers/european/placement";
import {
  drawerEuropeanTransforms,
  type EuropeanDrawerTransformsMm,
} from "../../core/drawers/european/transforms";

export function isModeloBDrawerLayer(item: DrawerLayerItem | null | undefined): boolean {
  return item?.metadata?.modeloB === true;
}

/** Transforms 3D para uma layer —europeu se modeloB. */
export function resolveDrawerPlacement3D(
  item: DrawerLayerItem
): EuropeanDrawerTransformsMm | null {
  if (!isModeloBDrawerLayer(item)) return null;
  return drawerEuropeanTransforms.buildFromLayer(item);
}

export const drawerPlacement3D = {
  isModeloB: isModeloBDrawerLayer,
  resolve: resolveDrawerPlacement3D,
  european: drawerEuropeanPlacement,
};

export type { Vec3Mm, EuropeanDrawerTransformsMm };
export default drawerPlacement3D;
