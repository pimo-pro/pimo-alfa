/**
 * Módulos do viewer: re-exporta do viewer-engine para compatibilidade de imports.
 * Etapa 4: RoomManager e SelectionManager migrados para viewer-engine.
 */
export { ViewerRoomManager } from "../../viewer-engine/room";
export { ViewerSelectionManager } from "../../viewer-engine/selection";
export { ViewerBoxManager } from "../../viewer-engine/box";
export { SnapshotRenderer } from "../../viewer-engine/snapshot";
export { addModelToBox, type GlbLoaderAddOptions } from "../../viewer-engine/loader";
export type { ViewerBoxEntry } from "../../viewer-engine/types";
export type { SnapshotRendererHost } from "../../viewer-engine/snapshot";
