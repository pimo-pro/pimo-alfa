import type {
  DoorWindowConfig,
  RoomConfig,
  ViewerApi,
  ViewerRenderOptions,
  ViewerRenderResult,
  ViewerSnapshot,
  ViewerToolMode,
} from "../../context/projectTypes";
import type { PimoViewerApi } from "../../context/PimoViewerContextCore";

/** Mapeia ViewerToolMode para setTransformMode do Viewer (select = sem gizmo). */
function toolModeToTransformMode(mode: ViewerToolMode): "translate" | "rotate" | "scale" | null {
  if (mode === "select") return null;
  if (mode === "move") return "translate";
  if (mode === "scale") return "scale";
  return "rotate";
}

/**
 * Adaptador que converte PimoViewerApi para ViewerApi.
 * Permite que useViewerSync (ProjectContext) utilize o viewer registrado via PimoViewerContext.
 *
 * setTool liga às ferramentas reais do Viewer (setTransformMode). Snapshot/render delegam ao viewer.
 */
export function createViewerApiAdapter(
  pimoApi: PimoViewerApi | null
): ViewerApi | null {
  if (!pimoApi) return null;

  return {
    saveSnapshot: (): ViewerSnapshot | null =>
      pimoApi.saveSnapshot?.() ?? null,

    restoreSnapshot: (snapshot: ViewerSnapshot | null): void => {
      pimoApi.restoreSnapshot?.(snapshot);
    },

    renderScene: (options: ViewerRenderOptions): Promise<ViewerRenderResult | null> => {
      if (pimoApi.renderScene) {
        return pimoApi.renderScene(options);
      }
      return Promise.resolve(null);
    },

    setTool: (mode: ViewerToolMode): void => {
      pimoApi.setTransformMode(toolModeToTransformMode(mode));
    },

    setUltraPerformanceMode: (active: boolean): void => {
      pimoApi.setUltraPerformanceMode?.(active);
    },

    getUltraPerformanceMode: (): boolean => {
      return pimoApi.getUltraPerformanceMode?.() ?? false;
    },

    createRoom: (config: RoomConfig): void => {
      pimoApi.createRoom?.(config);
    },

    removeRoom: (): void => {
      pimoApi.removeRoom?.();
    },

    selectWallByIndex: (index: number | null): void => {
      pimoApi.selectWallByIndex?.(index);
    },

    selectRoomElementById: (elementId: string | null): void => {
      pimoApi.selectRoomElementById?.(elementId);
    },

    setPlacementMode: (mode: "door" | "window" | null): void => {
      pimoApi.setPlacementMode?.(mode);
    },

    addDoorToRoom: (wallId: number, config: DoorWindowConfig, elementId?: string): string => {
      return pimoApi.addDoorToRoom?.(wallId, config, elementId) ?? "";
    },

    addWindowToRoom: (wallId: number, config: DoorWindowConfig, elementId?: string): string => {
      return pimoApi.addWindowToRoom?.(wallId, config, elementId) ?? "";
    },

    setOnRoomElementPlaced: (
      cb: ((_wallId: number, _config: DoorWindowConfig, _type: "door" | "window") => void) | null
    ): void => {
      pimoApi.setOnRoomElementPlaced?.(cb);
    },

    setOnRoomElementSelected: (
      cb: ((_data: { elementId: string; wallId: number; type: "door" | "window"; config: DoorWindowConfig } | null) => void) | null
    ): void => {
      pimoApi.setOnRoomElementSelected?.(cb);
    },

    updateRoomElementConfig: (elementId: string, config: DoorWindowConfig): boolean => {
      return pimoApi.updateRoomElementConfig?.(elementId, config) ?? false;
    },
    setLockEnabled: (enabled: boolean): void => {
      pimoApi.setLockEnabled?.(enabled);
    },
    getLockEnabled: (): boolean => {
      return pimoApi.getLockEnabled?.() ?? false;
    },
    getCombinedBoundingBox: () => {
      const bbox = pimoApi.getCombinedBoundingBox?.();
      return bbox ? { width: bbox.width, height: bbox.height, depth: bbox.depth } : null;
    },
    getSelectedBoxDimensions: () => pimoApi.getSelectedBoxDimensions?.() ?? null,
    subscribeSelectedBoxChange: (callback: (_id: string | null) => void): (() => void) =>
      pimoApi.subscribeSelectedBoxChange?.(callback) ?? (() => {}),
    setDimensionsOverlayVisible: (visible: boolean): void => {
      pimoApi.setDimensionsOverlayVisible?.(visible);
    },
    getDimensionsOverlayVisible: (): boolean => {
      return pimoApi.getDimensionsOverlayVisible?.() ?? false;
    },
    toggleDimensionsOverlay: (): boolean => {
      return pimoApi.toggleDimensionsOverlay?.() ?? false;
    },
    getDimensionsOverlayData: () => pimoApi.getDimensionsOverlayData?.() ?? [],
    getPrintReadyDimensions: () =>
      pimoApi.getPrintReadyDimensions?.() ?? { entries: [], generatedAt: Date.now() },
    getSelectedObjects: (multiBoxIds?: string[]) => {
      return pimoApi.getSelectedObjects?.(multiBoxIds) ?? [];
    },
    align: (type, multiBoxIds) => {
      return pimoApi.align?.(type, multiBoxIds) ?? false;
    },
    getSelectedBoxScreenPosition: (): { x: number; y: number } | null => {
      return pimoApi.getSelectedBoxScreenPosition?.() ?? null;
    },
    getRightmostX: (): number => {
      return pimoApi.getRightmostX?.() ?? -0.1;
    },
    setHighlightEnabled: (enabled: boolean): void => {
      pimoApi.setHighlightEnabled?.(enabled);
    },
    setExplodedViewEnabled: (enabled: boolean): void => {
      pimoApi.setExplodedViewEnabled?.(enabled);
    },
    setExplodedViewIntensity: (value: number): void => {
      pimoApi.setExplodedViewIntensity?.(value);
    },
  };
}
