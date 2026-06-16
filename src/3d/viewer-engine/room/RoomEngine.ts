/**
 * RoomEngine — orquestração Room 2.0 (fase básica).
 * Geometria visual apenas; sem impacto industrial.
 */
import type { Wall, WallOpening } from "../../../stores/wallStore";
import { wallStore } from "../../../stores/wallStore";
import type { PimoViewerApi } from "../../../context/PimoViewerContextCore";
import { applyRoomMeshFromWallStore, applyRoomOpeningsFromWallStore } from "../../../utils/roomMeshFromWallStore";
import {
  centeredWallPositionForLabel,
  migrateProjectRoomToCenteredCoords,
} from "../../../utils/roomCoordinates";
import {
  type ProjectRoomConfig,
  type ProjectRoomOpening,
  type ProjectRoomUtility,
  type ProjectRoomUtilityType,
  type ProjectRoomWall,
  type RoomFloorMode,
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
const DEFAULT_UTILITY_HEIGHT_MM: Record<ProjectRoomUtilityType, number> = {
  ElectricalOutlet: 300,
  WaterPoint: 550,
  DrainPoint: 250,
};

function mkWallId(label: string): string {
  return `room-wall-${label}`;
}

function mkOpeningId(type: string): string {
  return `room-opening-${type}-${Date.now()}`;
}

function wallRotationForLabel(label: ProjectRoomWall["label"]): number {
  return label === "este" || label === "oeste" ? 90 : 0;
}

function normalizeOpeningKind(value: unknown): RoomOpeningKind {
  return value === "correr" ? "correr" : "normal";
}

function normalizeFloorMode(value: unknown): RoomFloorMode {
  return value === "full" || value === "hybrid" || value === "room"
    ? value
    : ROOM_20_DEFAULTS.floorMode;
}

function wallLengthById(walls: ProjectRoomWall[], wallId: string): number {
  const wall = walls.find((w) => w.id === wallId);
  return Math.max(100, wall?.lengthMm ?? wall?.widthMm ?? 100);
}

function normalizeOpening(raw: Partial<ProjectRoomOpening>, walls: ProjectRoomWall[]): ProjectRoomOpening {
  const type = raw.type === "window" ? "window" : "door";
  const defaults = type === "window" ? DEFAULT_WINDOW : DEFAULT_DOOR;
  const wallId = raw.wallId && walls.some((w) => w.id === raw.wallId)
    ? raw.wallId
    : walls[3]?.id ?? walls[0]?.id ?? mkWallId("sul");
  const widthMm = Math.max(100, raw.widthMm ?? defaults.widthMm);
  const heightMm = Math.max(100, raw.heightMm ?? defaults.heightMm);
  const wallLengthMm = wallLengthById(walls, wallId);
  const wallHeightMm = Math.max(100, walls.find((w) => w.id === wallId)?.heightMm ?? 100);
  const xPosMm = Math.max(0, Math.min(wallLengthMm - widthMm, raw.xPosMm ?? raw.horizontalOffsetMm ?? 0));
  const floorOffsetMm = Math.max(0, raw.floorOffsetMm ?? raw.verticalOffsetMm ?? defaults.floorOffsetMm);
  const clampedFloorOffsetMm = Math.max(0, Math.min(wallHeightMm - heightMm, floorOffsetMm));
  return {
    id: raw.id ?? mkOpeningId(type),
    type,
    kind: normalizeOpeningKind(raw.kind),
    wallId,
    xPosMm,
    horizontalOffsetMm: xPosMm,
    widthMm,
    heightMm,
    thicknessMm: Math.max(10, raw.thicknessMm ?? defaults.thicknessMm),
    floorOffsetMm: clampedFloorOffsetMm,
    verticalOffsetMm: clampedFloorOffsetMm,
  };
}

function normalizeUtility(raw: Partial<ProjectRoomUtility>, walls: ProjectRoomWall[]): ProjectRoomUtility | null {
  const type: ProjectRoomUtilityType =
    raw.type === "WaterPoint" || raw.type === "DrainPoint" || raw.type === "ElectricalOutlet"
      ? raw.type
      : "ElectricalOutlet";
  const wallId = raw.wallId && walls.some((w) => w.id === raw.wallId)
    ? raw.wallId
    : walls[0]?.id;
  if (!wallId) return null;
  const wallLengthMm = wallLengthById(walls, wallId);
  const wallHeightMm = Math.max(100, walls.find((w) => w.id === wallId)?.heightMm ?? ROOM_20_DEFAULTS.heightMm);
  return {
    id: raw.id?.trim() || `room-utility-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    wallId,
    positionAlongWall: Math.max(0, Math.min(wallLengthMm, raw.positionAlongWall ?? wallLengthMm / 2)),
    heightMm: Math.max(0, Math.min(wallHeightMm, raw.heightMm ?? DEFAULT_UTILITY_HEIGHT_MM[type])),
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
    position: centeredWallPositionForLabel(label, widthMm, depthMm, heightMm, wallThicknessMm),
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
    floorMode: ROOM_20_DEFAULTS.floorMode,
    ceilingVisible: ROOM_20_DEFAULTS.ceilingVisible,
    hiddenWalls: [],
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
    utilities: [],
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
          const position =
            w.position ?? centeredWallPositionForLabel(label, widthMm, depthMm, heightMm, wallThicknessMm);
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
          position: centeredWallPositionForLabel(w.label, widthMm, depthMm, heightMm, wallThicknessMm),
          rotationDeg: wallRotationForLabel(w.label),
        }));
  const openings: ProjectRoomOpening[] = Array.isArray(raw.openings)
    ? raw.openings.map((o) => normalizeOpening(o, walls))
    : base.openings;
  const wallIds = new Set(walls.map((w) => w.id));
  const hiddenWalls = Array.isArray(raw.hiddenWalls)
    ? raw.hiddenWalls.filter((id): id is string => typeof id === "string" && wallIds.has(id))
    : [];
  const utilities = Array.isArray(raw.utilities)
    ? raw.utilities.map((u) => normalizeUtility(u, walls)).filter((u): u is ProjectRoomUtility => Boolean(u))
    : [];
  return migrateProjectRoomToCenteredCoords({
    widthMm,
    depthMm,
    heightMm,
    wallThicknessMm,
    locked: raw.locked === true,
    visible: raw.visible !== false,
    floorMode: normalizeFloorMode(raw.floorMode),
    ceilingVisible: raw.ceilingVisible !== false,
    hiddenWalls,
    walls,
    openings,
    utilities,
  });
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
  extras?: Partial<Pick<ProjectRoomConfig, "locked" | "visible" | "floorMode" | "ceilingVisible" | "hiddenWalls" | "utilities">>
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
    floorMode: normalizeFloorMode(extras?.floorMode),
    ceilingVisible: extras?.ceilingVisible !== false,
    hiddenWalls: Array.isArray(extras?.hiddenWalls)
      ? extras.hiddenWalls.filter((id) => projectWalls.some((wall) => wall.id === id))
      : [],
    walls: projectWalls,
    openings,
    utilities: Array.isArray(extras?.utilities)
      ? extras.utilities.map((u) => normalizeUtility(u, projectWalls)).filter((u): u is ProjectRoomUtility => Boolean(u))
      : [],
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
      w.position = centeredWallPositionForLabel(
        w.label,
        next.widthMm,
        next.depthMm,
        next.heightMm,
        next.wallThicknessMm
      );
      w.rotationDeg = wallRotationForLabel(w.label);
    }
  });
  return normalizeProjectRoom(next) ?? next;
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
    | "setRoomFloorMode"
    | "setRoomHiddenWalls"
    | "setRoomUtilities"
    | "hideRoom"
    | "showRoom"
    | "setRoomCeilingVisible"
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
  viewerApi.setRoomFloorMode?.(room.floorMode);
  viewerApi.setRoomCeilingVisible?.(room.ceilingVisible);
  viewerApi.setRoomHiddenWalls?.(room.hiddenWalls);
  viewerApi.setRoomUtilities?.(room.utilities);
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
