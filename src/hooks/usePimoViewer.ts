import { useMemo, useRef } from "react";
import { useViewerBoxes } from "./viewer/useViewerBoxes";
import { useViewerRoom } from "./viewer/useViewerRoom";
import { useViewerCamera } from "./viewer/useViewerCamera";
import { useViewerMaterials } from "./viewer/useViewerMaterials";
import type { Viewer } from "../3d/core/Viewer";
import type { PimoViewerApi } from "../context/PimoViewerContextCore";

/** Nomes de métodos do viewerCore que devem ser expostos na API (override dos stubs). */
const VIEWER_CORE_SETTING_METHODS = [
  "setPanelEdgesVisible", "setAllPanelsHidden", "setHiddenPanels", "setPanelHidden",
  "setPanelRenderingEnabled", "getPanelRenderingEnabled",
  "setRoomCeilingVisible", "setWallEditMode", "setMousePreset", "setBackgroundMode",
  "setRoomFloorMode", "setRoomHiddenWalls", "setRoomUtilities",
  "getBackgroundMode",
  "setMaterialQuality", "setReflectionsEnabled",
  "setGlossIntensity", "getGlossIntensity", "setMatteMode", "getMatteMode",
  "setPhotoModeEnabled",
  "setExplodedViewEnabled", "setExplodedViewIntensity", "setHighlightEnabled",
  "setUltraPerformanceModeOptions", "setUltraPerformanceMode",
  "setGlobalLightIntensity", "getGlobalLightIntensity",
  "setShadowIntensity", "getShadowIntensity",
  "setLockEnabled",
  "highlightBox",
  "setMode", "setShowcaseMode", "getCurrentMode", "getShowcaseMode",
] as const;

/**
 * Métodos utilitários do viewerCore que não vêm dos hooks especializados
 * (e eram servidos por stubs), mas são usados por overlays/medição/sync.
 */
const VIEWER_CORE_UTILITY_METHODS = [
  "getRightmostX",
  "getSelectedBoxDimensions",
  "subscribeSelectedBoxChange",
  "setDimensionsOverlayVisible",
  "getDimensionsOverlayVisible",
  "toggleDimensionsOverlay",
  "getDimensionsOverlayData",
  "getPrintReadyDimensions",
  "getSelectedObjects",
  "align",
  "getSelectedBoxScreenPosition",
  "projectWorldToScreen",
  "getSelectedBoxDepthAxisWorldSegment",
  "getBoxIdAtPointerPublic",
  "setInternalMeasurementMode",
  "getInternalMeasurementMode",
  "getInternalSelectionHit",
  "getInternalSelection",
  "setInternalSelection",
  "setInternalSelectionEnabled",
  "getInternalSelectionEnabled",
  "setOnInternalSurfaceSelected",
  "setOnInternalEdgeSelected",
  "setOnInternalPointSelected",
  "enableInternalRuler",
  "disableInternalRuler",
  "getInternalMeasurements",
  "isInternalRulerOverlayActive",
  "setManualWallHidden",
  "getManualWallHidden",
  "renderScene",
  "saveSnapshot",
  "restoreSnapshot",
  "getUltraPerformanceMode",
  "getLockEnabled",
  "getCombinedBoundingBox",
] as const;

