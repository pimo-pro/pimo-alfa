import { useMemo, useRef } from "react";
import { useViewerBoxes } from "../viewer/useViewerBoxes";
import { useViewerRoom } from "../viewer/useViewerRoom";
import { useViewerCamera } from "../viewer/useViewerCamera";
import { useViewerMaterials } from "../viewer/useViewerMaterials";
import { useViewerRuler } from "../viewer/useViewerRuler";
import type { Viewer } from "../3d/core/Viewer";
import type { PimoViewerApi } from "../context/PimoViewerContextCore";

type ViewerCoreRuler = {
  getRulerEdgeAtPointer?: (_event: { clientX: number; clientY: number }) => unknown;
  getRulerMeasurements?: (_referenceBoxId: string | null) => unknown;
  setRulerEnabled?: (_enabled: boolean) => void;
  getInternalRulerPickAtPointer?: (_event: { clientX: number; clientY: number }) => unknown;
  cycleInternalRulerSelection?: (_result: unknown) => void;
  clearInternalRulerSelection?: () => void;
  getInternalRulerMeasurement?: () => unknown;
  setOnRulerTick?: (_callback: (() => void) | null) => void;
} | null | undefined;

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
  setMaterialQuality: () => {},
  setReflectionsEnabled: () => {},
  setPhotoModeEnabled: () => {},
  setExplodedViewEnabled: () => {},
  setExplodedViewIntensity: () => {},
  setHighlightEnabled: () => {},
  setUltraPerformanceModeOptions: () => {},
  setUltraPerformanceMode: () => {},
  getBoxIdByMesh: () => null,
  projectWorldToScreen: () => null,
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
  const ruler = useViewerRuler(viewerCore as ViewerCoreRuler);
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
        ...ruler,
      }) as PimoViewerApi,
    [boxes, room, camera, materials, ruler, viewerCore]
  );
}
