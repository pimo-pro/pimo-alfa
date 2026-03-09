/**
 * Módulos do viewer: BoxManager, RoomManager, SelectionManager, GlbLoader, SnapshotRenderer.
 * O Viewer principal orquestra estes módulos e mantém a API externa estável.
 */

export { ViewerBoxManager } from "./BoxManager";
export { ViewerRoomManager } from "./ViewerRoomManager";
export { ViewerSelectionManager } from "./SelectionManager";
export { SnapshotRenderer } from "./SnapshotRenderer";
export { addModelToBox, type GlbLoaderAddOptions } from "./GlbLoader";
export type { ViewerBoxEntry } from "./types";
export type { SnapshotRendererHost, CameraState } from "./SnapshotRenderer";
