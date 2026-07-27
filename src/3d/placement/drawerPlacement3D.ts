/**
 * 3d/placement/drawerPlacement3D.ts
 * Placement clássico — Modelo B removido do runtime.
 */
import type { DrawerLayerItem } from "../../models/BoxLayers";

export function isModeloBDrawerLayer(_item: DrawerLayerItem | null | undefined): boolean {
  return false;
}

export function resolveDrawerPlacement3D(_item: DrawerLayerItem): null {
  return null;
}

export function assertModeloBDrawerInsideBox(
  _item: DrawerLayerItem,
  _boxHeightMm: number
): boolean {
  return false;
}

export const drawerPlacement3D = {
  isModeloB: isModeloBDrawerLayer,
  resolve: resolveDrawerPlacement3D,
  assertInsideBox: assertModeloBDrawerInsideBox,
};

export default drawerPlacement3D;
