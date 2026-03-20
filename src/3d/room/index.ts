export { Room, DEFAULT_ROOM_WIDTH, DEFAULT_ROOM_DEPTH, DEFAULT_ROOM_HEIGHT } from "./Room";
export { RoomManager, type RoomBounds, type WallEntryForViewer, type IRoomManagerViewer } from "./RoomManager";
export {
  createMainWalls,
  createExtraWall,
  positionMainWalls,
  applyWallMaterial,
  WALL_THICKNESS_M,
  type WallMaterialOptions,
} from "./WallFactory";
export { RoomBuilder } from "./RoomBuilder";
export * from "./types";
