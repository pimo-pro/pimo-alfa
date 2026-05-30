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
  type ProjectRoomWallPosition,
  type RoomOpeningKind,
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
export type { ProjectRoomConfig, ProjectRoomOpening, ProjectRoomWall, RoomOpeningKind, RoomWallLabel } from "./roomEngineTypes";

export const PROJECT_ROOM_WALL_THICKNESS_MM = ROOM_20_DEFAULTS.wallThicknessMm;

const DEFAULT_DOOR = { widthMm: 900, heightMm: 2100, thicknessMm: 40, floorOffsetMm: 0 };
const DEFAULT_WINDOW = { widthMm: 1200, heightMm: 1200, thicknessMm: 40, floorOffsetMm: 900 };

function mkWallId(label: string): string {
  return `room-wall-${label}`;
}

function mkOpeningId(type: string): string {
  return `room-opening-${type}-${Date.now()}`;
}

function wallPositionForLabel(label: ProjectRoomWall["label"], widthMm: number, depthMm: number, heightMm: number): ProjectRoomWallPosition {
  const y = heightMm / 2;
  switch (label) {
    case "sul":
      return { x: widthMm / 2, y, z: 0 };
    case "este":
      return { x: widthMm, y, z: depthMm / 2 };
    case "norte":
      return { x: widthMm / 2, y, z: depthMm };
    case "oeste":
      return { x: 0, y, z: depthMm / 2 };
    default:
      return { x: widthMm / 2, y, z: depthMm / 2 };
  }
}

function wallRotationForLabel(label: ProjectRoomWall["label"]): number {
  return label === "este" || label === "oeste" ? 90 : 0;
}

function normalizeOpeningKind(value: unknown): RoomOpeningKind {
  return value === "correr" ? "correr" : "normal";
}

function normalizeOpening(raw: Partial<ProjectRoomOpening>, walls: ProjectRoomWall[]): ProjectRoomOpening {
  const type = raw.type === "window" ? "window" : "door";
  const defaults = type === "window" ? DEFAULT_WINDOW : DEFAULT_DOOR;
  const wallId = raw.wallId && walls.some((w) => w.id === raw.wallId)
    ? raw.wallId
    : walls[3]?.id ?? walls[0]?.id ?? mkWallId("sul");
  const xPosMm = Math.max(0, raw.xPosMm ?? raw.horizontalOffsetMm ?? 0);
  const floorOffsetMm = Math.max(0, raw.floorOffsetMm ?? raw.verticalOffsetMm ?? defaults.floorOffsetMm);
  return {
    id: raw.id ?? mkOpeningId(type),
    type,
    kind: normalizeOpeningKind(raw.kind),
    wallId,
    xPosMm,
    horizontalOffsetMm: xPosMm,
    widthMm: Math.max(100, raw.widthMm ?? defaults.widthMm),
    heightMm: Math.max(100, raw.heightMm ?? defaults.heightMm),
    thicknessMm: Math.max(10, raw.thicknessMm ?? defaults.thicknessMm),
    floorOffsetMm,
    verticalOffsetMm: floorOffsetMm,
  };
}

