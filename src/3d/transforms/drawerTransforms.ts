/**
 * 3d/transforms/drawerTransforms.ts —Binding transforms gavetas 3D.
 */

import type { DrawerLayerItem } from "../../models/BoxLayers";
import {
  drawerEuropeanTransforms,
  type EuropeanDrawerTransformsMm,
} from "../../core/drawers/european/transforms";
import { isModeloBDrawerLayer } from "../placement/drawerPlacement3D";

export function buildDrawerTransforms(
  item: DrawerLayerItem
): EuropeanDrawerTransformsMm | null {
  if (!isModeloBDrawerLayer(item)) return null;
  return drawerEuropeanTransforms.buildFromLayer(item);
}

export const drawerTransforms = {
  build: buildDrawerTransforms,
  european: drawerEuropeanTransforms,
};

export type { EuropeanDrawerTransformsMm };
export default drawerTransforms;
