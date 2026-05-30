import type { WorkspaceBox } from "../types";
import type { ProjectRoomConfig, ProjectRoomOpening, ProjectRoomWall } from "../../3d/viewer-engine/room/roomEngineTypes";

export type KitchenFinishRoomBoundsM = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export type KitchenFinishRoomContext = {
  boundsM: KitchenFinishRoomBoundsM | null;
  walls: ProjectRoomWall[];
  openings: ProjectRoomOpening[];
  roomWidthMm: number;
  roomDepthMm: number;
};

export type WorkspaceBoxWorldMm = {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
};

export function buildKitchenFinishRoomContext(
  room: ProjectRoomConfig | null,
  boundsM: KitchenFinishRoomBoundsM | null
): KitchenFinishRoomContext {
  return {
    boundsM,
    walls: room?.walls ?? [],
    openings: room?.openings ?? [],
    roomWidthMm: room?.widthMm ?? 4000,
    roomDepthMm: room?.depthMm ?? 4000,
  };
}

export function workspaceBoxToWorldMm(box: WorkspaceBox): WorkspaceBoxWorldMm {
  const w = Math.max(1, box.dimensoes?.largura ?? 600);
  const h = Math.max(1, box.dimensoes?.altura ?? 720);
  const d = Math.max(1, box.dimensoes?.profundidade ?? 600);
  const cx = box.posicaoX_mm ?? 0;
  const cy = box.posicaoY_mm ?? 0;
  const cz = box.posicaoZ_mm ?? 0;
  return {
    id: box.id,
    minX: cx - w / 2,
    maxX: cx + w / 2,
    minY: cy - h / 2,
    maxY: cy + h / 2,
    minZ: cz - d / 2,
    maxZ: cz + d / 2,
    centerX: cx,
    centerZ: cz,
  };
}

/** Parede Room 2.0 mais próxima do centro do módulo (leitura apenas do projeto). */
export function pickNearestWall(
  boxCenterMm: { x: number; z: number },
  room: ProjectRoomConfig | null
): ProjectRoomWall | null {
  if (!room?.walls?.length) return null;
  let best: ProjectRoomWall | null = null;
  let bestDist = Infinity;
  for (const wall of room.walls) {
    const dx = wall.position.x - boxCenterMm.x;
    const dz = wall.position.z - boxCenterMm.z;
    const dist = dx * dx + dz * dz;
    if (dist < bestDist) {
      bestDist = dist;
      best = wall;
    }
  }
  return best;
}

export function wallLengthMm(wall: ProjectRoomWall): number {
  return Math.max(1, wall.widthMm || wall.lengthMm || 1);
}

/** Reduz comprimento disponível evitando vãos na parede (aproximação 2D). */
export function availableWallSpanMm(
  wall: ProjectRoomWall,
  openings: ProjectRoomOpening[],
  maxMm: number
): number {
  let span = Math.min(maxMm, wallLengthMm(wall));
  const wallOpenings = openings.filter((o) => o.wallId === wall.id);
  for (const opening of wallOpenings) {
    const reserved = opening.widthMm + opening.horizontalOffsetMm * 0.1;
    span = Math.max(100, span - reserved * 0.35);
  }
  return Math.min(maxMm, span);
}
