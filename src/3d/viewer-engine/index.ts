/**
 * Viewer Engine — entrada modular do motor do Viewer.
 * Etapa 5 concluída: state, events, tools extraídos; ViewerCore como orquestrador.
 */
export { ViewerCore } from "./ViewerCore";
export type { ViewerOptions } from "./ViewerCore";
export { CameraManager } from "./camera";
export type { CameraOptions } from "./camera";
export { Controls } from "./controls";
export type { ControlsOptions } from "./controls";
export { Lights } from "./lighting";
export type { LightsOptions } from "./lighting";
export { SceneManager } from "./scene";
export type { SceneOptions } from "./scene";
export { RendererManager } from "./renderer";
export type { RendererOptions } from "./renderer";
export { HighlightManager } from "./highlight";
export { ViewerBoxManager } from "./box";
export { SnapshotRenderer } from "./snapshot";
export type { SnapshotRendererHost } from "./snapshot";
export { addModelToBox, type GlbLoaderAddOptions } from "./loader";
export type { ViewerBoxEntry } from "./types";
export { ViewerSelectionManager } from "./selection";
export { ViewerRoomManager } from "./room";
export { createGround, createGrid } from "./environment";
export type { EnvironmentOptions } from "./environment";
export { getPointerNdc } from "./utils";
export { EventsManager } from "./events";
export type { IViewerEventEngine } from "./events";
export { ViewerState } from "./state";
export type { TransformMode, PlacementMode, ViewerRenderMode } from "./state";
export { ViewerTools } from "./tools";
export type { IViewerToolsEngine } from "./tools";
