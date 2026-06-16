import { createContext } from "react";
import type { BoxOptions } from "../3d/objects/BoxBuilder";
import type {
  DoorWindowConfig,
  RoomConfig,
  UltraPerformanceModeOptions,
  ViewerMaterialQuality,
  ViewerMousePreset,
  ViewerBackgroundMode,
  ViewerRenderOptions,
  ViewerRenderResult,
  ViewerSnapshot,
} from "./projectTypes";
import type { Viewer } from "../3d/core/Viewer";
import type { MouseMenuTarget } from "../ui/context-menu/ContextMenuEngine";

export type PimoViewerApi = {
  viewerRef: React.MutableRefObject<Viewer | null>;
  /** True quando window.viewerCore está montado e pronto. */
  viewerReady?: boolean;
  addBox: (_id: string, _options?: BoxOptions) => boolean;
  removeBox: (_id: string) => boolean;
  updateBox: (_id: string, _options: Partial<BoxOptions>) => boolean;
  setBoxIndex: (_id: string, _index: number) => boolean;
  setBoxPosition: (_id: string, _position: { x: number; y: number; z: number }) => boolean;
  setBoxGap: (_gap: number) => void;
  addModelToBox: (_boxId: string, _modelPath: string, _modelId?: string) => boolean;
  removeModelFromBox: (_boxId: string, _modelId: string) => boolean;
  clearModelsFromBox: (_boxId: string) => void;
  listModels: (_boxId: string) => Array<{ id: string; path: string }> | null;
  getBoxDimensions: (_boxId: string) => { width: number; height: number; depth: number } | null;
  getModelPosition: (_boxId: string, _modelId: string) => { x: number; y: number; z: number } | null;
  getModelBoundingBoxSize: (_boxId: string, _modelId: string) => { width: number; height: number; depth: number } | null;
  setModelPosition: (_boxId: string, _modelId: string, _position: { x: number; y: number; z: number }) => boolean;
  setOnBoxSelected: (_callback: (_id: string | null) => void) => void;
  setOnModelLoaded: (_callback: ((_boxId: string, _modelId: string, _object: unknown) => void) | null) => void;
  setOnBoxTransform: (_callback: ((_boxId: string, _position: { x: number; y: number; z: number }, _rotation: { x: number; y: number; z: number }) => void) | null) => void;
  setOnDoorLayerDoubleClick?: (_callback: ((_boxId: string, _doorLayerId: string) => void) | null) => void;
  setOnBoxDoubleClick?: (_callback: ((_boxId: string) => void) | null) => void;
  setTransformMode: (_mode: "translate" | "rotate" | "scale" | null) => void;
  selectBox?: (_id: string | null) => void;
  highlightBox?: (_id: string | null) => void;
  /** Ativa/desativa modo Apresentação Realista (DOF, bloom, foco automático). turntable = rotação lenta opcional. */
  setShowcaseMode?: (_active: boolean, _turntable?: boolean) => void;
  getShowcaseMode?: () => boolean;
  getCurrentMode?: () => "performance" | "showcase";
  setMode?: (_mode: "performance" | "showcase", _turntable?: boolean) => void;
  renderScene?: (_options: ViewerRenderOptions) => Promise<ViewerRenderResult | null>;
  saveSnapshot?: () => ViewerSnapshot | null;
  restoreSnapshot?: (_snapshot: ViewerSnapshot | null) => void;
  setUltraPerformanceMode?: (_active: boolean) => void;
  getUltraPerformanceMode?: () => boolean;
  setUltraPerformanceModeOptions?: (_options: UltraPerformanceModeOptions) => void;
  getUltraPerformanceModeOptions?: () => UltraPerformanceModeOptions;
  setGlobalLightIntensity?: (_value: number) => void;
  getGlobalLightIntensity?: () => number;
  setShadowIntensity?: (_value: number) => void;
  getShadowIntensity?: () => number;
  createRoom?: (_config: RoomConfig) => void;
  removeRoom?: () => void;
  setRoomBounds?: (_bounds: {
    width: number;
    depth: number;
    height: number;
    originX?: number;
    originZ?: number;
  }) => void;
  clearRoomBounds?: () => void;
  /** Seleciona parede por índice (para sincronizar lista do painel com viewer). */
  selectWallByIndex?: (_index: number | null) => void;
  /** Seleciona abertura (porta/janela) por id para mover/rodar com botões do topo. */
  selectRoomElementById?: (_elementId: string | null) => void;
  selectRoomUtilityById?: (_utilityId: string | null) => void;
  setPlacementMode?: (_mode: "door" | "window" | null) => void;
  addDoorToRoom?: (_wallId: number, _config: DoorWindowConfig, _elementId?: string) => string;
  addWindowToRoom?: (_wallId: number, _config: DoorWindowConfig, _elementId?: string) => string;
  setOnRoomElementPlaced?: (
    _cb: ((_wallId: number, _config: DoorWindowConfig, _type: "door" | "window") => void) | null
  ) => void;
  setOnRoomElementSelected?: (
    _cb: ((_data: { elementId: string; wallId: number; type: "door" | "window"; config: DoorWindowConfig } | null) => void) | null
  ) => void;
  setOnRoomUtilitySelected?: (
    _cb: ((_data: { utilityId: string; wallId: number; config: import("../3d/viewer-engine/room/roomEngineTypes").ProjectRoomUtility } | null) => void) | null
  ) => void;
  setOnWallSelected?: (_cb: ((_wallId: number | null) => void) | null) => void;
  setOnWallTransform?: (_cb: ((_wallIndex: number, _position: { x: number; z: number }, _rotation: number) => void) | null) => void;
  setOnRoomElementTransform?: (_cb: ((_elementId: string, _config: DoorWindowConfig) => void) | null) => void;
  setOnRoomUtilityTransform?: (
    _cb: ((_utilityId: string, _patch: Pick<import("../3d/viewer-engine/room/roomEngineTypes").ProjectRoomUtility, "positionAlongWall" | "heightMm">) => void) | null
  ) => void;
  updateRoomElementConfig?: (_elementId: string, _config: DoorWindowConfig) => boolean;
  setRoomFloorMode?: (_mode: import("../3d/viewer-engine/room/roomEngineTypes").RoomFloorMode) => void;
  setRoomHiddenWalls?: (_wallIds: string[]) => void;
  setRoomUtilities?: (_utilities: import("../3d/viewer-engine/room/roomEngineTypes").ProjectRoomUtility[]) => void;
  setLockEnabled?: (_enabled: boolean) => void;
  getLockEnabled?: () => boolean;
  getCombinedBoundingBox?: () => { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number }; size: { x: number; y: number; z: number }; width: number; height: number; depth: number } | null;
  getSelectedBoxDimensions?: () => { width: number; height: number; depth: number } | null;
  /** Subscreve alterações da caixa selecionada (seleção ou updateBox na caixa selecionada). Retorna função para cancelar. */
  subscribeSelectedBoxChange?: (_callback: (_id: string | null) => void) => () => void;
  setDimensionsOverlayVisible?: (_visible: boolean) => void;
  getDimensionsOverlayVisible?: () => boolean;
  toggleDimensionsOverlay?: () => boolean;
  /** Posição em pixels (relativa ao container) do topo da caixa selecionada, para overlay de texto. */
  getSelectedBoxScreenPosition?: () => { x: number; y: number } | null;
  /** Projeta um ponto 3D (mundial) em pixels relativos ao container. Retorna null se atrás da câmera. */
  projectWorldToScreen?: (_worldPoint: import("three").Vector3) => { x: number; y: number } | null;
  /** FASE 6 — Eixo de profundidade (Z local) projetável para overlay. */
  getSelectedBoxDepthAxisWorldSegment?: (
    _lengthM: number
  ) => { start: import("three").Vector3; end: import("three").Vector3 } | null;
  /** FASE 6 — Id da caixa sob o ponteiro (raycast). */
  getBoxIdAtPointerPublic?: (_event: { clientX: number; clientY: number }) => string | null;
  /** Ativa/desativa modo de medição interna por bordas (ferramenta CAD). */
  setInternalMeasurementMode?: (_enabled: boolean) => void;
  getInternalMeasurementMode?: () => boolean;
  /** Fase 5 Parte A — seleção interna (faces, arestas, pontos). */
  getInternalSelectionHit?: (_event: { clientX: number; clientY: number }) => import("../3d/viewer-engine/selection/internalSelectionTypes").InternalSelectionHit | null;
  getInternalSelection?: () => import("../3d/viewer-engine/selection/internalSelectionTypes").InternalSelectionState | null;
  setInternalSelection?: (_selection: import("../3d/viewer-engine/selection/internalSelectionTypes").InternalSelectionState | null) => void;
  setInternalSelectionEnabled?: (_enabled: boolean) => void;
  getInternalSelectionEnabled?: () => boolean;
  setOnInternalSurfaceSelected?: (_callback: ((_hit: import("../3d/viewer-engine/selection/internalSelectionTypes").InternalSelectionState) => void) | null) => void;
  setOnInternalEdgeSelected?: (_callback: ((_hit: import("../3d/viewer-engine/selection/internalSelectionTypes").InternalSelectionState) => void) | null) => void;
  setOnInternalPointSelected?: (_callback: ((_hit: import("../3d/viewer-engine/selection/internalSelectionTypes").InternalSelectionState) => void) | null) => void;
  enableInternalRuler?: () => void;
  disableInternalRuler?: () => void;
  getInternalMeasurements?: (_boxId?: string) => import("../3d/viewer-engine/measurement/internalRulerOverlayTypes").InternalCavityMeasurements | null;
  isInternalRulerOverlayActive?: () => boolean;
  internalRuler?: {
    enableForBox: (_boxId: string) => void;
    disable: () => void;
    isActive: () => boolean;
    getLastMeasurement: () => { valueMm: number } | null;
    getActiveBoxId?: () => string | null;
    syncFromProject?: (_entries: import("../3d/viewer-engine/measurement/internalRulerTypes").InternalMeasurementEntry[]) => void;
  };
  snapping?: {
    enable: () => void;
    disable: () => void;
    isEnabled: () => boolean;
    setGridSize: (_mm: number) => void;
    setCaptureRadius: (_mm: number) => void;
    setMagnetStrength: (_value: number) => void;
    setMode: (_mode: "basic" | "advanced") => void;
    getMode: () => "basic" | "advanced";
    setRoomSnappingEnabled: (_enabled: boolean) => void;
    isRoomSnappingEnabled: () => boolean;
    setAutoAlignmentEnabled: (_enabled: boolean) => void;
    isAutoAlignmentEnabled: () => boolean;
    setAutoSpacingEnabled: (_enabled: boolean) => void;
    isAutoSpacingEnabled: () => boolean;
    setWallOffset: (_mm: number) => void;
    getWallOffset: () => number;
    getActiveAlignmentType: () => "flush" | "center" | "corner" | "stack" | "depth" | "height" | "spacing" | null;
  };
  autoLayout?: {
    fillWallWithModule: (_wallId: string | number, _moduleBoxId: string) => boolean;
    extendAlongWallFromBox: (_boxId: string) => boolean;
    distributeBoxesEvenly: (_boxIds: string[]) => boolean;
    autoStackShelvesInBox: (
      _boxId: string,
      _options: { count: number; topMarginMm: number; bottomMarginMm: number }
    ) => boolean;
  };
  smartLayout?: NonNullable<Window["viewerCore"]>["smartLayout"];
  intelligentDesigner?: NonNullable<Window["viewerCore"]>["intelligentDesigner"];
  conversationalDesigner?: NonNullable<Window["viewerCore"]>["conversationalDesigner"];
  manufacturing?: NonNullable<Window["viewerCore"]>["manufacturing"];
  costEstimator?: NonNullable<Window["viewerCore"]>["costEstimator"];
  /** Retorna o alvo do ponteiro para o menu de contexto inteligente. */
  getContextMenuLayerHit?: (_event: { clientX: number; clientY: number }) => MouseMenuTarget | null;
  getRightmostX?: () => number;
  /** Reposiciona a câmera numa vista pré-definida (top, bottom, front, back, right, left, isometric). */
  setCameraView?: (_preset: "top" | "bottom" | "front" | "back" | "right" | "left" | "isometric") => void;
  /** Reposiciona a câmera para o enquadramento padrão. */
  resetCamera?: () => void;
  /** Enquadra a câmara numa caixa específica. */
  frameSelection?: (_boxId: string) => boolean;
  /** Esconde/mostra manualmente uma parede (auto-hide continua ativo). */
  setManualWallHidden?: (_active: boolean) => void;
  getManualWallHidden?: () => boolean;
  /** Sala (RoomManager): criar com dimensões, remover, adicionar parede, lock. */
  createRoomWithDimensions?: (
    _width: number,
    _depth: number,
    _height: number,
    _numWalls?: 3 | 4,
    _wallThicknessM?: number
  ) => void;
  setRoomDimensions?: (_width: number, _depth: number, _height: number) => void;
  addExtraWall?: () => void;
  setRoomLocked?: (_locked: boolean) => void;
  getRoomExists?: () => boolean;
  getRoomLocked?: () => boolean;
  getRoomDimensions?: () => { width: number; depth: number; height: number } | null;
  getRoomVisible?: () => boolean;
  hideRoom?: () => void;
  showRoom?: () => void;
  setPanelEdgesVisible?: (_visible: boolean) => void;
  setPanelHidden?: (_panel: "left" | "right" | "top" | "bottom" | "back", _hidden: boolean) => void;
  setHiddenPanels?: (_keys: string[]) => void;
  getHiddenPanels?: () => string[];
  setAllPanelsHidden?: (_hidden: boolean) => void;
  setPanelRenderingEnabled?: (_enabled: boolean) => void;
  getPanelRenderingEnabled?: () => boolean;
  setRoomCeilingVisible?: (_visible: boolean) => void;
  setWallEditMode?: (_enabled: boolean) => void;
  setMousePreset?: (_preset: ViewerMousePreset) => void;
  getMousePreset?: () => ViewerMousePreset;
  setBackgroundMode?: (_mode: ViewerBackgroundMode) => void;
  getBackgroundMode?: () => ViewerBackgroundMode;
  setMaterialQuality?: (_quality: ViewerMaterialQuality) => void;
  getMaterialQuality?: () => ViewerMaterialQuality;
  updateBoxMaterial?: (_boxId: string, _materialId: string) => void;
  updateDoorMaterial?: (_boxId: string, _doorLayerId: string, _materialId: string) => void;
  updateDrawerMaterial?: (_boxId: string, _drawerLayerId: string, _materialId: string) => void;
  setMaterialMode?: (_mode: "performance" | "showcase" | "realistic") => void;
  getMaterialMode?: () => "performance" | "showcase" | "realistic";
  setReflectionsEnabled?: (_enabled: boolean) => void;
  getReflectionsEnabled?: () => boolean;
  setGlossIntensity?: (_value: number) => void;
  getGlossIntensity?: () => number;
  setMatteMode?: (_enabled: boolean) => void;
  getMatteMode?: () => boolean;
  setPhotoModeEnabled?: (_enabled: boolean) => void;
  getPhotoModeEnabled?: () => boolean;
  setExplodedViewEnabled?: (_enabled: boolean) => void;
  getExplodedViewEnabled?: () => boolean;
  setExplodedViewIntensity?: (_value: number) => void;
  /** Ativa/desativa highlight por mesh (hover + seleção em portas, gavetas, painéis, furos). */
  setHighlightEnabled?: (_enabled: boolean) => void;
  /** Obtém boxId a partir de um mesh (para régua: referência a partir do hover). */
  getBoxIdByMesh?: (_mesh: import("three").Object3D) => string | null;
  getExplodedViewIntensity?: () => number;
};

export type PimoViewerContextValue = {
  viewerApi: PimoViewerApi | null;
  registerViewerApi: (_api: PimoViewerApi | null) => void;
};

export const PimoViewerContext = createContext<PimoViewerContextValue | null>(null);
