/**
 * 3d/groups/drawerGroup3D.ts — Helpers de grupo 3D para gavetas Modelo B.
 * Não remove o pipeline antigo — só calcula origem/offsets europeus
 * no padrão do Modelo A (grupo = centro da frente; peças locais).
 */

import type { DrawerLayerItem } from "../../models/BoxLayers";
import { buildDrawerTransforms } from "../transforms/drawerTransforms";

export type DrawerGroup3DPoseM = {
  x: number;
  y: number;
  z: number;
  frontLocal: { x: number; y: number; z: number };
  leftSideLocal: { x: number; y: number; z: number };
  rightSideLocal: { x: number; y: number; z: number };
  bottomLocal: { x: number; y: number; z: number };
  backLocal: { x: number; y: number; z: number };
};

function mmToM(v: number): number {
  return v / 1000;
}

/** Pose do grupo + peças locais (metros) para Modelo B; null se Modelo A. */
export function resolveDrawerGroup3DPose(item: DrawerLayerItem): DrawerGroup3DPoseM | null {
  const t = buildDrawerTransforms(item);
  if (!t) return null;
  return {
    x: mmToM(t.group.xMm),
    y: mmToM(t.group.yMm),
    z: mmToM(t.group.zMm),
    frontLocal: {
      x: mmToM(t.front.xMm),
      y: mmToM(t.front.yMm),
      z: mmToM(t.front.zMm),
    },
    leftSideLocal: {
      x: mmToM(t.leftSide.xMm),
      y: mmToM(t.leftSide.yMm),
      z: mmToM(t.leftSide.zMm),
    },
    rightSideLocal: {
      x: mmToM(t.rightSide.xMm),
      y: mmToM(t.rightSide.yMm),
      z: mmToM(t.rightSide.zMm),
    },
    bottomLocal: {
      x: mmToM(t.bottom.xMm),
      y: mmToM(t.bottom.yMm),
      z: mmToM(t.bottom.zMm),
    },
    backLocal: {
      x: mmToM(t.back.xMm),
      y: mmToM(t.back.yMm),
      z: mmToM(t.back.zMm),
    },
  };
}

/** Heurística: peça B com layout industrial correcto relativamente à frente. */
export function hasIndustrialPieceLayout(pose: DrawerGroup3DPoseM): boolean {
  return (
    Math.abs(pose.frontLocal.x) < 1e-6 &&
    Math.abs(pose.frontLocal.y) < 1e-6 &&
    Math.abs(pose.frontLocal.z) < 1e-6 &&
    pose.leftSideLocal.x < 0 &&
    pose.rightSideLocal.x > 0 &&
    pose.bottomLocal.y < 0 &&
    pose.backLocal.z < 0
  );
}

export const drawerGroup3D = {
  resolvePose: resolveDrawerGroup3DPose,
  hasIndustrialPieceLayout,
};

export default drawerGroup3D;
