/**
 * Sincroniza a sala 3D (RoomManager) com o estado persistido em wallStore após loadRoomConfig / clearRoom
 * e recria portas/janelas no RoomBuilder a partir das openings do snapshot.
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

/** Chamado após applyRoomMeshFromWallStore quando existe sala; preserva ids das openings para UI/sync. */
export function applyRoomOpeningsFromWallStore(
  viewerApi: Pick<PimoViewerApi, "addDoorToRoom" | "addWindowToRoom" | "getRoomExists"> | null | undefined
): void {
  if (!viewerApi?.addDoorToRoom || !viewerApi.addWindowToRoom) return;
  if (!viewerApi.getRoomExists?.()) return;
  const { walls } = wallStore.getState();
  walls.forEach((wall, wallIndex) => {
    for (const o of wall.openings ?? []) {
      const config = {
        widthMm: o.widthMm,
        heightMm: o.heightMm,
        floorOffsetMm: o.floorOffsetMm,
        horizontalOffsetMm: o.horizontalOffsetMm,
      };
      if (o.type === "door") {
        viewerApi.addDoorToRoom!(wallIndex, config, o.id);
      } else {
        viewerApi.addWindowToRoom!(wallIndex, config, o.id);
      }
    }
  });
}
