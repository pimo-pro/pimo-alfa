/**
 * RoomEngine — orquestração Room 2.0 (fase básica).
 * Geometria visual apenas; sem impacto industrial.
 */
import type { Wall, WallOpening } from "../../../stores/wallStore";
import { wallStore } from "../../../stores/wallStore";
import type { PimoViewerApi } from "../../../context/PimoViewerContextCore";
import { applyRoomMeshFromWallStore, applyRoomOpeningsFromWallStore } from "../../../utils/roomMeshFromWallStore";
import {
  type ProjectRoomConfig,
  type ProjectRoomOpening,
  type ProjectRoomWall,
  ROOM_20_DEFAULTS,
  WALL_INDEX_TO_LABEL,
  WALL_LABEL_TO_INDEX,
  WALL_LABELS,
} from "./roomEngineTypes";

export {
  ROOM_20_DEFAULTS,
  WALL_LABELS,
  WALL_LABEL_TITLES,
  WALL_LABEL_TO_INDEX,
  WALL_INDEX_TO_LABEL,
} from "./roomEngineTypes";
export type { ProjectRoomConfig, ProjectRoomOpening, ProjectRoomWall, RoomWallLabel } from "./roomEngineTypes";

export const PROJECT_ROOM_WALL_THICKNESS_MM = ROOM_20_DEFAULTS.wallThicknessMm;

const DEFAULT_DOOR = { widthMm: 900, heightMm: 2100, floorOffsetMm: 0 };
const DEFAULT_WINDOW = { widthMm: 1200, heightMm: 1200, floorOffsetMm: 900 };

function mkWallId(label: string): string {
  return `room-wall-${label}`;
}

function mkOpeningId(type: string): string {
  return `room-opening-${type}-${Date.now()}`;
}

/** Configuração padrão: 4000×2500×2600 mm, espessura 200 mm, porta oeste, janela este. */
export function createDefaultProjectRoom(): ProjectRoomConfig {
  const { widthMm, depthMm, heightMm, wallThicknessMm } = ROOM_20_DEFAULTS;
  const walls: ProjectRoomWall[] = WALL_LABELS.map((label) => ({
    id: mkWallId(label),
    label,
    lengthMm: label === "sul" || label === "norte" ? widthMm : depthMm,
    heightMm,
  }));
  const oeste = walls.find((w) => w.label === "oeste")!;
  const este = walls.find((w) => w.label === "este")!;
  return {
    widthMm,
    depthMm,
    heightMm,
    wallThicknessMm,
    locked: false,
    visible: true,
    walls,
    openings: [
      {
        id: mkOpeningId("door"),
        type: "door",
        wallId: oeste.id,
        xPosMm: Math.max(0, (oeste.lengthMm - DEFAULT_DOOR.widthMm) / 2),
        widthMm: DEFAULT_DOOR.widthMm,
        heightMm: DEFAULT_DOOR.heightMm,
        floorOffsetMm: DEFAULT_DOOR.floorOffsetMm,
      },
      {
        id: mkOpeningId("window"),
        type: "window",
        wallId: este.id,
        xPosMm: Math.max(0, (este.lengthMm - DEFAULT_WINDOW.widthMm) / 2),
        widthMm: DEFAULT_WINDOW.widthMm,
        heightMm: DEFAULT_WINDOW.heightMm,
        floorOffsetMm: DEFAULT_WINDOW.floorOffsetMm,
      },
    ],
  };
}

export function normalizeProjectRoom(raw: Partial<ProjectRoomConfig> | null | undefined): ProjectRoomConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const base = createDefaultProjectRoom();
  const widthMm = Math.max(500, raw.widthMm ?? base.widthMm);
  const depthMm = Math.max(500, raw.depthMm ?? base.depthMm);
  const heightMm = Math.max(500, raw.heightMm ?? base.heightMm);
  const wallThicknessMm = Math.max(50, raw.wallThicknessMm ?? base.wallThicknessMm);
  const walls =
    Array.isArray(raw.walls) && raw.walls.length >= 4
      ? raw.walls.slice(0, 4).map((w, i) => {
          const label = WALL_LABELS[i] ?? WALL_LABELS[0];
          return {
            id: w.id ?? mkWallId(label),
            label: (w.label as ProjectRoomWall["label"]) ?? label,
            lengthMm: Math.max(100, w.lengthMm ?? (label === "sul" || label === "norte" ? widthMm : depthMm)),
            heightMm: Math.max(100, w.heightMm ?? heightMm),
          };
        })
      : base.walls.map((w) => ({
          ...w,
          lengthMm: w.label === "sul" || w.label === "norte" ? widthMm : depthMm,
          heightMm,
        }));
  const openings: ProjectRoomOpening[] = Array.isArray(raw.openings)
    ? raw.openings.map((o) => ({
        id: o.id ?? mkOpeningId(o.type ?? "opening"),
        type: (o.type === "window" ? "window" : "door") as "door" | "window",
        wallId: o.wallId ?? walls[3]?.id ?? walls[0].id,
        xPosMm: Math.max(0, o.xPosMm ?? 0),
        widthMm: Math.max(100, o.widthMm ?? DEFAULT_DOOR.widthMm),
        heightMm: Math.max(100, o.heightMm ?? DEFAULT_DOOR.heightMm),
        floorOffsetMm: Math.max(0, o.floorOffsetMm ?? 0),
      }))
    : base.openings;
  return {
    widthMm,
    depthMm,
    heightMm,
    wallThicknessMm,
    locked: raw.locked === true,
    visible: raw.visible !== false,
    walls,
    openings,
  };
}