/** Configuração padrão: 4000×4000×2600 mm, espessura 200 mm, porta oeste, janela este. */
export function createDefaultProjectRoom(): ProjectRoomConfig {
  const { widthMm, depthMm, heightMm, wallThicknessMm } = ROOM_20_DEFAULTS;
  const walls: ProjectRoomWall[] = WALL_LABELS.map((label) => ({
    id: mkWallId(label),
    label,
    widthMm: label === "sul" || label === "norte" ? widthMm : depthMm,
    lengthMm: label === "sul" || label === "norte" ? widthMm : depthMm,
    heightMm,
    thicknessMm: wallThicknessMm,
    position: wallPositionForLabel(label, widthMm, depthMm, heightMm),
    rotationDeg: wallRotationForLabel(label),
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
        kind: "normal",
        wallId: oeste.id,
        xPosMm: Math.max(0, (oeste.lengthMm - DEFAULT_DOOR.widthMm) / 2),
        horizontalOffsetMm: Math.max(0, (oeste.lengthMm - DEFAULT_DOOR.widthMm) / 2),
        widthMm: DEFAULT_DOOR.widthMm,
        heightMm: DEFAULT_DOOR.heightMm,
        thicknessMm: DEFAULT_DOOR.thicknessMm,
        floorOffsetMm: DEFAULT_DOOR.floorOffsetMm,
        verticalOffsetMm: DEFAULT_DOOR.floorOffsetMm,
      },
      {
        id: mkOpeningId("window"),
        type: "window",
        kind: "normal",
        wallId: este.id,
        xPosMm: Math.max(0, (este.lengthMm - DEFAULT_WINDOW.widthMm) / 2),
        horizontalOffsetMm: Math.max(0, (este.lengthMm - DEFAULT_WINDOW.widthMm) / 2),
        widthMm: DEFAULT_WINDOW.widthMm,
        heightMm: DEFAULT_WINDOW.heightMm,
        thicknessMm: DEFAULT_WINDOW.thicknessMm,
        floorOffsetMm: DEFAULT_WINDOW.floorOffsetMm,
        verticalOffsetMm: DEFAULT_WINDOW.floorOffsetMm,
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
  const walls: ProjectRoomWall[] =
    Array.isArray(raw.walls) && raw.walls.length >= 4
      ? raw.walls.map((w, i) => {
          const label = (w.label as ProjectRoomWall["label"]) ?? WALL_LABELS[i] ?? "extra";
          const fallbackWidth = label === "sul" || label === "norte" ? widthMm : depthMm;
          const width = Math.max(100, w.widthMm ?? w.lengthMm ?? fallbackWidth);
          const position = w.position ?? wallPositionForLabel(label, widthMm, depthMm, heightMm);
          return {
            id: w.id ?? mkWallId(label),
            label,
            widthMm: width,
            lengthMm: width,
            heightMm: Math.max(100, w.heightMm ?? heightMm),
            thicknessMm: Math.max(50, w.thicknessMm ?? wallThicknessMm),
            position: {
              x: Number.isFinite(position.x) ? position.x : 0,
              y: Number.isFinite(position.y) ? position.y : heightMm / 2,
              z: Number.isFinite(position.z) ? position.z : 0,
            },
            rotationDeg: Number.isFinite(w.rotationDeg) ? w.rotationDeg : wallRotationForLabel(label),
          };
        })
      : base.walls.map((w) => ({
          ...w,
          widthMm: w.label === "sul" || w.label === "norte" ? widthMm : depthMm,
          lengthMm: w.label === "sul" || w.label === "norte" ? widthMm : depthMm,
          heightMm,
          thicknessMm: wallThicknessMm,
          position: wallPositionForLabel(w.label, widthMm, depthMm, heightMm),
          rotationDeg: wallRotationForLabel(w.label),
        }));
  const openings: ProjectRoomOpening[] = Array.isArray(raw.openings)
    ? raw.openings.map((o) => normalizeOpening(o, walls))
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
  return room.walls
    .slice()
    .sort((a, b) => WALL_LABEL_TO_INDEX[a.label] - WALL_LABEL_TO_INDEX[b.label])
    .map((wall) => {
      const openings: WallOpening[] = room.openings
        .filter((o) => o.wallId === wall.id)
        .map((o) => ({
          id: o.id,
          type: o.type,
          kind: o.kind,
          widthMm: o.widthMm,
          heightMm: o.heightMm,
          thicknessMm: o.thicknessMm,
          floorOffsetMm: o.floorOffsetMm ?? o.verticalOffsetMm,
          horizontalOffsetMm: o.xPosMm ?? o.horizontalOffsetMm,
        }));
      return {
        id: wall.id,
        lengthCm: (wall.widthMm ?? wall.lengthMm) / 10,
        heightCm: wall.heightMm / 10,
        thicknessCm: wall.thicknessMm / 10,
        color: "#d1d5db",
        openings,
        position: {
          x: wall.position.x / 10,
          y: (wall.position.y ?? wall.heightMm / 2) / 10,
          z: wall.position.z / 10,
        },
        rotation: wall.rotationDeg,
      };
    })
}

export function wallStoreToProjectRoom(
  walls: Wall[],
  extras?: Partial<Pick<ProjectRoomConfig, "locked" | "visible">>
): ProjectRoomConfig | null {
  if (!walls || walls.length < 4) return null;
  const sorted = [...walls];
  const w0 = sorted[0]?.lengthCm ?? 0;
  const w2 = sorted[2]?.lengthCm ?? w0;
  const w1 = sorted[1]?.lengthCm ?? 0;
  const widthMm = ((w0 + w2) / 2) * 10;
  const depthMm = (w1 * 10);
  const heightMm = Math.max(...sorted.map((w) => (w.heightCm ?? 0) * 10), ROOM_20_DEFAULTS.heightMm);
  const wallThicknessMm = (sorted[0]?.thicknessCm ?? ROOM_20_DEFAULTS.wallThicknessMm / 10) * 10;
  const projectWalls: ProjectRoomWall[] = sorted.map((wall, index) => ({
    id: wall.id,
    label: WALL_INDEX_TO_LABEL[index] ?? "extra",
    widthMm: (wall.lengthCm ?? 0) * 10,
    lengthMm: (wall.lengthCm ?? 0) * 10,
    heightMm: (wall.heightCm ?? 0) * 10,
    thicknessMm: (wall.thicknessCm ?? ROOM_20_DEFAULTS.wallThicknessMm / 10) * 10,
    position: {
      x: (wall.position?.x ?? 0) * 10,
      y: (wall.position?.y ?? (wall.heightCm ?? 0) / 2) * 10,
      z: (wall.position?.z ?? 0) * 10,
    },
    rotationDeg: wall.rotation ?? 0,
  }));
  const openings: ProjectRoomOpening[] = [];
  sorted.forEach((wall) => {
    for (const o of wall.openings ?? []) {
      openings.push({
        id: o.id,
        type: o.type,
        kind: o.kind ?? "normal",
        wallId: wall.id,
        xPosMm: o.horizontalOffsetMm,
        horizontalOffsetMm: o.horizontalOffsetMm,
        widthMm: o.widthMm,
        heightMm: o.heightMm,
        thicknessMm: o.thicknessMm ?? (o.type === "window" ? DEFAULT_WINDOW.thicknessMm : DEFAULT_DOOR.thicknessMm),
        floorOffsetMm: o.floorOffsetMm,
        verticalOffsetMm: o.floorOffsetMm,
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
    if (w.label === "sul" || w.label === "norte") w.widthMm = next.widthMm;
    else if (w.label === "este" || w.label === "oeste") w.widthMm = next.depthMm;
    w.lengthMm = w.widthMm;
    w.heightMm = next.heightMm;
    if (w.label !== "extra") {
      w.position = wallPositionForLabel(w.label, next.widthMm, next.depthMm, next.heightMm);
      w.rotationDeg = wallRotationForLabel(w.label);
    }
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
