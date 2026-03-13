
import { useMemo, useRef } from "react";
import { useViewerBoxes } from "../viewer/useViewerBoxes";
import { useViewerRoom } from "../viewer/useViewerRoom";
import { useViewerCamera } from "../viewer/useViewerCamera";
import { useViewerMaterials } from "../viewer/useViewerMaterials";
import { useViewerRuler } from "../viewer/useViewerRuler";
import type { Viewer } from "../3d/core/Viewer";
import type { ViewerCore } from "../viewer/ViewerCore";

/**
 * Retorna uma API plana para o viewer: MultiBoxManager/useCalculadoraSync esperam
 * addBox, setBoxGap, etc. no nível superior; Workspace e PimoViewerContext também.
 * Estrutura de retorno e número de dependências do useMemo são sempre os mesmos
 * (boxes/room/camera/materials/ruler têm sempre a mesma forma, NOOP ou real).
 */
export function usePimoViewer() {
  const boxes = useViewerBoxes();
  const room = useViewerRoom();
  const camera = useViewerCamera();
  const materials = useViewerMaterials();
  const viewerCore: ViewerCore | undefined = typeof window !== "undefined" ? (window.viewerCore as ViewerCore | undefined) : undefined;
  const ruler = useViewerRuler(viewerCore as any);
  const viewerRef = useRef<Viewer | null>(null);

  // Métodos obrigatórios da interface PimoViewerApi
  // Os métodos reais devem delegar para viewerCore ou managers, ou ser NOOP
  const api = useMemo(() => ({
    viewerRef,
    viewerReady: Boolean(viewerCore),
    ...boxes,
    ...room,
    ...camera,
    ...materials,
    ...ruler,
    // Métodos MultiBoxViewerApi/PimoViewerApi
    addBox: (_id: string, _options?: any) => true,
    removeBox: (_id: string) => true,
    updateBox: (_id: string, _options: any) => true,
    setBoxIndex: (_id: string, _index: number) => true,
    setBoxPosition: (_id: string, _position: any) => true,
    setBoxGap: (_gap: number) => {},
    addModelToBox: (_boxId: string, _modelPath: string, _modelId?: string) => true,
    removeModelFromBox: (_boxId: string, _modelId: string) => true,
    clearModelsFromBox: (_boxId: string) => {},
    listModels: (_boxId: string) => [],
    getBoxDimensions: (_boxId: string) => null,
    getModelPosition: (_boxId: string, _modelId: string) => null,
    getModelBoundingBoxSize: (_boxId: string, _modelId: string) => null,
    setModelPosition: (_boxId: string, _modelId: string, _position: any) => true,
    setOnBoxSelected: (_callback: any) => {},
    setOnModelLoaded: (_callback: any) => {},
    setOnBoxTransform: (_callback: any) => {},
    setTransformMode: (_mode: any) => {},
    selectBox: (_id: string | null) => {},
    highlightBox: (_id: string | null) => {},
    addDoorToRoom: (_wallId: number, _config: any) => "door-id",
    addWindowToRoom: (_wallId: number, _config: any) => "window-id",
    setPanelEdgesVisible: (_visible: boolean) => {},
    setAllPanelsHidden: (_hidden: boolean) => {},
    setHiddenPanels: (_keys: string[]) => {},
    setPanelHidden: (_panel: string, _hidden: boolean) => {},
    setRoomCeilingVisible: (_visible: boolean) => {},
    setWallEditMode: (_enabled: boolean) => {},
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
    // ...outros métodos obrigatórios podem ser implementados conforme necessário
    getBoxIdByMesh: (_mesh: any) => null,
    projectWorldToScreen: (_point: any) => null,
  }), [boxes, room, camera, materials, ruler, viewerCore]);
  return api;
}