export function projectRoomToWallStoreWalls(room: ProjectRoomConfig): Wall[] {
  const thicknessCm = room.wallThicknessMm / 10;
  return room.walls
    .slice()
    .sort((a, b) => WALL_LABEL_TO_INDEX[a.label] - WALL_LABEL_TO_INDEX[b.label])
    .map((wall) => {
      const openings: WallOpening[] = room.openings
        .filter((o) => o.wallId === wall.id)
        .map((o) => ({
          id: o.id,
          type: o.type,
          widthMm: o.widthMm,
          heightMm: o.heightMm,
          floorOffsetMm: o.floorOffsetMm,
          horizontalOffsetMm: o.xPosMm,
        }));
      return {
        id: wall.id,
        lengthCm: wall.lengthMm / 10,
        heightCm: wall.heightMm / 10,
        thicknessCm,
        color: "#d1d5db",
        openings,
        position: undefined,
        rotation: undefined,
      };
    })
    .filter((_, i) => i < 4);
}

export function wallStoreToProjectRoom(
  walls: Wall[],
  extras?: Partial<Pick<ProjectRoomConfig, "locked" | "visible">>
): ProjectRoomConfig | null {
  if (!walls || walls.length < 4) return null;
  const sorted = [...walls].slice(0, 4);
  const w0 = sorted[0]?.lengthCm ?? 0;
  const w2 = sorted[2]?.lengthCm ?? w0;
  const w1 = sorted[1]?.lengthCm ?? 0;
  const widthMm = ((w0 + w2) / 2) * 10;
  const depthMm = (w1 * 10);
  const heightMm = Math.max(...sorted.map((w) => (w.heightCm ?? 0) * 10), ROOM_20_DEFAULTS.heightMm);
  const wallThicknessMm = (sorted[0]?.thicknessCm ?? ROOM_20_DEFAULTS.wallThicknessMm / 10) * 10;
  const projectWalls: ProjectRoomWall[] = sorted.map((wall, index) => ({
    id: wall.id,
    label: WALL_INDEX_TO_LABEL[index] ?? "sul",
    lengthMm: (wall.lengthCm ?? 0) * 10,
    heightMm: (wall.heightCm ?? 0) * 10,
  }));
  const openings: ProjectRoomOpening[] = [];
  sorted.forEach((wall) => {
    for (const o of wall.openings ?? []) {
      openings.push({
        id: o.id,
        type: o.type,
        wallId: wall.id,
        xPosMm: o.horizontalOffsetMm,
        widthMm: o.widthMm,
        heightMm: o.heightMm,
        floorOffsetMm: o.floorOffsetMm,
      });
    }
  });
  return {
    widthMm,
    depthMm,
    heightMm,
    wallThicknessMm,
    locked: extras?.locked ?? false,
    visible: extras?.visible !== false,
    walls: projectWalls,
    openings,
  };
}

export function applyProjectRoomDimensions(room: ProjectRoomConfig): ProjectRoomConfig {
  const next = { ...room, walls: room.walls.map((w) => ({ ...w })) };
  next.walls.forEach((w) => {
    if (w.label === "sul" || w.label === "norte") w.lengthMm = next.widthMm;
    else w.lengthMm = next.depthMm;
    w.heightMm = next.heightMm;
  });
  return next;
}

export function applyProjectRoomToWallStore(room: ProjectRoomConfig): void {
  const normalized = normalizeProjectRoom(room);
  if (!normalized) return;
  const walls = projectRoomToWallStoreWalls(normalized);
  wallStore.getState().loadRoomConfig({
    walls,
    selectedWallId: walls[0]?.id ?? null,
    mainWallIndex: 0,
  });
}

export function syncProjectRoomToViewer(
  viewerApi: Pick<
    PimoViewerApi,
    | "createRoomWithDimensions"
    | "removeRoom"
    | "addDoorToRoom"
    | "addWindowToRoom"
    | "getRoomExists"
    | "setRoomLocked"
    | "hideRoom"
    | "showRoom"
  > | null | undefined,
  room: ProjectRoomConfig | null
): void {
  if (!viewerApi) return;
  if (!room) {
    viewerApi.removeRoom?.();
    return;
  }
  applyProjectRoomToWallStore(room);
  applyRoomMeshFromWallStore(viewerApi);
  applyRoomOpeningsFromWallStore(viewerApi);
  viewerApi.setRoomLocked?.(room.locked);
  if (room.visible) viewerApi.showRoom?.();
  else viewerApi.hideRoom?.();
}

export function refreshViewerRoomFromWallStore(
  viewerApi: Pick<
    PimoViewerApi,
    | "createRoomWithDimensions"
    | "removeRoom"
    | "addDoorToRoom"
    | "addWindowToRoom"
    | "getRoomExists"
  > | null | undefined
): void {
  applyRoomMeshFromWallStore(viewerApi);
  applyRoomOpeningsFromWallStore(viewerApi);
}
