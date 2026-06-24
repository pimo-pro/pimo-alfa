import type { PrintReadyDimensions } from "../overlays/boxDimensionsLayout";

export type ViewerMaterialSyncSurface = {
  syncRemateVisuals?: () => void;
  syncRodapeVisuals?: () => void;
  syncOrlaVisuals?: () => void;
};

export type ViewerMcDimensionsSurface = {
  getPrintReadyDimensions: () => PrintReadyDimensions;
  setDimensionsOverlayVisible: (_visible: boolean) => void;
  getDimensionsOverlayVisible: () => boolean;
  renderScene?: (_options: { quality?: string }) => Promise<unknown>;
};

export type ViewerIndustrialSurface = ViewerMaterialSyncSurface & Partial<ViewerMcDimensionsSurface>;

export const VIEWER_INDUSTRIAL_SURFACE_METHODS = [
  "syncRemateVisuals",
  "syncRodapeVisuals",
  "syncOrlaVisuals",
  "getPrintReadyDimensions",
  "setDimensionsOverlayVisible",
  "getDimensionsOverlayVisible",
  "renderScene",
] as const;
