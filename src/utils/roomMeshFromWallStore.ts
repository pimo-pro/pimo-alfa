/**
 * Sincroniza a sala 3D (RoomManager) com o estado persistido em wallStore após loadRoomConfig / clearRoom.
 * Aberturas (openings) ficam apenas no store até F4 recriar geometria no RoomBuilder.
 */

import type { PimoViewerApi } from "../context/PimoViewerContextCore";
import { getRoomDimensionsCm, wallStore } from "../stores/wallStore";

export function applyRoomMeshFromWallStore(
  viewerApi: Pick<PimoViewerApi, "createRoomWithDimensions" | "removeRoom"> | null | undefined
): void {
  if (!viewerApi?.createRoomWithDimensions) return;
  const { walls } = wallStore.getState();
  if (!walls || walls.length < 3) {
    viewerApi.removeRoom?.();
    return;
  }
  const dims = getRoomDimensionsCm(walls);
  if (!dims) {
    viewerApi.removeRoom?.();
    return;
  }
  const widthM = Math.max(0.5, dims.widthCm / 100);
  const depthM = Math.max(0.5, dims.depthCm / 100);
  const heightM = Math.max(0.5, dims.heightCm / 100);
  const numWalls: 3 | 4 = walls.length >= 4 ? 4 : 3;
  viewerApi.createRoomWithDimensions(widthM, depthM, heightM, numWalls);
}