/** Stubs para métodos opcionais de PimoViewerApi não expostos pelos hooks (settings, etc.). */
const PIMO_VIEWER_STUBS: Record<string, unknown> = {
  setPanelEdgesVisible: () => {},
  setAllPanelsHidden: () => {},
  setHiddenPanels: () => {},
  setPanelHidden: () => {},
  setPanelRenderingEnabled: () => {},
  getPanelRenderingEnabled: () => false,
  setRoomCeilingVisible: () => {},
  setRoomFloorMode: () => {},
  setRoomHiddenWalls: () => {},
  setRoomUtilities: () => {},
  setWallEditMode: () => {},
  setMousePreset: () => {},
  setBackgroundMode: () => {},
  getBackgroundMode: () => "studio" as const,
  setMaterialQuality: () => {},
  setReflectionsEnabled: () => {},
  setGlossIntensity: () => {},
  getGlossIntensity: () => 1,
  setMatteMode: () => {},
  getMatteMode: () => false,
  setPhotoModeEnabled: () => {},
  setMode: () => {},
  setShowcaseMode: () => {},
  getCurrentMode: () => "performance" as const,
  getShowcaseMode: () => false,
  setExplodedViewEnabled: () => {},
  setExplodedViewIntensity: () => {},
  setHighlightEnabled: () => {},
  setUltraPerformanceModeOptions: () => {},
  setUltraPerformanceMode: () => {},
  setGlobalLightIntensity: () => {},
  getGlobalLightIntensity: () => 1,
  setShadowIntensity: () => {},
  getShadowIntensity: () => 1,
  getBoxIdByMesh: () => null,
  projectWorldToScreen: () => null,
  getSelectedBoxDepthAxisWorldSegment: () => null,
  getBoxIdAtPointerPublic: () => null,
  setInternalMeasurementMode: () => {},
  getInternalMeasurementMode: () => false,
  getInternalSelectionHit: () => null,
  getInternalSelection: () => null,
  setInternalSelection: () => {},
  setInternalSelectionEnabled: () => {},
  getInternalSelectionEnabled: () => false,
  setOnInternalSurfaceSelected: () => {},
  setOnInternalEdgeSelected: () => {},
  setOnInternalPointSelected: () => {},
  enableInternalRuler: () => {},
  disableInternalRuler: () => {},
  getInternalMeasurements: () => null,
  isInternalRulerOverlayActive: () => false,
  getSelectedObjects: () => [],
  align: () => false,
  getDimensionsOverlayData: () => [],
  getPrintReadyDimensions: () => ({ entries: [], generatedAt: 0 }),
  internalRuler: {
    enableForBox: () => {},
    disable: () => {},
    isActive: () => false,
    getLastMeasurement: () => null,
    getActiveBoxId: () => null,
    syncFromProject: () => {},
  },
  snapping: {
    enable: () => {},
    disable: () => {},
    isEnabled: () => false,
    setGridSize: () => {},
    setCaptureRadius: () => {},
    setMagnetStrength: () => {},
    setMode: () => {},
    getMode: () => "basic" as const,
    setRoomSnappingEnabled: () => {},
    isRoomSnappingEnabled: () => false,
    setAutoAlignmentEnabled: () => {},
    isAutoAlignmentEnabled: () => true,
    setAutoSpacingEnabled: () => {},
    isAutoSpacingEnabled: () => false,
    setWallOffset: () => {},
    getWallOffset: () => 0,
    getActiveAlignmentType: () => null,
  },
  autoLayout: {
    fillWallWithModule: () => false,
    extendAlongWallFromBox: () => false,
    distributeBoxesEvenly: () => false,
    autoStackShelvesInBox: () => false,
  },
};

/**
 * Retorna uma API plana para o viewer (boxes, room, camera, materials, ruler).
 * Quando window.viewerCore está definido, os hooks expõem a API real; caso contrário NOOP.
 */
export function usePimoViewer() {
  const boxes = useViewerBoxes();
  const room = useViewerRoom();
  const camera = useViewerCamera();
  const materials = useViewerMaterials();
  const viewerCore =
    typeof window !== "undefined" ? window.viewerCore : undefined;
  const viewerRef = useRef<Viewer | null>(null);

  return useMemo(
    (): PimoViewerApi =>
      ({
        ...PIMO_VIEWER_STUBS,
        viewerRef,
        viewerReady: Boolean(viewerCore),
        ...boxes,
        ...room,
        ...camera,
        ...materials,
        ...(viewerCore
          ? [
              ...VIEWER_CORE_SETTING_METHODS,
              ...VIEWER_CORE_UTILITY_METHODS,
            ].reduce<Record<string, unknown>>((acc, name) => {
              const fn = (viewerCore as Record<string, unknown>)[name];
              if (typeof fn === "function") acc[name] = fn.bind(viewerCore);
              return acc;
            }, {})
          : {}),
        getBoxIdByMesh:
          viewerCore && typeof (viewerCore as { getBoxIdByMeshPublic?: unknown }).getBoxIdByMeshPublic === "function"
            ? (viewerCore as { getBoxIdByMeshPublic: (..._args: unknown[]) => unknown }).getBoxIdByMeshPublic.bind(viewerCore)
            : PIMO_VIEWER_STUBS.getBoxIdByMesh,
        internalRuler:
          viewerCore && (viewerCore as { internalRuler?: PimoViewerApi["internalRuler"] }).internalRuler
            ? (viewerCore as { internalRuler: NonNullable<PimoViewerApi["internalRuler"]> }).internalRuler
            : PIMO_VIEWER_STUBS.internalRuler,
        snapping:
          viewerCore && (viewerCore as { snapping?: PimoViewerApi["snapping"] }).snapping
            ? (viewerCore as { snapping: NonNullable<PimoViewerApi["snapping"]> }).snapping
            : PIMO_VIEWER_STUBS.snapping,
        autoLayout:
          viewerCore && (viewerCore as { autoLayout?: PimoViewerApi["autoLayout"] }).autoLayout
            ? (viewerCore as { autoLayout: NonNullable<PimoViewerApi["autoLayout"]> }).autoLayout
            : PIMO_VIEWER_STUBS.autoLayout,
        smartLayout: viewerCore?.smartLayout,
        intelligentDesigner: viewerCore?.intelligentDesigner,
        conversationalDesigner: viewerCore?.conversationalDesigner,
        manufacturing: viewerCore?.manufacturing,
        costEstimator: viewerCore?.costEstimator,
      }) as PimoViewerApi,
    [boxes, room, camera, materials, viewerCore]
  );
}
