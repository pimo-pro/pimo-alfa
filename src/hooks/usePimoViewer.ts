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
  "setRoomCeilingVisible", "setWallEditMode", "setMousePreset", "setBackgroundMode",
  "getBackgroundMode",
  "setMaterialQuality", "setReflectionsEnabled", "setPhotoModeEnabled",
  "setExplodedViewEnabled", "setExplodedViewIntensity", "setHighlightEnabled",
  "setUltraPerformanceModeOptions", "setUltraPerformanceMode",
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
  "getSelectedBoxScreenPosition",
  "projectWorldToScreen",
  "setInternalMeasurementMode",
  "getInternalMeasurementMode",
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
  setRoomCeilingVisible: () => {},
  setWallEditMode: () => {},
  setMousePreset: () => {},
  setBackgroundMode: () => {},
  getBackgroundMode: () => "studio" as const,
  setMaterialQuality: () => {},
  setReflectionsEnabled: () => {},
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
  getBoxIdByMesh: () => null,
  projectWorldToScreen: () => null,
  setInternalMeasurementMode: () => {},
  getInternalMeasurementMode: () => false,
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
      }) as PimoViewerApi,
    [boxes, room, camera, materials, viewerCore]
  );
}
