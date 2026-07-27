/**
 * 3d/groups/drawerGroup3D.ts — stub (Modelo B removido).
 */
import type { DrawerLayerItem } from "../../models/BoxLayers";

export type DrawerGroup3DPoseM = {
  x: number; y: number; z: number;
  frontLocal: { x: number; y: number; z: number };
  leftSideLocal: { x: number; y: number; z: number };
  rightSideLocal: { x: number; y: number; z: number };
  bottomLocal: { x: number; y: number; z: number };
  backLocal: { x: number; y: number; z: number };
};

export function resolveDrawerGroup3DPose(_item: DrawerLayerItem): DrawerGroup3DPoseM | null {
  return null;
}

export function hasIndustrialPieceLayout(_pose: DrawerGroup3DPoseM): boolean {
  return false;
}

export const drawerGroup3D = {
  resolvePose: resolveDrawerGroup3DPose,
  hasIndustrialPieceLayout,
};

export default drawerGroup3D;
