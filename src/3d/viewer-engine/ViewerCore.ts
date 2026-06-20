import * as THREE from "three";
import { Vector2 } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

import { SceneManager } from "./scene";
import type { SceneOptions } from "./scene";
import { CameraManager } from "./camera";
import type { CameraOptions } from "./camera";
import { RendererManager } from "./renderer";
import type { RendererOptions } from "./renderer";
import { Lights } from "./lighting";
import type { LightsOptions } from "./lighting";
import { Controls } from "./controls";
import type { ControlsOptions } from "./controls";
import {
  applyMouseInputMappingToOrbitControls,
  getMouseInputMapping,
  getPointerActionForButton,
  normalizeMouseInputPreset,
  shouldBlockPointerDownForSelection,
  type MouseInputPreset,
} from "./controls/MouseInputMapper";
import { isObjectInScreenRect } from "./utils/screenSelection";
import { ViewerBoxManager } from "./box";
import { SnapshotRenderer } from "./snapshot";
import { HighlightManager } from "./highlight";
import { EdgeOutlineSystem, type EdgeOutlineBoxEntry } from "../outline";
import { ViewerRaycastSystem } from "./raycast/ViewerRaycastSystem";
import type { EnvironmentOptions } from "./environment";
import { ViewerState } from "./state";
import { EventsManager } from "./events";
import type { IViewerEventEngine } from "./events/EventEngineTypes";
import { ViewerTools } from "./tools";
import { GroupGizmo } from "./tools/GroupGizmo";
import type { IViewerToolsEngine } from "./tools/ToolsEngineTypes";

import type { LoadedWoodMaterial } from "../materials/WoodMaterial";
import { defaultMaterialSet, mergeMaterialSet } from "../materials/MaterialLibrary";
import type { MaterialSet } from "../materials/MaterialLibrary";
import {
  loadMaterial as materialEngineLoadMaterial,
  getMaterialMode,
  setMaterialMode as materialEngineSetMaterialMode,
  setLacqueredClearcoatPipeline as materialEngineSetLacqueredClearcoatPipeline,
  getSceneMaterialConfig,
  getSharedPanelEdgeMaterial,
  disposeSharedPanelEdgeMaterial,
} from "./materials";
import {
  createRoomFloorOutline,
  createRoomFloorOverlayMaterial,
  getRoomFloorExpandM,
  getRoomFloorOverlayAppearance,
} from "./materials/roomFloorOverlay";
import type { MaterialMode } from "./materials";
import type { BoxOptions } from "../objects/BoxBuilder";
import type { ViewerBoxEntry } from "./types";
import type { BoxPanelIds, TechnicalDrillHole, ViewerDrillMarkersByPanel } from "../../core/types";
import { buildBoxLegacy, createDoorObject, getDoorSpecFromGroup, updateBoxGroup } from "../objects/BoxBuilder";
import { filterTechnicalDrillHolesForViewerMesh, filterViewerDrillMarkersForMesh } from "./drill/viewerCncDrillFilter";
import {
  expandBox3ByObjectExcludingLayoutProxy,
  isViewerLayoutProxyObject,
  runWithAllLayoutBoundsProxiesVisible,
  runWithLayoutBoundsProxiesVisible,
  setBox3FromObjectExcludingLayoutProxy,
  VIEWER_LAYOUT_PROXY_LAYER,
} from "./box/boxAabbUtils";
import { applyFinishMovementConstraints } from "./constraints/finishCollision";

/**
 * Propaga userData.boxId e layer 0 para todos os filhos do grupo da caixa.
 * O proxy de layout (`viewerLayoutBounds`) fica na layer dedicada (raycaster/picking = layer 0).
 */
function tagBoxGroupWithId(group: THREE.Object3D, boxId: string) {
  group.traverse((child) => {
    if (isViewerLayoutProxyObject(child)) return;
    child.userData = child.userData || {};
    child.userData.boxId = boxId;
    if (child.layers && typeof child.layers.set === "function") {
      child.layers.set(0);
    }
  });
}
import { RoomBuilder } from "../room/RoomBuilder";
import type { RoomConfig, DoorWindowConfig } from "../room/types";
import {
  RoomManager,
  type IRoomManagerViewer,
  type RoomBounds,
  type WallEntryForViewer,
} from "../room/RoomManager";
import type {
  UltraPerformanceModeOptions,
  ViewerBackgroundMode,
  ViewerMaterialQuality,
  ViewerMousePreset,
  ViewerRenderOptions,
  ViewerRenderResult,
} from "../../context/projectTypes";
import { loadGLB } from "../../core/glb/glbLoader";
import {
  applyVisualMaterialToMesh as applyVisualMaterialToMeshV2,
  type VisualMaterial,
} from "../../core/materials/materialLibraryV2";
import { snapHorizontalOffset } from "../../utils/openingConstraints";
import type { ProjectRoomUtility, RoomFloorMode } from "./room/roomEngineTypes";
import { devLogger } from "../../utils/devLogger";
import { WallGizmo } from "../gizmos/WallGizmo";
import { updateWallCulling } from "../visibility/WallRaycastCulling";
import type { SnapDebugData } from "../snapping/ModelWallSnap";
import { SnapDebugOverlay } from "../../debug/SnapDebugOverlay";
import { ViewerRenderExporter } from "./export/ViewerRenderExporter";
import { TransformConstraints } from "./constraints/TransformConstraints";
import { ViewerMeasurementOverlay, type RulerMeasurementHit } from "./measurement/ViewerMeasurementOverlay";
import { InternalRuler, type InternalRulerMeasurement } from "./measurement/InternalRuler";
import { InternalRulerOverlay } from "./measurement/InternalRulerOverlay";
import type { InternalCavityMeasurements } from "./measurement/internalRulerOverlayTypes";
import type { InternalMeasurementEntry } from "./measurement/internalRulerTypes";
import {
  computeBoxCavityBoundsLocal,
  computeInternalCavityMeasurements,
} from "./selection/boxCavityBounds";
import {
  InternalSelectionOutline,
  type InternalSelectionHit,
  type InternalSelectionState,
  cloneInternalSelectionState,
} from "./selection";
import { MultiSelectionOutline, type MultiOutlineTarget } from "./selection/MultiSelectionOutline";
import { MeasurementAnchorsVisualizer } from "./measurement/MeasurementAnchorsVisualizer";
import { historyManager } from "../../core/viewer/historyManager";
import type { MeasurementAnchorEntry } from "../../core/viewer/measurementAnchors";
import { decodeSelectionId, remateSelectionId, rodapeSelectionId } from "../../core/viewer/selectionIds";
import { encodeSelectionIdFromLayerHit } from "../../core/viewer/selectionHitEncoding";
import { SmartSnapping } from "./snapping/SmartSnapping";
import { RemateSmartSnapping } from "./snapping/RemateSmartSnapping";
import { SmartAlignSnapOverlay } from "./snapping/smartAlignSnapOverlay";
import type { SmartAlignSnapContext } from "./snapping/smartAlignSnapTypes";
import { AutoLayoutEngine } from "./autoLayout/AutoLayoutEngine";
import type { AutoLayoutBridge, AutoLayoutOpeningMm, AutoLayoutRoomBoundsMm, AutoStackShelvesOptions } from "./autoLayout/autoLayoutTypes";
import { AutoWallFillEngine } from "./snapping/autoWallFillEngine";
import { AutoRoomFillEngine } from "./snapping/autoRoomFillEngine";
import { AutoDistributionEngine } from "./snapping/autoDistributionEngine";
import { AutoStackShelvesEngine } from "./snapping/autoStackShelvesEngine";
import { PredictiveLayoutEngine, buildPredictiveLayoutResult } from "./snapping/predictiveLayoutEngine";
import { IntelligentDesignerEngine } from "./snapping/intelligentDesignerEngine";
import { ConversationalDesignerEngine } from "./snapping/conversationalDesignerEngine";
import { DesignConversationState } from "./snapping/designConversationState";
import type { ConversationTurnResult } from "./snapping/conversationalDesignerEngine";
import type { ConversationEntry } from "./snapping/designConversationState";
import type { DesignVariantId, EnvironmentStyleId } from "./snapping/intelligentDesignerTypes";
import { isEnvironmentStyleId, listStyleProfiles } from "./snapping/styleProfileEngine";
import { ManufacturingReportEngine } from "./snapping/manufacturingReportEngine";
import type { ManufacturingFullReport, ManufacturingUiReport } from "./snapping/manufacturingTypes";
import { CostReportEngine } from "./snapping/costReportEngine";
import type { CostChangeInput, CostFullReport, CostUiSummary, CostSuggestion } from "./snapping/costTypes";
import { getRoomRules, getSnapRules } from "./snapping/rulesRuntime";
import { rulesStore } from "../../admin/rules/rulesStore";
import type { SmartLayoutBridge } from "./snapping/smartLayoutTypes";
import { OrlaVisualizer, type OrlaVisualBridge } from "./orla/OrlaVisualizer";
import { RematePieceVisualizer, type RematePieceVisualBridge } from "./remate/RematePieceVisualizer";
import {
  computeMountFrameM,
  faceOffsetsFromPositionM,
  resolveMountSlot,
} from "../../core/remate/remateMountFrame";
import { getRemateEnvelopeBoundsM } from "../../core/remate/rematePlacement";
import {
  applyRemateRotationSnapToMesh,
  rotationSnapIndexFromLocalY,
} from "../../core/remate/remateRotationSnap";
import { HematiVisualizer, type HematiVisualBridge } from "./hemati/HematiVisualizer";
import { RodapeVisualizer, type RodapeVisualBridge } from "./rodape/RodapeVisualizer";
import { mToMm } from "../../utils/units";
import {
  floorClearanceMeasurement,
  nearestBoxGapBetweenPair,
  nearestWallMeasurement,
  type Aabb3,
  type ParametricRulerHit,
} from "./measurement/parametricDimensions";
import { ViewerPanelVisibility } from "./panels/ViewerPanelVisibility";
import { ViewerRuntimeLoop } from "./runtime/ViewerRuntimeLoop";
import { ViewerOverlayCoordinator } from "./overlays/ViewerOverlayCoordinator";
import {
  applyAlignment,
  type AlignmentType,
  type AlignableObject,
} from "./commands/alignmentCommands";
import {
  computeUnifiedBoxDimensions,
  createDimensionsOverlay,
  updateDimensionsOverlay,
  disposeDimensionsOverlay,
  getDimensionsOverlayData,
  getPrintReadyDimensions,
  type BoxBoundsInput,
  type DimensionsOverlayHandle,
  type DimensionOverlayDataEntry,
  type PrintReadyDimensions,
} from "./overlays/boxDimensionsOverlay";
import { ViewerBoundsCache } from "./cache/ViewerBoundsCache";
import type { MouseMenuTarget } from "../../ui/context-menu/ContextMenuEngine";

function aabb3FromThreeBox3(b: THREE.Box3): Aabb3 {
  return {
    min: { x: b.min.x, y: b.min.y, z: b.min.z },
    max: { x: b.max.x, y: b.max.y, z: b.max.z },
  };
}

function parametricRulerHitToThree(hit: ParametricRulerHit): RulerMeasurementHit {
  return {
    kind: hit.kind,
    distanceM: hit.distanceM,
    start: new THREE.Vector3(hit.start.x, hit.start.y, hit.start.z),
    end: new THREE.Vector3(hit.end.x, hit.end.y, hit.end.z),
  };
}

/**
 * ViewerCore: orquestrador do motor 3D.
 * Coordena ViewerState (seleção, hover, tool), EventsManager (canvas/pointer) e ViewerTools (TransformControls, outline, clamp).
 * Não contém lógica de eventos nem de ferramentas; delega para os módulos viewer-engine/state, events e tools.
 *
 * API multi-box: addBox, removeBox, updateBox, setBoxIndex, addModelToBox, selectBox, etc.
 */

export type ViewerOptions = {
  background?: string;
  scene?: SceneOptions;
  environment?: EnvironmentOptions;
  camera?: CameraOptions;
  renderer?: RendererOptions;
  lights?: LightsOptions;
  controls?: ControlsOptions;
  enableControls?: boolean;
  box?: BoxOptions;
  /** Se true, não cria o box inicial "main"; módulos só aparecem ao gerar design ou carregar modelo. */
  skipInitialBox?: boolean;
};

export class ViewerCore {
  private container: HTMLElement;
  private sceneManager: SceneManager;
  private cameraManager: CameraManager;
  private rendererManager: RendererManager;
  private controls: Controls | null;
  private readonly boxManager = new ViewerBoxManager();
  get boxes(): Map<string, ViewerBoxEntry> {
    return this.boxManager.getBoxes();
  }
  private materialSet: MaterialSet;
  private defaultMaterialName = "mdf_branco";
  private boxGap = 0;
  private modelCounter = 0;
  private roomBuilder: RoomBuilder;
  private roomBoxGroup: THREE.Group | null = null;
  private roomBoxWalls: Array<{ id: number; normal: THREE.Vector3; mesh: THREE.Mesh }> = [];
  private roomBoxFloor: THREE.Mesh | null = null;
  private roomBoxFloorOutline: THREE.LineLoop | null = null;
  private roomBoxCeiling: THREE.Mesh | null = null;
  private roomFloorRoot: THREE.Group | null = null;
  private roomUtilitiesRoot: THREE.Group | null = null;
  private roomBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY: number;
    maxY: number;
    centerX: number;
    centerZ: number;
  } | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private readonly raycastSystem: ViewerRaycastSystem;
  private readonly viewerState = new ViewerState();
  private onBoxSelected: ((_id: string | null) => void) | null = null;
  private onMultiSelectToggle: ((_encodedId: string) => void) | null = null;
  private onRemateSelected: ((_remateId: string | null) => void) | null = null;
  private onRodapeSelected: ((_rodapeId: string | null) => void) | null = null;
  private onInternalSurfaceSelected: ((_hit: InternalSelectionState) => void) | null = null;
  private onInternalEdgeSelected: ((_hit: InternalSelectionState) => void) | null = null;
  private onInternalPointSelected: ((_hit: InternalSelectionState) => void) | null = null;
  private internalSelectionOutline: InternalSelectionOutline | null = null;
  private multiSelectionOutline: MultiSelectionOutline | null = null;
  private internalRulerOverlay: InternalRulerOverlay | null = null;
  private readonly selectedBoxChangeListeners = new Set<(_id: string | null) => void>();
  private onDoorLayerDoubleClick: ((_boxId: string, _doorLayerId: string) => void) | null = null;
  private onDrawerLayerDoubleClick: ((_boxId: string, _drawerLayerId: string) => void) | null = null;
  private onDrawerLayerClick: ((_boxId: string, _drawerLayerId: string) => void) | null = null;
  private onBoxDoubleClick: ((_boxId: string) => void) | null = null;
  private onModelLoaded: ((_boxId: string, _modelId: string, _object: THREE.Object3D) => void) | null = null;
  private onBoxTransform: ((_boxId: string, _position: { x: number; y: number; z: number }, _rotation: { x: number; y: number; z: number }) => void) | null = null;
  private onRemateTransform: ((
    _remateId: string,
    _patch: import("../../core/remate/rematePieceTypes").UpdateRematePieceInput
  ) => void) | null = null;
  private onHematiTransform: ((
    _hematiId: string,
    _patch: { transform: { xMm: number; yMm: number; zMm: number; rotacaoXRad: number; rotacaoYRad: number; rotacaoZRad: number }; placementFree: boolean }
  ) => void) | null = null;
  private onRodapeTransform: ((
    _rodapeId: string,
    _patch: { transform: { xMm: number; yMm: number; zMm: number; rotacaoXRad: number; rotacaoYRad: number; rotacaoZRad: number }; placementFree: boolean }
  ) => void) | null = null;
  private transformControls: TransformControls | null = null;
  /** Helper (Object3D) retornado por getHelper(); é o que é adicionado à cena e tem .visible. */
  private transformControlsHelper: THREE.Object3D | null = null;
  private groupGizmo: GroupGizmo | null = null;
  private measurementAnchorsVisualizer: MeasurementAnchorsVisualizer | null = null;
  private onTransformDragStart: (() => void) | null = null;
  private onTransformDragEnd: (() => void) | null = null;
  private readonly _boundingBox = new THREE.Box3();
  private readonly _center = new THREE.Vector3();
  private readonly _size = new THREE.Vector3();
  private readonly _boxSingle = new THREE.Box3();
  private readonly _frustum = new THREE.Frustum();
  private readonly _projScreenMatrix = new THREE.Matrix4();
  private readonly isMobile: boolean;
  private outlineCurrentOpacity = 0;
  private outlineTargetOpacity = 0;
  private onRoomElementPlaced: ((_wallId: number, _config: DoorWindowConfig, _type: "door" | "window") => void) | null = null;
  private onRoomElementSelected: ((_data: { elementId: string; wallId: number; type: "door" | "window"; config: DoorWindowConfig } | null) => void) | null = null;
  private onWallSelected: ((_wallId: number | null) => void) | null = null;
  private onWallTransform: ((_wallIndex: number, _position: { x: number; z: number }, _rotation: number) => void) | null = null;
  private onRoomElementTransform: ((_elementId: string, _config: DoorWindowConfig) => void) | null = null;
  private onRoomUtilitySelected: ((_data: { utilityId: string; wallId: number; config: ProjectRoomUtility } | null) => void) | null = null;
  private onRoomUtilityTransform: ((_utilityId: string, _patch: Pick<ProjectRoomUtility, "positionAlongWall" | "heightMm">) => void) | null = null;
  private roomCeilingVisible = true;
  private roomFloorMode: RoomFloorMode = "room";
  private hiddenRoomWallIds = new Set<number>();
  private mouseInputPreset: MouseInputPreset = "cad";
  private backgroundMode: ViewerBackgroundMode = "studio";
  private materialQuality: ViewerMaterialQuality = "standard";
  private reflectionsEnabled = false;
  private reflectionFrameCounter = 0;
  private reflectionUpdateIntervalFrames = 24;
  private photoModeEnabled = false;
  private readonly baseToneMappingExposure: number;
  private globalLightIntensity = 1;
  /** Intensidade das sombras (0–1); espelha `THREE.DirectionalLight.shadow.intensity`. */
  private shadowIntensityValue = 1;
  private readonly baseLightIntensities: {
    ambient: number;
    hemisphere: number;
    key: number;
    fill: number;
    rim: number;
  };

  /** Configurações de exibição expostas ao exterior (ex.: `viewerCore.display.shadowIntensity`). */
  readonly display!: {
    get shadowIntensity(): number;
    set shadowIntensity(_value: number);
  };

  /** Eventos internos do Viewer Engine (extensão para automação/plugins). */
  readonly events: {
    emit: (_event: string, ..._args: unknown[]) => void;
  } = {
    emit: () => {
      /* extensão futura: plugins / automação */
    },
  };

  // Lock: impede colisoes entre caixas e respeita os limites da sala.
  private lockEnabled = true;
  // Shift-Lock: bloqueia movimento no eixo Z quando Shift esta pressionado.
  private shiftKeyHeld = false;
  /** Z do box ao iniciar o drag (para Shift-Lock); em metros. */
  private dragStartZForShiftLock: number | undefined = undefined;
  private boundShiftKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Shift") this.shiftKeyHeld = true;
  };
  private boundShiftKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Shift") this.shiftKeyHeld = false;
  };
  /** Quando lock desativado: caixas que intersectam paredes (para destaque vermelho). */
  private boxesIntersectingWalls = new Set<string>();
  /** Parede escondida manualmente (se existir). */
  private manualHiddenWallId: number | null = null;

  /** Overlay unificado de medidas do conjunto de caixas (visualização apenas). */
  private dimensionsOverlayVisible = false;
  private dimensionsOverlayHandle: DimensionsOverlayHandle | null = null;

  private turntableEnabled = false;
  private turntableSpeed = 0.15;
  private lights: Lights;
  /** Grupo com um wireframe L×A×P de layout (contorno azul de seleção). */
  private selectionOutline: THREE.Group | null = null;
  private selectionOutlineTarget: THREE.Object3D | null = null;
  /** Evita reconstruir os helpers a cada frame quando a lista de peças não mudou. */
  private selectionOutlinePiecesSig: string | null = null;
  private selectionOutlineMaterial: THREE.LineBasicMaterial | null = null;
  private readonly pendingViewerVisualSync = {
    orla: false,
    remate: false,
    hemati: false,
    rodape: false,
  };
  private readonly pendingBoxStructureUpdates = new Map<string, Partial<BoxOptions>>();
  /** Outline da parede selecionada (Room Box). */
  private wallSelectionOutline: THREE.BoxHelper | null = null;
  private wallSelectionOutlineMaterial: THREE.LineBasicMaterial | null = null;
  /** Highlight por mesh (hover + seleção): portas, gavetas, painéis, furos. Só ativo quando highlightEnabled. */
  private highlightManager: HighlightManager | null = null;
  /** Outline global e isolado: apenas visual, usado para mostrar arestas das peças. */
  private edgeOutlineSystem: EdgeOutlineSystem | null = null;
  /** Gizmo para mover e rotacionar paredes (handles X/Z e rotação). */
  private wallGizmo: WallGizmo | null = null;
  private transformDiagnosticsEnabled = false;
  /** Quando true, permite logs de debug (ex.: getBoxIdAtPointer). Ativar manualmente para diagnóstico. */
  private debugMode = false;
  private eventsManager: EventsManager | null = null;
  private readonly viewerTools = new ViewerTools(() => this.getToolsEngineApi());

  /** Vista escolhida pelo utilizador (Selecionar Vista). Quando definida, updateCameraTarget/ToBox só atualizam o alvo, não a orientação. */
  private cameraViewPreset: "top" | "bottom" | "front" | "back" | "right" | "left" | "isometric" | null = null;

  /** Gestor da sala única (4 paredes principais + extras + piso + lock). */
  private roomManager: RoomManager | null = null;
  /** Snapshot/restore da câmera. */
  private snapshotRenderer: SnapshotRenderer | null = null;
  /** Overlay de debug do snapping (somente DEV). */
  private snapDebugOverlay: SnapDebugOverlay | null = null;
  private lastSnapDebugData: SnapDebugData | null = null;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private bokehPass: BokehPass | null = null;
  /** Compositor principal: RenderPass + bloom muito suave (modo atual). */
  private mainComposer: EffectComposer | null = null;
  private mainBloomPass: UnrealBloomPass | null = null;
  private ultraPerformanceMode = false;
  private ultraPerformanceModeOptions: UltraPerformanceModeOptions = {
    enabled: false,
    mode: "balanced",
  };
  private defaultPixelRatio: number;
  private defaultGroundSize: number;
  private ultraLightState: {
    key: number;
    fill: number;
    ambient: number;
    rim: number;
    castShadow: boolean;
    shadowRadius: number;
  } | null = null;
  private ultraRenderState: {
    materialQuality: ViewerMaterialQuality;
    reflectionsEnabled: boolean;
    toneMappingExposure: number;
  } | null = null;
  private ultraLightTarget: {
    key: number;
    fill: number;
    ambient: number;
    rim: number;
    castShadow: boolean;
    shadowRadius: number;
  } | null = null;
  private readonly LIGHT_LERP_FACTOR = 0.14;
  private ultraMaterialState = new Map<
    string,
    { roughness: number; metalness: number; envMapIntensity: number; flatShading: boolean }
  >();
  /** Snapshot dos valores PBR base por material.uuid (capturado após preset/MaterialEngine).
   * Fonte única para derivação de qualidade, gloss e matte — sem duplicação de estado. */
  private displayMaterialBaseByUuid = new Map<
    string,
    {
      roughness: number;
      metalness: number;
      envMapIntensity: number;
      map: THREE.Texture | null;
      clearcoat?: number;
      clearcoatRoughness?: number;
    }
  >();
  /** Intensidade de brilho visual (1 = preset original, 0 = fosco). Só afeta exibição. */
  private glossIntensity = 1;
  /** Modo fosco: sobrepõe gloss e clearcoat, envMapIntensity → 0. Reversível. */
  private matteMode = false;
  private premiumTexture: THREE.CanvasTexture | null = null;
  private _diagnosticsLogged = false;
  /** Evita aplicar rotação duplicada no mesmo mesh. */
  private appliedRotationByMeshUuid = new Map<string, number>();
  /** Diagnóstico DEV: contadores por mesh.uuid. */
  private rotationDiagnosticsByUuid = new Map<string, { applied: number; duplicateSkipped: number }>();
  private rotationDiagnosticsLastLogTs = 0;
  private renderExporter!: ViewerRenderExporter;
  private constraints!: TransformConstraints;
  /**
   * Fronteiras de integração extraídas do core:
   * - measurementOverlay: régua/medição interna e overlays 2D.
   * - panelVisibility: visibilidade de painéis, contornos e exploded view.
   * - runtimeLoop: cadência de frame, resize e pipeline de render.
   * O ViewerCore permanece como orquestrador e ponto único de composição.
   */
  private measurementOverlay!: ViewerMeasurementOverlay;
  private internalRulerEngine!: InternalRuler;
  private getProjectMeasurementsFn: () => InternalMeasurementEntry[] = () => [];
  private onInternalMeasurementSavedFn: (_entry: InternalMeasurementEntry) => void = () => {};
  private smartSnappingEngine!: SmartSnapping;
  private remateSmartSnapping!: RemateSmartSnapping;
  private smartAlignSnapOverlay!: SmartAlignSnapOverlay;
  readonly settings = {
    enableSmartAlignSnap: false,
  };
  private autoLayoutEngine!: AutoLayoutEngine;
  private smartLayoutBridge: SmartLayoutBridge | null = null;
  private autoWallFillEngine!: AutoWallFillEngine;
  private autoRoomFillEngine!: AutoRoomFillEngine;
  private autoDistributionEngine!: AutoDistributionEngine;
  private autoStackShelvesEngine!: AutoStackShelvesEngine;
  private predictiveLayoutEngine!: PredictiveLayoutEngine;
  private intelligentDesignerEngine!: IntelligentDesignerEngine;
  private readonly designConversationState = new DesignConversationState();
  private conversationalDesignerEngine!: ConversationalDesignerEngine;
  private manufacturingReportEngine!: ManufacturingReportEngine;
  private costReportEngine!: CostReportEngine;
  private orlaVisualizer = new OrlaVisualizer();
  private remateVisualizer = new RematePieceVisualizer();
  private remateVisualBridge: RematePieceVisualBridge | null = null;
  private rodapeVisualBridge: RodapeVisualBridge | null = null;
  private hematiVisualizer = new HematiVisualizer();
  private rodapeVisualizer = new RodapeVisualizer();
  private readonly overlayCoordinator = new ViewerOverlayCoordinator();
  private readonly boundsCache = new ViewerBoundsCache();
  /** Evita processar fim de drag duas vezes (mouseUp + dragging-changed). */
  private transformDragEndStamp = -1;
  readonly internalRuler: {
    enableForBox: (_boxId: string) => void;
    disable: () => void;
    isActive: () => boolean;
    getLastMeasurement: () => InternalRulerMeasurement | null;
    getActiveBoxId: () => string | null;
    syncFromProject: (_entries: InternalMeasurementEntry[]) => void;
  };
  readonly snapping: {
    enable: () => void;
    disable: () => void;
    isEnabled: () => boolean;
    setGridSize: (_mm: number) => void;
    setCaptureRadius: (_mm: number) => void;
    setMagnetStrength: (_value: number) => void;
    setMode: (_mode: import("./snapping/SmartSnapping").SmartSnapMode) => void;
    getMode: () => import("./snapping/SmartSnapping").SmartSnapMode;
    setRoomSnappingEnabled: (_enabled: boolean) => void;
    isRoomSnappingEnabled: () => boolean;
    setAutoAlignmentEnabled: (_enabled: boolean) => void;
    isAutoAlignmentEnabled: () => boolean;
    setAutoSpacingEnabled: (_enabled: boolean) => void;
    isAutoSpacingEnabled: () => boolean;
    setWallOffset: (_mm: number) => void;
    getWallOffset: () => number;
    getActiveAlignmentType: () => import("./snapping/SmartSnapping").ActiveAlignmentType;
  };
  readonly autoLayout: {
    fillWallWithModule: (_wallId: string | number, _moduleBoxId: string) => boolean;
    extendAlongWallFromBox: (_boxId: string) => boolean;
    distributeBoxesEvenly: (_boxIds: string[]) => boolean;
    autoStackShelvesInBox: (_boxId: string, _options: AutoStackShelvesOptions) => boolean;
  };
  readonly smartLayout: {
    autoWallFill: (_wallId: string | number, _moduleBoxId: string) => boolean;
    previewAutoWallFill: (_wallId: string | number, _moduleBoxId: string) => boolean;
    autoRoomFill: (_seedBoxId?: string) => boolean;
    autoDistribute: (_boxIds: string[]) => boolean;
    autoStackShelves: (_boxId: string, _options: AutoStackShelvesOptions) => boolean;
    applyPredictiveLayout: () => boolean;
    rejectPredictiveLayout: () => void;
    hasPredictiveLayout: () => boolean;
  };
  readonly intelligentDesigner: {
    generateDesigns: (_seedBoxId: string) => boolean;
    generateVariations: () => boolean;
    previewDesign: (_id: DesignVariantId) => boolean;
    applyDesign: (_id: DesignVariantId) => boolean;
    refineLayout: () => boolean;
    learnPreferences: () => string;
    explainDecision: (_id?: DesignVariantId) => string;
    previewStyle: (_styleId: EnvironmentStyleId, _seedBoxId: string) => boolean;
    applyStyle: (_styleId: EnvironmentStyleId, _seedBoxId: string) => boolean;
    explainStyle: (_styleId?: EnvironmentStyleId) => string;
    listStyles: () => Array<{ id: EnvironmentStyleId; label: string }>;
  };
  readonly conversationalDesigner: {
    sendMessage: (_text: string, _seedBoxId: string) => ConversationTurnResult;
    quickAction: (
      _action: "moreSpace" | "moreSymmetry" | "minimal" | "optimizeWall" | "variations",
      _seedBoxId: string
    ) => ConversationTurnResult;
    getHistory: () => ConversationEntry[];
    explain: () => string;
  };
  readonly manufacturing: {
    generateReport: () => ManufacturingFullReport;
    getReport: () => ManufacturingUiReport;
    autoFix: () => { ok: boolean; message: string; score: number };
    score: () => number;
    previewFixes: () => boolean;
    applySuggestedFixes: () => boolean;
  };
  readonly costEstimator: {
    generateCostReport: (_seedBoxId?: string) => CostFullReport;
    summarizeForUI: (_seedBoxId?: string) => CostUiSummary;
    score: () => number;
    compareDesigns: (_seedBoxId: string) => import("./snapping/costTypes").CostDesignComparison;
    compareStyles: () => import("./snapping/costTypes").CostStyleComparison;
    estimateChangeImpact: (_change: CostChangeInput) => import("./snapping/costTypes").CostImpactEstimate;
    suggestCheaper: (_seedBoxId: string) => boolean;
    suggestPremium: (_seedBoxId: string) => boolean;
    suggestBalanced: (_seedBoxId: string) => boolean;
  };
  readonly orlaVisual: {
    syncAll: () => void;
  };
  readonly remateVisual: {
    syncAll: () => void;
  };
  readonly hematiVisual: {
    syncAll: () => void;
  };
  readonly rodapeVisual: {
    syncAll: () => void;
  };
  private panelVisibility!: ViewerPanelVisibility;
  private runtimeLoop!: ViewerRuntimeLoop;

  constructor(container: HTMLElement, options: ViewerOptions = {}) {
    if (!container) {
      throw new Error("Viewer: container is required");
    }
    const userAgent =
      typeof window !== "undefined" && window.navigator ? window.navigator.userAgent : "";
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent ?? ""
    );
    this.reflectionUpdateIntervalFrames = this.isMobile ? 36 : 24;
    this.container = container;
    const background = options.background ?? options.scene?.background;
    this.sceneManager = new SceneManager({
      background,
      environment: options.environment,
    });
    this.defaultGroundSize = options.environment?.groundSize ?? 20;
    this.cameraManager = new CameraManager(options.camera);
    this.rendererManager = new RendererManager(container, {
      ...options.renderer,
      clearColor: background,
    });
    const shadowMapSize = this.isMobile ? 1024 : (options.lights?.shadowMapSize ?? 4096);
    this.lights = new Lights(this.sceneManager.scene, {
      ...options.lights,
      shadowMapSize,
    });
    this.baseLightIntensities = {
      ambient: this.lights.ambient.intensity,
      hemisphere: this.lights.hemisphere.intensity,
      key: this.lights.keyLight.intensity,
      fill: this.lights.fillLight.intensity,
      rim: this.lights.rimLight.intensity,
    };
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- getters no objeto precisam fechar sobre a instância do viewer
    const engine = this;
    this.display = {
      get shadowIntensity() {
        return engine.shadowIntensityValue;
      },
      set shadowIntensity(v: number) {
        engine.updateShadowIntensity(v);
      },
    };
    this.defaultPixelRatio = this.rendererManager.renderer.getPixelRatio();
    this.baseToneMappingExposure = this.rendererManager.renderer.toneMappingExposure;
    this.selectionOutlineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#7dd3fc"),
      linewidth: 1,
      opacity: 0.6,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.selectionOutline = new THREE.Group();
    this.selectionOutline.name = "selectionOutlinePieces";
    this.selectionOutline.visible = false;
    this.sceneManager.scene.add(this.selectionOutline);

    this.wallSelectionOutlineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#3b82f6"),
      linewidth: 1,
      opacity: 0.9,
      transparent: true,
      depthTest: true,
    });
    this.wallSelectionOutline = new THREE.BoxHelper(new THREE.Object3D(), 0x3b82f6);
    if (this.wallSelectionOutlineMaterial) {
      (this.wallSelectionOutline.material as THREE.Material).dispose();
      this.wallSelectionOutline.material = this.wallSelectionOutlineMaterial;
    }
    this.wallSelectionOutline.visible = false;
    this.sceneManager.scene.add(this.wallSelectionOutline);

    this.highlightManager = new HighlightManager(this.sceneManager.scene);
    this.edgeOutlineSystem = new EdgeOutlineSystem(this.sceneManager.scene);
    this.internalSelectionOutline = new InternalSelectionOutline(this.sceneManager.scene);
    this.multiSelectionOutline = new MultiSelectionOutline(this.sceneManager.scene);

    this.roomBuilder = new RoomBuilder(() => this.roomBoxWalls.map((w) => w.mesh));
    this.sceneManager.add(this.roomBuilder.getGroup());

    this.raycastSystem = new ViewerRaycastSystem({
      raycaster: this.raycaster,
      pointer: this.pointer,
      camera: this.cameraManager.camera,
      getBoxes: () => this.boxes,
      getRoomBoxWalls: () => this.roomBoxWalls,
      getRoomBuilderGroup: () => this.roomBuilder.getGroup(),
      getScene: () => this.sceneManager.scene,
      getCanvas: () => this.rendererManager.renderer.domElement,
      getRoomBounds: () => this.roomBounds,
      getTransformControlsHelper: () => this.transformControlsHelper,
      getDebugMode: () => this.debugMode,
      getBoxEntry: (boxId) => this.boxes.get(boxId),
      projectWorldToScreen: (world) => this.projectWorldToScreen(world),
      getRemateRoot: () => this.remateVisualizer.getRoot(),
      getHematiRoot: () => this.hematiVisualizer.getRoot(),
      getRodapeRoot: () => this.rodapeVisualizer.getRoot(),
    });

    this.panelVisibility = new ViewerPanelVisibility({
      getBoxes: () => this.boxes,
      getHighlightEnabled: () => this.viewerState.getHighlightEnabled(),
      getBoxIdByMesh: (mesh) => this.raycastSystem.getBoxIdByMesh(mesh),
      getSharedPanelEdgeMaterial: () => getSharedPanelEdgeMaterial(),
    });

    this.materialSet = mergeMaterialSet(defaultMaterialSet);

    this.controls = options.enableControls === false
      ? null
      : new Controls(this.cameraManager.camera, this.rendererManager.renderer.domElement, options.controls);
    this.applyMousePresetToControls();
    this.applyBackgroundMode();
    this.measurementOverlay = new ViewerMeasurementOverlay({
      getCamera: () => this.cameraManager.camera,
      getCanvas: () => this.rendererManager.renderer.domElement,
      getContainer: () => this.container,
      getBoxes: () => this.boxes,
      getSelectedBoxId: () => this.viewerState.getSelectedBox(),
      getRoomWalls: () => this.roomBoxWalls,
      isTransformDragging: () => this.viewerState.getTransformControlsDragging(),
      projectWorldToScreen: (worldPoint) => this.projectWorldToScreen(worldPoint),
      getNearestBoxDistance: () => this.computeDistanceToNearestBox(),
      getNearestWallDistance: () => this.computeDistanceToNearestWall(),
      getFloorDistance: () => this.computeDistanceToFloor(),
    });

    this.internalRulerEngine = new InternalRuler({
      getCamera: () => this.cameraManager.camera,
      getCanvas: () => this.rendererManager.renderer.domElement,
      getContainer: () => this.container,
      getBoxMesh: (boxId) => this.boxes.get(boxId)?.mesh ?? null,
      isTransformDragging: () => this.viewerState.getTransformControlsDragging(),
      projectWorldToScreen: (worldPoint) => this.projectWorldToScreen(worldPoint),
      getProjectMeasurements: () => this.getProjectMeasurementsFn(),
      onMeasurementSaved: (entry) => this.onInternalMeasurementSavedFn(entry),
    });
    this.internalRuler = {
      enableForBox: (boxId) => this.internalRulerEngine.enableForBox(boxId),
      disable: () => this.internalRulerEngine.disable(),
      isActive: () => this.internalRulerEngine.isActive(),
      getLastMeasurement: () => this.internalRulerEngine.getLastMeasurement(),
      getActiveBoxId: () => this.internalRulerEngine.getActiveBoxId(),
      syncFromProject: (entries) => this.internalRulerEngine.syncFromProject(entries),
    };

    this.internalRulerOverlay = new InternalRulerOverlay({
      getContainer: () => this.container,
      projectWorldToScreen: (worldPoint) => this.projectWorldToScreen(worldPoint),
      getBoxMesh: (boxId) => this.boxes.get(boxId)?.mesh ?? null,
    });

    this.smartSnappingEngine = new SmartSnapping({
      getCamera: () => this.cameraManager.camera,
      getCanvas: () => this.rendererManager.renderer.domElement,
      getContainer: () => this.container,
      projectWorldToScreen: (worldPoint) => this.projectWorldToScreen(worldPoint),
      isInternalRulerActive: () => this.internalRulerEngine.isActive(),
      getRoomBounds: () => this.roomBounds,
      getRoomOpenings: () => this.getRoomOpeningsForSnapping(),
    });
    this.remateSmartSnapping = new RemateSmartSnapping({
      getContainer: () => this.container,
      projectWorldToScreen: (worldPoint) => this.projectWorldToScreen(worldPoint),
    });
    this.remateSmartSnapping.enable();

    this.smartAlignSnapOverlay = new SmartAlignSnapOverlay({
      getContainer: () => this.container,
      projectWorldToScreen: (worldPoint) => this.projectWorldToScreen(worldPoint),
    });

    this.snapping = {
      enable: () => this.smartSnappingEngine.enable(),
      disable: () => this.smartSnappingEngine.disable(),
      isEnabled: () => this.smartSnappingEngine.isEnabled(),
      setGridSize: (mm) => this.smartSnappingEngine.setGridSize(mm),
      setCaptureRadius: (mm) => this.smartSnappingEngine.setCaptureRadius(mm),
      setMagnetStrength: (value) => this.smartSnappingEngine.setMagnetStrength(value),
      setMode: (mode) => this.smartSnappingEngine.setMode(mode),
      getMode: () => this.smartSnappingEngine.getMode(),
      setRoomSnappingEnabled: (enabled) => this.smartSnappingEngine.setRoomSnappingEnabled(enabled),
      isRoomSnappingEnabled: () => this.smartSnappingEngine.isRoomSnappingEnabled(),
      setAutoAlignmentEnabled: (enabled) => this.smartSnappingEngine.setAutoAlignmentEnabled(enabled),
      isAutoAlignmentEnabled: () => this.smartSnappingEngine.isAutoAlignmentEnabled(),
      setAutoSpacingEnabled: (enabled) => this.smartSnappingEngine.setAutoSpacingEnabled(enabled),
      isAutoSpacingEnabled: () => this.smartSnappingEngine.isAutoSpacingEnabled(),
      setWallOffset: (mm) => this.smartSnappingEngine.setWallOffset(mm),
      getWallOffset: () => this.smartSnappingEngine.getWallOffset(),
      getActiveAlignmentType: () => this.smartSnappingEngine.getActiveAlignmentType(),
    };

    this.overlayCoordinator.bind({
      syncRulerWithExternalSelectionMovement: () =>
        this.measurementOverlay.syncRulerWithExternalSelectionMovement(),
      clearRulerOverlayIfMovementIdle: (nowMs) =>
        this.measurementOverlay.clearRulerOverlayIfMovementIdle(nowMs),
      refreshInternalRuler: () => this.internalRulerEngine.refreshOverlay(),
      refreshInternalRulerOverlay: () => this.refreshInternalRulerOverlay(),
      refreshSnapping: () => this.smartSnappingEngine.refreshOverlay(),
      refreshSmartAlignSnap: () => this.clearSmartAlignSnapOverlay(),
      clearMovementRuler: () => this.measurementOverlay.clearRulerOverlay(),
      clearSmartAlignSnap: () => this.clearSmartAlignSnapOverlay(),
    });

    this.autoLayoutEngine = new AutoLayoutEngine();
    const smartLayoutDeps = {
      getBridge: () => this.smartLayoutBridge,
      refineBoxWithSmartSnap: () => {},
      isSmartSnapEnabled: () => false,
      buildSnapContext: () => this.buildDisabledSmartSnapContext(),
      getBoxWorldPosition: (boxId: string) => {
        const entry = this.boxes.get(boxId);
        return entry ? entry.mesh.position.clone() : null;
      },
      setBoxWorldPosition: (boxId: string, pos: THREE.Vector3) => {
        const entry = this.boxes.get(boxId);
        if (entry) entry.mesh.position.copy(pos);
      },
    };
    this.autoWallFillEngine = new AutoWallFillEngine(smartLayoutDeps);
    this.autoRoomFillEngine = new AutoRoomFillEngine(smartLayoutDeps);
    this.autoDistributionEngine = new AutoDistributionEngine(smartLayoutDeps);
    this.autoStackShelvesEngine = new AutoStackShelvesEngine(smartLayoutDeps);
    this.predictiveLayoutEngine = new PredictiveLayoutEngine(smartLayoutDeps);
    this.intelligentDesignerEngine = new IntelligentDesignerEngine({
      getBridge: () => this.smartLayoutBridge,
      getRoomLabelHint: () => this.smartLayoutBridge?.getRoomLabelHint?.(),
      refinePlan: (plan) => this.refineLayoutPlan(plan),
    });
    this.manufacturingReportEngine = new ManufacturingReportEngine({
      getContext: () => this.buildManufacturingScanContext(),
      applyPlan: (plan) => {
        this.smartLayoutBridge?.applyPlan(plan);
      },
      refinePlan: (plan) => this.refineLayoutPlan(plan),
      distribute: (boxIds) => this.autoDistributionEngine.distribute({
        boxIds,
        alignTop: true,
        alignFront: true,
        alignDepth: true,
        useHistorySpacing: true,
      }),
      isSmartSnapEnabled: () => false,
    });
    this.costReportEngine = new CostReportEngine({
      getContext: () => this.buildCostScanContext(),
      getDesigner: () => this.intelligentDesignerEngine,
      getSeedBoxId: () => this.resolveCostSeedBoxId(),
    });
    this.conversationalDesignerEngine = new ConversationalDesignerEngine({
      designer: this.intelligentDesignerEngine,
      conversation: this.designConversationState,
      previewPlan: (plan, label, previewId) => {
        const { overlay } = buildPredictiveLayoutResult(this.predictiveLayoutEngine, plan, label);
        this.predictiveLayoutEngine.previewDesigns([{ id: previewId, plan, label }]);
        this.smartAlignSnapOverlay.setState(overlay);
      },
      applyPlan: (plan, meta) => {
        const ok = this.intelligentDesignerEngine.applyPlanDirect(plan, {
          designId: meta.designId,
          variationKind: meta.variationKind,
        });
        if (ok) {
          this.designConversationState.recordApplied({
            plan,
            label: meta.label,
            designId: meta.designId,
            variationKind: meta.variationKind,
          });
          this.clearSmartAlignSnapOverlay();
        }
        return ok;
      },
      acceptPending: () => this.acceptConversationalPending(),
      rejectPending: () => {
        this.predictiveLayoutEngine.rejectPending();
        this.designConversationState.clearPending();
        this.clearSmartAlignSnapOverlay();
      },
      optimizeWallPreview: (wallId, seedBoxId) => this.previewSmartWallFill(wallId, seedBoxId),
      getManufacturingReport: () => this.manufacturingReportEngine.generateReport(),
      previewManufacturingFixes: () => this.previewManufacturingFixes(),
      applyManufacturingFixes: () => {
        const result = this.manufacturingReportEngine.autoFix();
        return { ok: result.ok, message: result.message };
      },
      getCostReport: (seedBoxId) => {
        this.designConversationState.setSeedBoxId(seedBoxId);
        return this.costReportEngine.generateCostReport();
      },
      previewCostSuggestion: (suggestion) => this.previewCostSuggestion(suggestion),
      buildCostSuggestion: (tier, seedBoxId, reducePercent) => {
        this.designConversationState.setSeedBoxId(seedBoxId);
        this.costReportEngine.scanProject();
        if (tier === "cheaper") {
          return reducePercent != null
            ? this.costReportEngine.suggestReduceCostPercent(reducePercent)
            : this.costReportEngine.suggestCheaperAlternative();
        }
        if (tier === "premium") return this.costReportEngine.suggestPremiumAlternative();
        return this.costReportEngine.suggestBalancedAlternative();
      },
    });

    this.autoLayout = {
      fillWallWithModule: (wallId, moduleBoxId) =>
        this.autoLayoutEngine.fillWallWithModule(wallId, moduleBoxId),
      extendAlongWallFromBox: (boxId) => this.autoLayoutEngine.extendAlongWallFromBox(boxId),
      distributeBoxesEvenly: (boxIds) => this.autoLayoutEngine.distributeBoxesEvenly(boxIds),
      autoStackShelvesInBox: (boxId, options) =>
        this.autoLayoutEngine.autoStackShelvesInBox(boxId, options),
    };
    this.smartLayout = {
      autoWallFill: (wallId, moduleBoxId) =>
        this.autoWallFillEngine.fillWall({ wallId, moduleBoxId, alignTop: true, alignFront: true }),
      previewAutoWallFill: (wallId, moduleBoxId) => this.previewSmartWallFill(wallId, moduleBoxId),
      autoRoomFill: (seedBoxId) => this.autoRoomFillEngine.fillRoom(seedBoxId),
      autoDistribute: (boxIds) =>
        this.autoDistributionEngine.distribute({
          boxIds,
          alignTop: true,
          alignFront: true,
          alignDepth: true,
          useHistorySpacing: true,
        }),
      autoStackShelves: (boxId, options) => this.autoStackShelvesEngine.stackShelves(boxId, options),
      applyPredictiveLayout: () => this.acceptPredictiveLayoutPending(),
      rejectPredictiveLayout: () => {
        this.predictiveLayoutEngine.rejectPending();
        this.clearSmartAlignSnapOverlay();
      },
      hasPredictiveLayout: () => this.predictiveLayoutEngine.getPending() !== null,
    };
    this.intelligentDesigner = {
      generateDesigns: (seedBoxId) => this.generateIntelligentDesigns(seedBoxId),
      generateVariations: () => this.generateIntelligentVariations(),
      previewDesign: (id) => this.previewIntelligentDesign(id),
      applyDesign: (id) => this.applyIntelligentDesign(id),
      refineLayout: () => this.intelligentDesignerEngine.refineLastLayout(),
      learnPreferences: () => this.intelligentDesignerEngine.learnPreferencesSummary(),
      explainDecision: (id) => this.intelligentDesignerEngine.explainDecision(id),
      previewStyle: (styleId, seedBoxId) => this.previewIntelligentStyle(styleId, seedBoxId),
      applyStyle: (styleId, seedBoxId) => this.applyIntelligentStyle(styleId, seedBoxId),
      explainStyle: (styleId) => this.intelligentDesignerEngine.explainStyle(styleId),
      listStyles: () => listStyleProfiles().map((p) => ({ id: p.id, label: p.label })),
    };
    this.conversationalDesigner = {
      sendMessage: (text, seedBoxId) => this.conversationalDesignerEngine.processInput(text, seedBoxId),
      quickAction: (action, seedBoxId) =>
        this.conversationalDesignerEngine.processQuickAction(action, seedBoxId),
      getHistory: () => this.designConversationState.getHistory(),
      explain: () =>
        this.intelligentDesignerEngine.explainDecision(
          this.intelligentDesignerEngine.getLastAppliedDesignId() ?? undefined
        ),
    };
    this.manufacturing = {
      generateReport: () => this.manufacturingReportEngine.generateReport(),
      getReport: () => this.manufacturingReportEngine.getUiReport(),
      score: () => this.manufacturingReportEngine.score(),
      autoFix: () => {
        const result = this.manufacturingReportEngine.autoFix();
        return { ok: result.ok, message: result.message, score: result.scan.score };
      },
      previewFixes: () => this.previewManufacturingFixes(),
      applySuggestedFixes: () => this.applyManufacturingSuggestedFixes(),
    };
    this.costEstimator = {
      generateCostReport: (seedBoxId) => {
        if (seedBoxId) this.designConversationState.setSeedBoxId(seedBoxId);
        return this.costReportEngine.generateCostReport();
      },
      summarizeForUI: (seedBoxId) => {
        if (seedBoxId) this.designConversationState.setSeedBoxId(seedBoxId);
        return this.costReportEngine.summarizeCostForUI();
      },
      score: () => this.costReportEngine.score(),
      compareDesigns: (seedBoxId) => {
        this.designConversationState.setSeedBoxId(seedBoxId);
        return this.costReportEngine.compareDesignsCost(seedBoxId);
      },
      compareStyles: () => this.costReportEngine.compareStylesCost(),
      estimateChangeImpact: (change) => this.costReportEngine.estimateChangeImpact(change),
      suggestCheaper: (seedBoxId) => this.previewCostSuggestionByTier(seedBoxId, "cheaper"),
      suggestPremium: (seedBoxId) => this.previewCostSuggestionByTier(seedBoxId, "premium"),
      suggestBalanced: (seedBoxId) => this.previewCostSuggestionByTier(seedBoxId, "balanced"),
    };
    this.orlaVisual = {
      syncAll: () => this.syncOrlaVisuals(),
    };
    this.remateVisual = {
      syncAll: () => this.syncRemateVisuals(),
    };
    this.hematiVisual = {
      syncAll: () => this.syncHematiVisuals(),
    };
    this.rodapeVisual = {
      syncAll: () => this.syncRodapeVisuals(),
    };

    this.applyAdminRulesSettings();
    rulesStore.snapRules.subscribe(() => this.applyAdminRulesSettings());
    rulesStore.roomRules.subscribe(() => this.applyAdminRulesSettings());

    this.transformControls = new TransformControls(
      this.cameraManager.camera,
      this.rendererManager.renderer.domElement
    );
    this.transformControls.setSpace("world");
    this.transformControls.enabled = true;
    this.transformControls.showX = true;
    this.transformControls.showY = true;
    this.transformControls.showZ = true;
    this.transformControls.addEventListener("mouseDown", () => {
      historyManager.beginDragSession("transform.drag", "Transformação");
      this.onTransformDragStart?.();
      if (this.viewerState.getSelectedRemate()) {
        const obj = this.transformControls!.object;
        if (obj) this.remateSmartSnapping.onDragStart(obj as THREE.Object3D);
      } else if (this.viewerState.getSelectedBox()) {
        const obj = this.transformControls!.object;
        if (obj && "position" in obj) {
          this.dragStartZForShiftLock = (obj as THREE.Object3D).position.z;
          this.smartSnappingEngine.onDragStart(obj as THREE.Object3D);
        }
      }
      this.viewerState.setTransformControlsDragging(true);
      this.logTransformDiagnostic("dragStart(mouseDown)");
    });
    this.transformControls.addEventListener("mouseUp", () => {
      this.finishTransformDrag("mouseUp");
      this.logTransformDiagnostic("dragEnd(mouseUp)");
    });
    this.transformControls.addEventListener("dragging-changed", (event) => {
      this.viewerState.setTransformControlsDragging(Boolean(event.value));
      this.logTransformDiagnostic("dragging-changed", {
        value: Boolean(event.value),
      });
      if (!event.value) {
        this.finishTransformDrag("dragging-changed");
      }
    });
    this.transformControls.addEventListener("objectChange", () => {
      if (this.groupGizmo?.isActive()) {
        this.groupGizmo.applyPivotTransform();
      }
      if (
        this.viewerState.getTransformControlsDragging() &&
        this.viewerState.getSelectedBox() &&
        this.shiftKeyHeld &&
        this.dragStartZForShiftLock !== undefined
      ) {
        const obj = this.transformControls!.object;
        if (obj && "position" in obj) (obj as THREE.Object3D).position.z = this.dragStartZForShiftLock;
      }
      this.viewerTools.applyCurrentTool();
      this.measurementOverlay.onRulerMovementTick("transform");
      this.notifyBoxTransform();
      this.logTransformDiagnostic("drag(objectChange)");
    });
    this.transformControlsHelper = this.transformControls.getHelper();
    this.transformControlsHelper.visible = false;
    this.sceneManager.scene.add(this.transformControlsHelper);
    this.groupGizmo = new GroupGizmo(this.sceneManager.scene);
    this.measurementAnchorsVisualizer = new MeasurementAnchorsVisualizer(this.sceneManager.scene);
    this.logTransformDiagnostic("transform-listeners-ready", {
      domTag: this.rendererManager.renderer.domElement.tagName,
      helperVisible: this.transformControlsHelper.visible,
    });

    this.wallGizmo = new WallGizmo(this.cameraManager.camera);
    this.wallGizmo.setOnTransform(() => this.notifyWallTransform());
    this.sceneManager.scene.add(this.wallGizmo.group);
    this.sceneManager.scene.add(this.remateVisualizer.getRoot());
    this.sceneManager.scene.add(this.hematiVisualizer.getRoot());
    this.sceneManager.scene.add(this.rodapeVisualizer.getRoot());
    this.setWallEditMode(false);

    this.roomManager = new RoomManager(this as unknown as IRoomManagerViewer);
    if (import.meta.env.DEV) {
      this.snapDebugOverlay = new SnapDebugOverlay();
    }

    this.snapshotRenderer = new SnapshotRenderer({
      getCamera: () => ({
        position: this.cameraManager.camera.position,
        quaternion: this.cameraManager.camera.quaternion,
        zoom: "zoom" in this.cameraManager.camera ? (this.cameraManager.camera as { zoom: number }).zoom : 1,
        type: this.cameraManager.camera.type,
      }),
      getControls: () =>
        this.controls?.controls
          ? { target: this.controls.controls.target, update: () => this.controls!.controls!.update() }
          : null,
      getScene: () => this.sceneManager.scene,
      getRenderer: () => this.rendererManager.renderer,
      getContainer: () => this.container,
    });

    this.constraints = new TransformConstraints();
    this.renderExporter = new ViewerRenderExporter({
      getBoxes: () => this.boxes,
      getRenderer: () => this.rendererManager.renderer,
      getScene: () => this.sceneManager.scene,
      getCamera: () => this.cameraManager.camera,
      getControls: () =>
        this.controls?.controls
          ? { target: this.controls.controls.target, update: () => this.controls!.controls!.update() }
          : null,
      getLights: () => ({
        keyLight: this.lights.keyLight,
        fillLight: this.lights.fillLight,
        ambient: this.lights.ambient,
        rimLight: this.lights.rimLight,
      }),
      getGroundVisible: () => this.sceneManager.getGroundVisible(),
      setGroundVisible: (visible) => this.sceneManager.setGroundVisible(visible),
      getGridVisible: () => this.sceneManager.getGridVisible(),
      setGridVisible: (visible) => this.sceneManager.setGridVisible(visible),
      getRoomGroup: () => this.roomBuilder.getGroup(),
      getRoomWalls: () => this.roomBoxWalls,
      getSelectionOutline: () => this.selectionOutline,
      getWallSelectionOutline: () => this.wallSelectionOutline,
      getDimensionsOverlayGroup: () => this.dimensionsOverlayHandle?.group ?? null,
      getWallGizmoGroup: () => this.wallGizmo?.group ?? null,
      ensureShowcaseComposer: () => {
        if (!this.composer) this.initShowcaseComposer();
      },
      ensureMainComposer: () => {
        if (!this.mainComposer) this.initMainComposer();
      },
      getShowcaseComposer: () => this.composer,
      getMainComposer: () => this.mainComposer,
      getShowcaseBloomPass: () => this.bloomPass,
      getMainBloomPass: () => this.mainBloomPass,
      updateShowcaseComposerSize: () => this.updateShowcaseComposerSize(),
      updateMainComposerSize: () => this.updateMainComposerSize(),
      updateCanvasSize: () => this.updateCanvasSize(),
    });
    this.runtimeLoop = new ViewerRuntimeLoop({
      getRenderer: () => this.rendererManager.renderer,
      renderScene: () => this.rendererManager.render(this.sceneManager.scene, this.cameraManager.camera),
      getCamera: () => this.cameraManager.camera,
      setCameraAspect: (aspect) => {
        this.cameraManager.camera.aspect = aspect;
      },
      updateCameraProjection: () => this.cameraManager.camera.updateProjectionMatrix(),
      getContainer: () => this.container,
      ensureMainComposer: () => {
        if (!this.mainComposer) this.initMainComposer();
      },
      getShowcaseComposer: () => this.composer,
      getMainComposer: () => this.mainComposer,
      getBokehPass: () => this.bokehPass,
      updateShowcaseComposerSize: () => this.updateShowcaseComposerSize(),
      updateMainComposerSize: () => this.updateMainComposerSize(),
      getCurrentMode: () => this.viewerState.getCurrentMode(),
      isUltraPerformanceMode: () => this.ultraPerformanceMode,
      isTurntableEnabled: () => this.turntableEnabled && this.viewerState.getCurrentMode() === "showcase",
      getTurntableSpeed: () => this.turntableSpeed,
      getTurntableTarget: () => this.controls?.controls?.target?.clone() ?? null,
      getBoxes: () => this.boxes,
      onBeforeRenderTick: () => this.onBeforeRenderTick(),
      onAfterRenderTick: () => this.onAfterRenderTick(),
    });

    this.updateCameraTarget();

    this.eventsManager = new EventsManager(this.getEventEngineApi());
    this.eventsManager.register(this.rendererManager.renderer.domElement);

    materialEngineSetLacqueredClearcoatPipeline(this.materialQuality === "lacquered");

    this.start();
    window.addEventListener("resize", this.updateCanvasSize);
    window.addEventListener("keydown", this.boundShiftKeyDown);
    window.addEventListener("keyup", this.boundShiftKeyUp);
  }

  getCurrentMode(): "performance" | "showcase" {
    return this.viewerState.getCurrentMode();
  }

  bindInternalMeasurementBridge(
    getMeasurements: () => InternalMeasurementEntry[],
    onSaved: (_entry: InternalMeasurementEntry) => void
  ): void {
    this.getProjectMeasurementsFn = getMeasurements;
    this.onInternalMeasurementSavedFn = onSaved;
    this.internalRulerEngine.syncFromProject(getMeasurements());
  }

  bindAutoLayoutBridge(
    bridge: Pick<AutoLayoutBridge, "getWorkspaceBoxes" | "applyPlan"> & {
      runProjectRoomFill?: () => boolean;
      getRoomLabelHint?: () => string | undefined;
    }
  ): void {
    this.smartLayoutBridge = {
      getWorkspaceBoxes: bridge.getWorkspaceBoxes,
      applyPlan: bridge.applyPlan,
      getRoomBoundsMm: () => this.getRoomBoundsMmForAutoLayout(),
      getOpeningsMm: () => this.getRoomOpeningsMmForAutoLayout(),
      getWallOffsetMm: () => this.smartSnappingEngine.getWallOffset(),
      runProjectRoomFill: bridge.runProjectRoomFill,
      getRoomLabelHint: bridge.getRoomLabelHint,
    };
    this.autoLayoutEngine.bindBridge(this.smartLayoutBridge);
  }

  bindOrlaBridge(bridge: Pick<OrlaVisualBridge, "getBoxOrlaConfig"> | null): void {
    this.orlaVisualizer.bindBridge(bridge);
    this.syncOrlaVisuals();
  }

  syncOrlaVisuals(): void {
    if (this.viewerState.getTransformControlsDragging()) {
      this.pendingViewerVisualSync.orla = true;
      return;
    }
    for (const [boxId, entry] of this.boxes.entries()) {
      if (entry?.mesh) this.orlaVisualizer.syncBoxRoot(boxId, entry.mesh);
    }
    this.refreshViewerAttachmentsAfterMeshMutation();
  }

  private syncOrlaForBox(boxId: string): void {
    if (this.viewerState.getTransformControlsDragging()) {
      this.pendingViewerVisualSync.orla = true;
      return;
    }
    const entry = this.boxes.get(boxId);
    if (!entry?.mesh) return;
    this.orlaVisualizer.syncBoxRoot(boxId, entry.mesh);
    this.refreshViewerAttachmentsAfterMeshMutation();
  }

  bindRemateBridge(bridge: RematePieceVisualBridge | null): void {
    this.remateVisualBridge = bridge;
    this.remateVisualizer.bindBridge(bridge);
    this.syncRemateVisuals();
  }

  syncRemateVisuals(): void {
    if (this.viewerState.getTransformControlsDragging()) {
      this.pendingViewerVisualSync.remate = true;
      return;
    }
    this.remateVisualizer.syncAll();
    for (const [, entry] of this.boxes.entries()) {
      if (!entry?.mesh) continue;
      this.clearBoxChildrenRemateLegacy(entry.mesh);
      this.applyPanelVisibilityForObject(entry.mesh);
    }
    this.applyPanelVisibilityForObject(this.remateVisualizer.getRoot());
    this.refreshViewerAttachmentsAfterMeshMutation();
  }

  private clearBoxChildrenRemateLegacy(boxRoot: THREE.Object3D): void {
    this.remateVisualizer.clearBoxChildren(boxRoot);
  }

  private syncRemateForBox(_boxId: string): void {
    this.syncRemateVisuals();
  }

  getRemateMesh(remateId: string): THREE.Object3D | null {
    return this.remateVisualizer.getMeshByRemateId(remateId) ?? null;
  }

  selectRemate(remateId: string | null): void {
    this.viewerState.setSelectedRemate(remateId);
    this.onRemateSelected?.(remateId);
    if (remateId) {
      this.viewerState.setSelectedHemati(null);
      this.viewerState.setSelectedRodape(null);
      this.viewerState.setSelectedBox(null);
      this.viewerState.setSelectedWallIndex(null);
      this.viewerState.setSelectedRoomElementId(null);
      this.viewerState.clearGroupTransformMemberIds();
    }
    this.refreshTransformControlsAttachment();
    this.refreshOutlineTarget();
  }

  setOnRemateTransform(
    callback: ((
      _remateId: string,
      _patch: import("../../core/remate/rematePieceTypes").UpdateRematePieceInput
    ) => void) | null
  ): void {
    this.onRemateTransform = callback;
  }

  setOnRemateSelected(callback: ((_remateId: string | null) => void) | null): void {
    this.onRemateSelected = callback;
  }

  setOnRodapeSelected(callback: ((_rodapeId: string | null) => void) | null): void {
    this.onRodapeSelected = callback;
  }

  bindHematiBridge(bridge: HematiVisualBridge | null): void {
    this.hematiVisualizer.bindBridge(bridge);
    this.syncHematiVisuals();
  }

  syncHematiVisuals(): void {
    if (this.viewerState.getTransformControlsDragging()) {
      this.pendingViewerVisualSync.hemati = true;
      return;
    }
    this.hematiVisualizer.syncAll();
    this.applyPanelVisibilityForObject(this.hematiVisualizer.getRoot());
    this.refreshViewerAttachmentsAfterMeshMutation();
  }

  bindRodapeBridge(bridge: RodapeVisualBridge | null): void {
    this.rodapeVisualBridge = bridge;
    this.rodapeVisualizer.bindBridge(bridge);
    this.syncRodapeVisuals();
  }

  syncRodapeVisuals(): void {
    if (this.viewerState.getTransformControlsDragging()) {
      this.pendingViewerVisualSync.rodape = true;
      return;
    }
    this.rodapeVisualizer.syncAll();
    this.applyPanelVisibilityForObject(this.rodapeVisualizer.getRoot());
    this.refreshViewerAttachmentsAfterMeshMutation();
  }

  getHematiMesh(hematiId: string): THREE.Object3D | null {
    return this.hematiVisualizer.getMeshByHematiId(hematiId) ?? null;
  }

  getRodapeMesh(rodapeId: string): THREE.Object3D | null {
    return this.rodapeVisualizer.getMeshByRodapeId(rodapeId) ?? null;
  }

  getHematiIdAtPointer(event: { clientX: number; clientY: number }): string | null {
    return this.raycastSystem.getHematiIdAtPointer(event);
  }

  getRodapeIdAtPointer(event: { clientX: number; clientY: number }): string | null {
    return this.raycastSystem.getRodapeIdAtPointer(event);
  }

  selectHemati(hematiId: string | null): void {
    this.viewerState.setSelectedHemati(hematiId);
    if (hematiId) {
      this.viewerState.setSelectedRodape(null);
      this.viewerState.setSelectedRemate(null);
      this.viewerState.setSelectedBox(null);
      this.viewerState.setSelectedWallIndex(null);
      this.viewerState.setSelectedRoomElementId(null);
      this.viewerState.clearGroupTransformMemberIds();
    }
    this.refreshTransformControlsAttachment();
    this.refreshOutlineTarget();
  }

  selectRodape(rodapeId: string | null): void {
    this.viewerState.setSelectedRodape(rodapeId);
    this.onRodapeSelected?.(rodapeId);
    if (rodapeId) {
      this.viewerState.setSelectedHemati(null);
      this.viewerState.setSelectedRemate(null);
      this.viewerState.setSelectedBox(null);
      this.viewerState.setSelectedWallIndex(null);
      this.viewerState.setSelectedRoomElementId(null);
      this.viewerState.clearGroupTransformMemberIds();
    }
    this.refreshTransformControlsAttachment();
    this.refreshOutlineTarget();
  }

  setOnHematiTransform(
    callback: ((
      _hematiId: string,
      _patch: { transform: { xMm: number; yMm: number; zMm: number; rotacaoXRad: number; rotacaoYRad: number; rotacaoZRad: number }; placementFree: boolean }
    ) => void) | null
  ): void {
    this.onHematiTransform = callback;
  }

  setOnRodapeTransform(
    callback: ((
      _rodapeId: string,
      _patch: { transform: { xMm: number; yMm: number; zMm: number; rotacaoXRad: number; rotacaoYRad: number; rotacaoZRad: number }; placementFree: boolean }
    ) => void) | null
  ): void {
    this.onRodapeTransform = callback;
  }

  private getRoomBoundsMmForAutoLayout(): AutoLayoutRoomBoundsMm | null {
    if (!this.roomBounds) return null;
    const b = this.roomBounds;
    return {
      minX_mm: mToMm(b.minX),
      maxX_mm: mToMm(b.maxX),
      minZ_mm: mToMm(b.minZ),
      maxZ_mm: mToMm(b.maxZ),
      minY_mm: mToMm(b.minY),
      maxY_mm: mToMm(b.maxY),
    };
  }

  private getRoomOpeningsMmForAutoLayout(): AutoLayoutOpeningMm[] {
    return this.getRoomOpeningsForSnapping().map((opening) => ({
      minX_mm: mToMm(opening.min.x),
      maxX_mm: mToMm(opening.max.x),
      minZ_mm: mToMm(opening.min.z),
      maxZ_mm: mToMm(opening.max.z),
    }));
  }

  setMode(mode: "performance" | "showcase", turntable = false): void {
    this.viewerState.setCurrentMode(mode);
    this.turntableEnabled = mode === "showcase" && turntable;
    this.lights.setShadowMapSize(this.isMobile ? 1024 : 4096);
    if (mode === "showcase") {
      if (!this.composer) {
        this.initShowcaseComposer();
      }
    } else {
      this.disposeComposer();
    }
  }

  setShowcaseMode(active: boolean, turntable = false): void {
    this.setMode(active ? "showcase" : "performance", turntable);
  }

  getShowcaseMode(): boolean {
    return this.viewerState.getCurrentMode() === "showcase";
  }

  private clampGlobalLightIntensity(value: number): number {
    return Math.min(1.4, Math.max(0.6, Number.isFinite(value) ? value : 1));
  }

  private getScaledLightProfile(profile: {
    key: number;
    fill: number;
    ambient: number;
    rim: number;
    castShadow: boolean;
    shadowRadius: number;
  }) {
    const factor = this.globalLightIntensity;
    return {
      ...profile,
      key: profile.key * factor,
      fill: profile.fill * factor,
      ambient: profile.ambient * factor,
      rim: profile.rim * factor,
    };
  }

  setGlobalLightIntensity(value: number): void {
    this.globalLightIntensity = this.clampGlobalLightIntensity(value);
    if (this.ultraPerformanceMode && this.ultraLightTarget && this.ultraLightState) {
      this.ultraLightTarget = this.getScaledLightProfile(this.ultraLightState);
      return;
    }
    this.lights.ambient.intensity = this.baseLightIntensities.ambient * this.globalLightIntensity;
    this.lights.hemisphere.intensity = this.baseLightIntensities.hemisphere * this.globalLightIntensity;
    this.lights.keyLight.intensity = this.baseLightIntensities.key * this.globalLightIntensity;
    this.lights.fillLight.intensity = this.baseLightIntensities.fill * this.globalLightIntensity;
    this.lights.rimLight.intensity = this.baseLightIntensities.rim * this.globalLightIntensity;
  }

  getGlobalLightIntensity(): number {
    return this.globalLightIntensity;
  }

  setShadowIntensity(value: number): void {
    this.updateShadowIntensity(value);
  }

  getShadowIntensity(): number {
    return this.shadowIntensityValue;
  }

  /**
   * Aplica intensidade das sombras na luz principal (Three.js `shadow.intensity`) e agenda render.
   */
  updateShadowIntensity(value: number): void {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));
    this.shadowIntensityValue = clamped;
    this.lights.keyLight.shadow.intensity = clamped;
    this.events.emit("shadowIntensityChanged", clamped);
    this.requestRender();
  }

  setUltraPerformanceMode(active: boolean): void {
    if (this.ultraPerformanceMode === active) return;
    this.ultraPerformanceMode = active;
    this.ultraPerformanceModeOptions = {
      ...this.ultraPerformanceModeOptions,
      enabled: active,
    };

    const mode = this.ultraPerformanceModeOptions.mode;
    const isAggressive = mode === "aggressive";
    const isFlat2 = mode === "flat2";

    if (active) {
      if (!this.ultraLightState) {
        this.ultraLightState = {
          key: this.baseLightIntensities.key * (isAggressive ? 1.08 : 1.18),
          fill: this.baseLightIntensities.fill * (isAggressive ? 1.03 : 1.12),
          ambient: this.baseLightIntensities.ambient * (isAggressive ? 1.02 : 1.08),
          rim: this.baseLightIntensities.rim * (isAggressive ? 0.95 : 1.2),
          castShadow: this.lights.keyLight.castShadow,
          shadowRadius: isAggressive ? 4.5 : 6.5,
        };
      }
      this.ultraLightTarget = this.getScaledLightProfile(this.ultraLightState);
      this.lights.keyLight.castShadow = true;
      this.lights.keyLight.shadow.radius = this.ultraLightTarget.shadowRadius;
      this.reflectionUpdateIntervalFrames = this.isMobile ? 30 : 18;

      if (!this.ultraRenderState) {
        this.ultraRenderState = {
          materialQuality: this.materialQuality,
          reflectionsEnabled: this.reflectionsEnabled,
          toneMappingExposure: this.rendererManager.renderer.toneMappingExposure,
        };
      }

      this.setMaterialQuality("lacquered");
      this.setReflectionsEnabled(true);
      this.rendererManager.renderer.toneMappingExposure = Math.max(this.baseToneMappingExposure, 1.08);

      const optimizedRatio = this.isMobile
        ? Math.min(this.defaultPixelRatio, 0.95)
        : Math.min(this.defaultPixelRatio, 1.2);
      this.rendererManager.renderer.setPixelRatio(optimizedRatio);
      this.applyUltraMaterialProfile(isFlat2, false);
    } else {
      if (this.ultraLightState) {
        this.ultraLightTarget = this.getScaledLightProfile(this.ultraLightState);
      } else {
        this.ultraLightTarget = null;
      }
      this.reflectionUpdateIntervalFrames = this.isMobile ? 36 : 24;
      this.ultraLightState = null;
      if (this.ultraRenderState) {
        this.setMaterialQuality(this.ultraRenderState.materialQuality);
        this.setReflectionsEnabled(this.ultraRenderState.reflectionsEnabled);
        this.rendererManager.renderer.toneMappingExposure = this.ultraRenderState.toneMappingExposure;
        this.ultraRenderState = null;
      }
      this.rendererManager.renderer.setPixelRatio(this.defaultPixelRatio);
      this.applyUltraMaterialProfile(false, false);
    }

    this.updateCanvasSize();
  }

  setUltraPerformanceModeOptions(options: UltraPerformanceModeOptions): void {
    const nextMode =
      options.mode === "flat2" || options.mode === "aggressive" || options.mode === "balanced"
        ? options.mode
        : "balanced";
    this.ultraPerformanceModeOptions = {
      enabled: Boolean(options.enabled),
      mode: nextMode,
    };
    if (this.ultraPerformanceMode !== this.ultraPerformanceModeOptions.enabled) {
      this.setUltraPerformanceMode(this.ultraPerformanceModeOptions.enabled);
      return;
    }
    if (this.ultraPerformanceMode) {
      this.setUltraPerformanceMode(false);
      this.setUltraPerformanceMode(true);
    }
  }

  getUltraPerformanceModeOptions(): UltraPerformanceModeOptions {
    return { ...this.ultraPerformanceModeOptions };
  }

  private applyUltraMaterialProfile(flat2Active: boolean, aggressive: boolean): void {
    this.sceneManager.root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        if (!this.ultraMaterialState.has(material.uuid)) {
          this.ultraMaterialState.set(material.uuid, {
            roughness: material.roughness,
            metalness: material.metalness,
            envMapIntensity: material.envMapIntensity,
            flatShading: material.flatShading,
          });
        }
        const original = this.ultraMaterialState.get(material.uuid);
        if (!original) return;
        if (!flat2Active) {
          material.roughness = original.roughness;
          material.metalness = original.metalness;
          material.envMapIntensity = original.envMapIntensity;
          material.flatShading = original.flatShading;
          material.needsUpdate = true;
          return;
        }
        material.roughness = aggressive ? 1 : 0.95;
        material.metalness = 0;
        material.envMapIntensity = aggressive ? 0 : 0.06;
        material.flatShading = true;
        material.needsUpdate = true;
      });
    });
    if (!flat2Active) {
      this.ultraMaterialState.clear();
    }
  }

  private lerpLightsToTarget(): void {
    if (!this.ultraLightTarget) return;
    const t = this.LIGHT_LERP_FACTOR;
    const key = this.lights.keyLight.intensity;
    const fill = this.lights.fillLight.intensity;
    const ambient = this.lights.ambient.intensity;
    const rim = this.lights.rimLight.intensity;
    const radius = this.lights.keyLight.shadow.radius;

    this.lights.keyLight.intensity = key + (this.ultraLightTarget.key - key) * t;
    this.lights.fillLight.intensity = fill + (this.ultraLightTarget.fill - fill) * t;
    this.lights.ambient.intensity = ambient + (this.ultraLightTarget.ambient - ambient) * t;
    this.lights.rimLight.intensity = rim + (this.ultraLightTarget.rim - rim) * t;
    this.lights.keyLight.shadow.radius = radius + (this.ultraLightTarget.shadowRadius - radius) * t;

    const snap = 0.002;
    if (
      Math.abs(this.lights.keyLight.intensity - this.ultraLightTarget.key) < snap &&
      Math.abs(this.lights.fillLight.intensity - this.ultraLightTarget.fill) < snap &&
      Math.abs(this.lights.ambient.intensity - this.ultraLightTarget.ambient) < snap &&
      Math.abs(this.lights.rimLight.intensity - this.ultraLightTarget.rim) < snap
    ) {
      this.lights.keyLight.intensity = this.ultraLightTarget.key;
      this.lights.fillLight.intensity = this.ultraLightTarget.fill;
      this.lights.ambient.intensity = this.ultraLightTarget.ambient;
      this.lights.rimLight.intensity = this.ultraLightTarget.rim;
      this.lights.keyLight.castShadow = this.ultraLightTarget.castShadow;
      this.lights.keyLight.shadow.radius = this.ultraLightTarget.shadowRadius;
      this.ultraLightTarget = null;
    } else {
      this.lights.keyLight.castShadow = this.ultraLightTarget.castShadow;
    }
  }

  getUltraPerformanceMode(): boolean {
    return this.ultraPerformanceMode;
  }

  setLockEnabled(enabled: boolean): void {
    this.lockEnabled = enabled;
    if (!enabled) {
      this.boxes.forEach((entry) => this.clearSnapState(entry.mesh));
    }
    this.updateBoxesIntersectingWalls();
    this.refreshOutlineTarget();
  }

  getLockEnabled(): boolean {
    return this.lockEnabled;
  }

  getCombinedBoundingBox(): { min: THREE.Vector3; max: THREE.Vector3; size: THREE.Vector3; width: number; height: number; depth: number } | null {
    if (this.boxes.size === 0) return null;
    const roots = Array.from(this.boxes.values()).map((e) => e.mesh);
    runWithAllLayoutBoundsProxiesVisible(roots, () => {
      this._boundingBox.makeEmpty();
      this.boxes.forEach((entry) => this._boundingBox.expandByObject(entry.mesh));
    });
    const min = this._boundingBox.min.clone();
    const max = this._boundingBox.max.clone();
    this._boundingBox.getSize(this._size);
    return {
      min,
      max,
      size: this._size.clone(),
      width: this._size.x,
      height: this._size.y,
      depth: this._size.z,
    };
  }

  /**
   * Retorna IDs codificados (box:, remate:, rodape:) dos objetos cujo bbox projetado intersecta o retângulo em px.
   */
  getSelectionIdsInScreenRect(
    rect: { left: number; top: number; right: number; bottom: number },
    canvas: HTMLCanvasElement
  ): string[] {
    const canvasRect = canvas.getBoundingClientRect();
    const selectionRect = {
      left: Math.min(rect.left, rect.right),
      top: Math.min(rect.top, rect.bottom),
      right: Math.max(rect.left, rect.right),
      bottom: Math.max(rect.top, rect.bottom),
    };
    const camera = this.cameraManager.camera;
    const ids: string[] = [];

    this.boxes.forEach((entry, boxId) => {
      entry.mesh.updateMatrixWorld(true);
      if (isObjectInScreenRect(entry.mesh, selectionRect, camera, canvasRect)) {
        ids.push(`box:${boxId}`);
      }
    });

    const rematePieces = this.remateVisualBridge?.listRematePieces() ?? [];
    for (const piece of rematePieces) {
      const mesh = this.remateVisualizer.getMeshByRemateId(piece.id);
      if (!mesh) continue;
      mesh.updateMatrixWorld(true);
      if (isObjectInScreenRect(mesh, selectionRect, camera, canvasRect)) {
        ids.push(`remate:${piece.id}`);
      }
    }

    const rodapes = (this.rodapeVisualBridge?.listBoxRodapeConfigs() ?? []).flatMap((c) => c.rodapes);
    for (const rodape of rodapes) {
      const mesh = this.rodapeVisualizer.getMeshByRodapeId(rodape.id);
      if (!mesh) continue;
      mesh.updateMatrixWorld(true);
      if (isObjectInScreenRect(mesh, selectionRect, camera, canvasRect)) {
        ids.push(`rodape:${rodape.id}`);
      }
    }

    return ids;
  }

  setMultiSelectionOutlines(encodedIds: string[]): void {
    this.multiSelectionOutline?.sync(encodedIds, (encoded) => this.resolveMultiOutlineTarget(encoded));
  }

  setGroupTransformMembers(encodedIds: string[]): void {
    this.viewerState.setGroupTransformMemberIds(encodedIds);
    this.viewerTools.updateTransformControlsAttachment();
  }

  getGroupTransformMembers(): string[] {
    return this.viewerState.getGroupTransformMemberIds();
  }

  clearGroupTransformMembers(): void {
    this.viewerState.clearGroupTransformMemberIds();
    this.viewerTools.updateTransformControlsAttachment();
  }

  setOnTransformDragStart(callback: (() => void) | null): void {
    this.onTransformDragStart = callback;
  }

  setOnTransformDragEnd(callback: (() => void) | null): void {
    this.onTransformDragEnd = callback;
  }

  syncMeasurementAnchors(
    anchors: MeasurementAnchorEntry[],
    selectedMesh?: THREE.Object3D | null
  ): void {
    const pos = selectedMesh ? new THREE.Vector3() : null;
    selectedMesh?.getWorldPosition(pos!);
    this.measurementAnchorsVisualizer?.sync(anchors, pos);
  }

  addMeasurementAnchorAtPointer(event: { clientX: number; clientY: number }): MeasurementAnchorEntry | null {
    const hit = this.raycastSystem.getPointerWorldHit(event);
    if (!hit) return null;
    return {
      id: `anchor-${Date.now()}`,
      position: { x: hit.x, y: hit.y, z: hit.z },
      createdAt: Date.now(),
    };
  }

  applySmartSnapForGroup(_pointerPosition?: { x: number; y: number; z: number }): boolean {
    return false;
  }

  resolveMemberMesh(encoded: string): THREE.Object3D | null {
    return this.resolveMultiOutlineTarget(encoded)?.mesh ?? null;
  }

  applyGroupPivotTransform(): void {
    this.groupGizmo?.applyPivotTransform();
  }

  notifyGroupTransform(): void {
    if (!this.groupGizmo?.isActive()) return;
    for (const member of this.groupGizmo.getMembers()) {
      const decoded = decodeSelectionId(member.encodedId);
      if (!decoded) continue;
      if (decoded.kind === "box") {
        const { x, y, z } = member.mesh.position;
        const r = member.mesh.rotation;
        this.onBoxTransform?.(decoded.id, { x, y, z }, { x: r.x, y: r.y, z: r.z });
      } else if (decoded.kind === "remate") {
        this.viewerState.setSelectedRemate(decoded.id);
        this.notifyRemateTransform();
      } else if (decoded.kind === "rodape") {
        this.viewerState.setSelectedRodape(decoded.id);
        this.notifyRodapeTransform();
      }
    }
    historyManager.recordEvent("group.transform", "Transformar grupo");
  }

  clampGroupTransform(): void {
    if (!this.groupGizmo?.isActive()) return;
    if (this.viewerState.getCurrentTool() !== "translate") return;
    if (!this.viewerState.getTransformControlsDragging()) return;
  }

  isPointerOnSelectableObject(event: { clientX: number; clientY: number }): boolean {
    return this.raycastSystem.isPointerOnSelectableObject(event);
  }

  setOnMultiSelectToggle(callback: ((_encodedId: string) => void) | null): void {
    this.onMultiSelectToggle = callback;
  }

  getPointerSelectionEncodedId(event: { clientX: number; clientY: number }): string | null {
    const hit = this.getContextMenuLayerHit(event);
    const fromHit = encodeSelectionIdFromLayerHit(hit);
    if (fromHit && !fromHit.startsWith("box:")) return fromHit;
    const remateId = this.getRemateIdAtPointer(event);
    if (remateId) return remateSelectionId(remateId);
    const rodapeId = this.getRodapeIdAtPointer(event);
    if (rodapeId) return rodapeSelectionId(rodapeId);
    return null;
  }

  private resolveMultiOutlineTarget(encoded: string): MultiOutlineTarget | null {
    const decoded = decodeSelectionId(encoded);
    if (!decoded) return null;

    if (decoded.kind === "box") {
      const entry = this.boxes.get(decoded.id);
      if (!entry) return null;
      return {
        mesh: entry.mesh,
        layoutDims: {
          w: Math.max(0.001, entry.width),
          h: Math.max(0.001, entry.height),
          d: Math.max(0.001, entry.carcassDepth ?? entry.depth),
        },
      };
    }

    if (decoded.kind === "remate") {
      const mesh = this.remateVisualizer.getMeshByRemateId(decoded.id);
      return mesh ? { mesh } : null;
    }

    if (decoded.kind === "rodape") {
      const mesh = this.rodapeVisualizer.getMeshByRodapeId(decoded.id);
      return mesh ? { mesh } : null;
    }

    if (decoded.kind === "door") {
      for (const entry of this.boxes.values()) {
        const doorGroup = entry.mesh.children.find((c) => c.name === `door-layer-${decoded.id}`);
        if (doorGroup) return { mesh: doorGroup };
      }
      return null;
    }

    if (decoded.kind === "drawer") {
      for (const entry of this.boxes.values()) {
        const drawerGroup = entry.mesh.children.find((c) => c.name === `drawer-layer-${decoded.id}`);
        if (drawerGroup) return { mesh: drawerGroup };
      }
      return null;
    }

    return null;
  }

  /**
   * Maior X (borda direita) das caixas em metros.
   * Usa bbox real quando disponível; quando bbox ainda não carregado (ex.: Group vazio) usa position + width/2.
   * Sem caixas retorna -0.1.
   */
  getRightmostX(): number {
    if (this.boxes.size === 0) return -0.1;
    let maxX = -Infinity;
    this.boxes.forEach((entry) => {
      entry.mesh.updateMatrixWorld(true);
      setBox3FromObjectExcludingLayoutProxy(this._boundingBox, entry.mesh);
      this._boundingBox.getSize(this._size);
      const rightEdge =
        this._size.x < 0.001 || !Number.isFinite(this._boundingBox.max.x)
          ? entry.mesh.position.x + entry.width / 2
          : this._boundingBox.max.x;
      if (rightEdge > maxX) maxX = rightEdge;
    });
    return Number.isFinite(maxX) ? maxX : -0.1;
  }

  /** Dimensões da caixa selecionada (L, A, P). Usado no modo Selecionar para overlay. */
  getSelectedBoxDimensions(): { width: number; height: number; depth: number } | null {
    if (!this.viewerState.getSelectedBox()) return null;
    const entry = this.boxes.get(this.viewerState.getSelectedBox());
    if (!entry) return null;
    return { width: entry.width, height: entry.height, depth: entry.depth };
  }

  setDimensionsOverlayVisible(visible: boolean): void {
    this.dimensionsOverlayVisible = visible;
    if (visible && !this.dimensionsOverlayHandle) {
      this.dimensionsOverlayHandle = createDimensionsOverlay(this.sceneManager.scene);
    }
    if (this.dimensionsOverlayHandle) {
      this.dimensionsOverlayHandle.group.visible = visible;
    }
    if (!visible) {
      this.updateDimensionsOverlay();
    }
  }

  getDimensionsOverlayVisible(): boolean {
    return this.dimensionsOverlayVisible;
  }

  toggleDimensionsOverlay(): boolean {
    const next = !this.dimensionsOverlayVisible;
    this.setDimensionsOverlayVisible(next);
    return next;
  }

  /**
   * Objetos atualmente selecionáveis para alinhamento (primeiro = referência).
   * `multiBoxIds` — ordem da multi-seleção de caixas (Workspace).
   */
  getSelectedObjects(multiBoxIds?: string[]): AlignableObject[] {
    const result: AlignableObject[] = [];
    const seen = new Set<string>();

    const push = (obj: AlignableObject) => {
      const key = `${obj.kind}:${obj.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push(obj);
    };

    const remateId = this.viewerState.getSelectedRemate();
    if (remateId) {
      const mesh = this.remateVisualizer.getMeshByRemateId(remateId);
      if (mesh) push({ kind: "remate", id: remateId, mesh });
    }

    const rodapeId = this.viewerState.getSelectedRodape();
    if (rodapeId) {
      const mesh = this.rodapeVisualizer.getMeshByRodapeId(rodapeId);
      if (mesh) push({ kind: "rodape", id: rodapeId, mesh });
    }

    const boxIds =
      multiBoxIds && multiBoxIds.length > 0
        ? multiBoxIds
        : this.viewerState.getSelectedBox()
          ? [this.viewerState.getSelectedBox()!]
          : [];

    for (const id of boxIds) {
      const entry = this.boxes.get(id);
      if (!entry) continue;
      push({
        kind: "box",
        id,
        mesh: entry.mesh,
        locked: entry.locked === true,
      });
    }

    return result;
  }

  /** Alinha objetos selecionados (referência = primeiro). */
  align(type: AlignmentType, multiBoxIds?: string[]): boolean {
    const selected = this.getSelectedObjects(multiBoxIds);
    const applied = applyAlignment(type, selected);
    if (!applied) return false;

    for (let i = 1; i < selected.length; i += 1) {
      this.notifyAlignableTransform(selected[i]!);
    }
    this.refreshTransformControlsAttachment?.();
    return true;
  }

  private notifyAlignableTransform(obj: AlignableObject): void {
    if (obj.kind === "box") {
      const entry = this.boxes.get(obj.id);
      if (!entry) return;
      const { x, y, z } = entry.mesh.position;
      const r = entry.mesh.rotation;
      this.onBoxTransform?.(obj.id, { x, y, z }, { x: r.x, y: r.y, z: r.z });
      return;
    }
    if (obj.kind === "remate") {
      const prev = this.viewerState.getSelectedRemate();
      if (prev !== obj.id) this.viewerState.setSelectedRemate(obj.id);
      this.notifyRemateTransform();
      if (prev !== obj.id) this.viewerState.setSelectedRemate(prev);
      return;
    }
    if (obj.kind === "rodape") {
      const prev = this.viewerState.getSelectedRodape();
      if (prev !== obj.id) this.viewerState.setSelectedRodape(obj.id);
      this.notifyRodapeTransform();
      if (prev !== obj.id) this.viewerState.setSelectedRodape(prev);
    }
  }

  private collectBoxBoundsForDimensions(): BoxBoundsInput[] {
    const inputs: BoxBoundsInput[] = [];
    this.boxes.forEach((entry, id) => {
      if (!entry.mesh.visible) return;
      entry.mesh.updateMatrixWorld(true);
      setBox3FromObjectExcludingLayoutProxy(this._boundingBox, entry.mesh);
      if (!Number.isFinite(this._boundingBox.min.x)) return;
      inputs.push({
        id,
        min: this._boundingBox.min.clone(),
        max: this._boundingBox.max.clone(),
        cabinetType: entry.cabinetType,
      });
    });
    return inputs;
  }

  setInternalMeasurementMode(enabled: boolean): void {
    this.measurementOverlay.setInternalMeasurementMode(enabled);
  }

  getInternalMeasurementMode(): boolean {
    return this.measurementOverlay.getInternalMeasurementMode();
  }

  /** Fase 5 Parte A — picking interno (face / aresta / ponto). */
  getInternalSelectionHit(event: { clientX: number; clientY: number }): InternalSelectionHit | null {
    return this.raycastSystem.getInternalSelectionHit(event);
  }

  getInternalSelection(): InternalSelectionState | null {
    return cloneInternalSelectionState(this.viewerState.getInternalSelection());
  }

  setInternalSelection(selection: InternalSelectionState | null): void {
    const prev = this.viewerState.getInternalSelection();
    const next = selection ? cloneInternalSelectionState(selection) : null;
    const same =
      prev?.type === next?.type &&
      prev?.boxId === next?.boxId &&
      prev?.faceId === next?.faceId &&
      prev?.edgeId === next?.edgeId &&
      prev?.pointId === next?.pointId;
    if (same) return;

    this.viewerState.setInternalSelection(next);
    this.internalSelectionOutline?.sync(next, (boxId) => this.boxes.get(boxId)?.mesh ?? null);
    this.syncInternalRulerOverlay();

    if (!next) return;
    if (next.type === "internal-face") this.onInternalSurfaceSelected?.(next);
    else if (next.type === "internal-edge") this.onInternalEdgeSelected?.(next);
    else if (next.type === "internal-point") this.onInternalPointSelected?.(next);
  }

  setInternalSelectionEnabled(enabled: boolean): void {
    this.viewerState.setInternalSelectionEnabled(enabled);
    if (!enabled) {
      this.setInternalSelection(null);
      this.internalRulerOverlay?.sync(null, null, null);
      return;
    }
    this.syncInternalRulerOverlay();
  }

  enableInternalRuler(): void {
    this.internalRulerEngine.disable();
    this.setInternalSelectionEnabled(true);
  }

  disableInternalRuler(): void {
    this.setInternalSelectionEnabled(false);
  }

  getInternalMeasurements(boxId?: string): InternalCavityMeasurements | null {
    const resolvedId =
      boxId ??
      this.viewerState.getInternalSelection()?.boxId ??
      this.viewerState.getSelectedBox() ??
      null;
    if (!resolvedId) return null;
    const entry = this.boxes.get(resolvedId);
    if (!entry) return null;
    return computeInternalCavityMeasurements(resolvedId, entry);
  }

  isInternalRulerOverlayActive(): boolean {
    return this.internalRulerOverlay?.isActive() === true;
  }

  private syncInternalRulerOverlay(): void {
    if (!this.internalRulerOverlay) return;
    if (!this.viewerState.getInternalSelectionEnabled()) {
      this.internalRulerOverlay.sync(null, null, null);
      return;
    }
    const selection = this.viewerState.getInternalSelection();
    if (!selection) {
      this.internalRulerOverlay.sync(null, null, null);
      return;
    }
    const entry = this.boxes.get(selection.boxId);
    if (!entry) {
      this.internalRulerOverlay.sync(null, null, null);
      return;
    }
    const bounds = computeBoxCavityBoundsLocal(entry);
    const measurements = computeInternalCavityMeasurements(selection.boxId, entry);
    this.internalRulerOverlay.sync(selection, measurements, bounds);
  }

  private refreshInternalRulerOverlay(): void {
    if (!this.viewerState.getInternalSelectionEnabled()) return;
    this.internalRulerOverlay?.refresh();
  }

  getInternalSelectionEnabled(): boolean {
    return this.viewerState.getInternalSelectionEnabled();
  }

  setOnInternalSurfaceSelected(callback: ((_hit: InternalSelectionState) => void) | null): void {
    this.onInternalSurfaceSelected = callback;
  }

  setOnInternalEdgeSelected(callback: ((_hit: InternalSelectionState) => void) | null): void {
    this.onInternalEdgeSelected = callback;
  }

  setOnInternalPointSelected(callback: ((_hit: InternalSelectionState) => void) | null): void {
    this.onInternalPointSelected = callback;
  }

  /**
   * Posição em pixels (relativa ao container do viewer) do topo-centro da caixa selecionada.
   * Usado para posicionar o overlay de texto (dimensões + rotação) acima da caixa.
   */
  getSelectedBoxScreenPosition(): { x: number; y: number } | null {
    if (!this.viewerState.getSelectedBox() || !this.container) return null;
    const entry = this.boxes.get(this.viewerState.getSelectedBox());
    if (!entry) return null;
    entry.mesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(this._boundingBox, entry.mesh);
    const min = this._boundingBox.min;
    const max = this._boundingBox.max;
    const topCenter = new THREE.Vector3(
      (min.x + max.x) * 0.5,
      max.y,
      (min.z + max.z) * 0.5
    );
    return this.projectWorldToScreen(topCenter);
  }

  /**
   * FASE 6 — Segmento no eixo de profundidade local (Z) da caixa selecionada, em espaço mundo.
   * Apenas leitura para overlays 2D (projectWorldToScreen); não altera geometria.
   */
  getSelectedBoxDepthAxisWorldSegment(
    lengthMeters: number
  ): { start: THREE.Vector3; end: THREE.Vector3 } | null {
    const id = this.viewerState.getSelectedBox();
    if (!id) return null;
    const entry = this.boxes.get(id);
    if (!entry) return null;
    const len = Number(lengthMeters);
    if (!Number.isFinite(len) || len <= 0) return null;
    const h = len * 0.5;
    entry.mesh.updateMatrixWorld(true);
    const a = new THREE.Vector3(0, 0, -h);
    const b = new THREE.Vector3(0, 0, h);
    a.applyMatrix4(entry.mesh.matrixWorld);
    b.applyMatrix4(entry.mesh.matrixWorld);
    return { start: a, end: b };
  }

  /** FASE 6 — Raycast no canvas (mesma lógica que o seletor de caixas). */
  getBoxIdAtPointerPublic(event: { clientX: number; clientY: number }): string | null {
    return this.getBoxIdAtPointer(event);
  }

  /**
   * Projeta um ponto 3D (mundial) em coordenadas de ecrã (pixels relativos ao container do viewer).
   * Retorna null se o ponto estiver atrás da câmera.
   */
  projectWorldToScreen(worldPoint: THREE.Vector3): { x: number; y: number } | null {
    if (!this.container) return null;
    const p = worldPoint.clone().project(this.cameraManager.camera);
    if (p.z > 1) return null;
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    const x = (p.x + 1) * 0.5 * w;
    const y = (1 - p.y) * 0.5 * h;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }

  private updateDimensionsOverlay(): void {
    if (!this.dimensionsOverlayVisible || !this.dimensionsOverlayHandle) return;
    const dimensions = computeUnifiedBoxDimensions(this.collectBoxBoundsForDimensions());
    const viewportH = this.container?.clientHeight ?? 720;
    const viewportW = this.container?.clientWidth ?? 1280;
    updateDimensionsOverlay(
      this.dimensionsOverlayHandle,
      dimensions,
      this.cameraManager.camera,
      viewportH,
      viewportW,
      (world) => this.projectWorldToScreen(world)
    );
  }

  getDimensionsOverlayData(): DimensionOverlayDataEntry[] {
    if (!this.dimensionsOverlayHandle) return [];
    return getDimensionsOverlayData(this.dimensionsOverlayHandle);
  }

  getPrintReadyDimensions(): PrintReadyDimensions {
    if (!this.dimensionsOverlayHandle) {
      return { entries: [], generatedAt: Date.now() };
    }
    return getPrintReadyDimensions(this.dimensionsOverlayHandle);
  }

  private initShowcaseComposer(): void {
    const renderer = this.rendererManager.renderer;
    const scene = this.sceneManager.scene;
    const camera = this.cameraManager.camera;
    const w = this.container?.clientWidth ?? 1;
    const h = this.container?.clientHeight ?? 1;

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloomPass = new UnrealBloomPass(new Vector2(w, h), 0.18, 0.35, 0.9);
    this.composer.addPass(this.bloomPass);
    this.bokehPass = new BokehPass(scene, camera, {
      focus: 5,
      aperture: 0.02,
      maxblur: 0.004,
    });
    this.composer.addPass(this.bokehPass);
    this.updateShowcaseComposerSize();
  }

  private updateShowcaseComposerSize(): void {
    if (!this.composer || !this.container) return;
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (this.bloomPass) {
      this.bloomPass.resolution.set(w, h);
    }
  }

  private initMainComposer(): void {
    if (this.mainComposer || !this.container) return;
    const renderer = this.rendererManager.renderer;
    const scene = this.sceneManager.scene;
    const camera = this.cameraManager.camera;
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.mainComposer = new EffectComposer(renderer);
    this.mainComposer.addPass(new RenderPass(scene, camera));
    this.mainBloomPass = new UnrealBloomPass(new Vector2(w, h), 0.05, 0.4, 0.85);
    this.mainComposer.addPass(this.mainBloomPass);
    this.mainComposer.setSize(w, h);
    this.mainComposer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  private updateMainComposerSize(): void {
    if (!this.mainComposer || !this.container) return;
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.mainComposer.setSize(w, h);
    this.mainComposer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (this.mainBloomPass) {
      this.mainBloomPass.resolution.set(w, h);
    }
  }

  private disposeComposer(): void {
    if (!this.composer) return;
    if ("renderTarget1" in this.composer && "renderTarget2" in this.composer) {
      (this.composer.renderTarget1 as THREE.WebGLRenderTarget | undefined)?.dispose?.();
      (this.composer.renderTarget2 as THREE.WebGLRenderTarget | undefined)?.dispose?.();
    }
    this.composer = null;
    this.bloomPass = null;
    this.bokehPass = null;
  }

  private disposeMainComposer(): void {
    if (!this.mainComposer) return;
    if ("renderTarget1" in this.mainComposer && "renderTarget2" in this.mainComposer) {
      (this.mainComposer.renderTarget1 as THREE.WebGLRenderTarget | undefined)?.dispose?.();
      (this.mainComposer.renderTarget2 as THREE.WebGLRenderTarget | undefined)?.dispose?.();
    }
    this.mainComposer = null;
    this.mainBloomPass = null;
  }

  loadMaterialSet(materialConfig?: MaterialSet) {
    this.materialSet = mergeMaterialSet(this.materialSet, materialConfig);
  }

  updateBoxMaterial(id: string, materialName: string) {
    const entry = this.boxes.get(id);
    if (!entry) return;
    const nextMaterial = this.loadMaterial(materialName);
    if (!nextMaterial) return;

    entry.materialName = materialName;

    // Atualizar material apenas dos painéis da caixa (left, right, top, bottom, back) e prateleiras.
    // Nunca aplicar à porta (userData.doorLayerId) nem à frente de gaveta (drawerPart === "front") para evitar compartilhamento.
    const isDoorOrDrawerFront = (node: THREE.Object3D): boolean => {
      const ud = (node as THREE.Mesh & { userData: { doorLayerId?: string; drawerPart?: string } }).userData;
      return ud?.doorLayerId != null || ud?.drawerPart === "front";
    };

    if (entry.mesh instanceof THREE.Group) {
      entry.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (this.isKitchenFeetNode(child)) return;
          if (isDoorOrDrawerFront(child)) return;
          child.material = nextMaterial.material;
        }
      });
    } else if (entry.mesh instanceof THREE.Mesh) {
      if (!this.isKitchenFeetNode(entry.mesh)) {
        entry.mesh.material = nextMaterial.material;
      }
    }

    if (this.viewerState.getSelectedBox() === id) {
      this.refreshOutlineTarget();
    }
    if (entry.material) {
      entry.material.material.dispose();
      entry.material.textures.forEach((texture) => texture.dispose());
    }
    entry.material = nextMaterial;
    if (this.viewerState.getSelectedBox() === id) {
      this.refreshOutlineTarget();
    }
  }

  private isKitchenFeetNode(node: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = node;
    while (current) {
      if (current.userData?.isKitchenFeet === true || current.name === "kitchen-feet-group") {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /** Reaplica materiais a todas as caixas (ao trocar modo performance/showcase/realistic). */
  reapplyAllBoxMaterials(): void {
    this.boxes.forEach((entry, id) => {
      const name = entry.materialName ?? this.defaultMaterialName;
      this.updateBoxMaterial(id, name);
    });
    this.syncRemateVisuals();
    this.syncRodapeVisuals();
  }

  /**
   * Aplica um material a uma porta específica (por boxId e doorLayerId).
   * Localiza o grupo door-layer-{doorLayerId}, extrai DoorSpec, remove a porta antiga, cria nova com createDoorObject
   * preservando doorHoles e aplica applyPanelIdsToBox para manter userData.boxId/doorLayerId para seleção e outline.
   */
  updateDoorMaterial(boxId: string, doorLayerId: string, materialName: string): void {
    if (import.meta.env.DEV) {
      devLogger.debug("[DOOR-MAT] ViewerCore.updateDoorMaterial", { boxId, doorLayerId, materialName });
    }
    const entry = this.boxes.get(boxId);
    if (!entry) return;
    const nextMaterial = this.loadMaterial(materialName);
    if (!nextMaterial) return;
    const boxGroup = entry.mesh;
    if (!(boxGroup instanceof THREE.Group)) return;

    const doorLayerNames = boxGroup.children
      .filter((c) => c.name.startsWith("door-layer-"))
      .map((c) => c.name);
    const expectedName = `door-layer-${doorLayerId}`;
    const oldDoorGroup = boxGroup.children.find(
      (c) => c.name === expectedName
    ) as THREE.Group | undefined;

    if (import.meta.env.DEV) {
      devLogger.debug("[updateDoorMaterial] diagnóstico", {
        boxId,
        doorLayerIdRecebido: doorLayerId,
        gruposDoorLayerNoBox: doorLayerNames,
        nomeEsperado: expectedName,
        encontrouGrupo: Boolean(oldDoorGroup),
        meshUuidAntes: oldDoorGroup
          ? (() => {
              let u: string | null = null;
              oldDoorGroup.traverse((n) => {
                if (n instanceof THREE.Mesh) u = n.uuid;
              });
              return u;
            })()
          : null,
      });
    }

    if (!oldDoorGroup) return;
    const spec = getDoorSpecFromGroup(oldDoorGroup);
    if (!spec) return;
    let doorHoles: TechnicalDrillHole[] | undefined;
    oldDoorGroup.traverse((node) => {
      if (node instanceof THREE.Mesh && this.appliedRotationByMeshUuid.has(node.uuid)) {
        this.appliedRotationByMeshUuid.delete(node.uuid);
      }
      const ud = (node as THREE.Object3D & { userData: { doorHolesEffective?: TechnicalDrillHole[] } }).userData;
      if (Array.isArray(ud?.doorHolesEffective)) doorHoles = ud.doorHolesEffective;
    });
    boxGroup.remove(oldDoorGroup);
    const doorMat = (nextMaterial.material as THREE.Material).clone();
    const newDoor = createDoorObject(
      spec,
      doorMat,
      filterTechnicalDrillHolesForViewerMesh(doorHoles)
    );
    boxGroup.add(newDoor);
    this.applyViewerDrillHoleSceneRules(newDoor);
    if (import.meta.env.DEV) {
      devLogger.debug("[DOOR-MAT] Material aplicado independentemente:", {
        id: doorLayerId,
        material: (doorMat as THREE.Material).uuid,
        textura: materialName,
      });
    }
    this.applyPanelIdsToBox(boxGroup, boxId, undefined, entry.materialName ?? this.defaultMaterialName);
    this.applyPanelVisibilityForObject(boxGroup);
    if (import.meta.env.DEV) {
      let newMeshUuid: string | null = null;
      newDoor.traverse((n) => {
        if (n instanceof THREE.Mesh) newMeshUuid = n.uuid;
      });
      devLogger.debug("[updateDoorMaterial] porta reconstruída", {
        boxId,
        doorLayerId,
        newMeshUuid,
        groupName: newDoor.name,
        groupUserDataDoorLayerId: (newDoor as THREE.Object3D & { userData: { doorLayerId?: string } }).userData?.doorLayerId,
      });
    }
    if (this.viewerState.getSelectedBox() === boxId) this.refreshOutlineTarget();
  }

  /**
   * Aplica um material à frente de uma gaveta (por boxId e drawerLayerId).
   * Usado quando o utilizador altera o material da gaveta pelo menu de contexto.
   */
  updateDrawerMaterial(boxId: string, drawerLayerId: string, materialName: string): void {
    const entry = this.boxes.get(boxId);
    if (!entry) return;
    const nextMaterial = this.loadMaterial(materialName);
    if (!nextMaterial) return;
    const drawerMat = (nextMaterial.material as THREE.Material).clone();
    entry.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const ud = (child as THREE.Mesh & { userData: { drawerLayerId?: string; drawerPart?: string } }).userData;
        if (ud?.drawerLayerId === drawerLayerId && ud?.drawerPart === "front")
          (child as THREE.Mesh).material = drawerMat;
      }
    });
    if (this.viewerState.getSelectedBox() === boxId) this.refreshOutlineTarget();
  }

  /**
   * Define o modo de materiais (performance/showcase/realistic) e reaplica a todas as caixas.
   */
  setMaterialMode(mode: MaterialMode): void {
    materialEngineSetMaterialMode(mode);
    this.reapplyAllBoxMaterials();
  }

  getMaterialMode(): MaterialMode {
    return getMaterialMode();
  }

  /**
   * Ponte opcional para {@link applyVisualMaterialToMesh} em materialLibrary v2 (LEGACY / dados CRUD).
   * O fluxo principal de materiais das caixas no 3D é `updateBoxMaterial` → MaterialEngine.loadMaterial
   * (presets viewer + modo performance/showcase/realistic). Não misturar os dois no mesmo mesh sem necessidade.
   */
  applyVisualMaterialToMesh(mesh: THREE.Mesh, visualMaterial: VisualMaterial): void {
    applyVisualMaterialToMeshV2(mesh, visualMaterial);
  }

  updateBoxDimensions(
    id: string,
    dimensions: { width: number; height: number; depth: number }
  ): boolean {
    return this.updateBox(id, dimensions);
  }

  setBoxPosition(id: string, position: { x: number; y: number; z: number }): boolean {
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      return false;
    }
    return this.updateBox(id, { position });
  }

  private incrementRotationDiagnostics(uuid: string, key: "applied" | "duplicateSkipped"): void {
    if (!import.meta.env.DEV) return;
    const current = this.rotationDiagnosticsByUuid.get(uuid) ?? { applied: 0, duplicateSkipped: 0 };
    current[key] += 1;
    this.rotationDiagnosticsByUuid.set(uuid, current);
  }

  private logRotationDiagnosticsIfNeeded(): void {
    if (!import.meta.env.DEV) return;
    const now = performance.now();
    if (now - this.rotationDiagnosticsLastLogTs < 2000) return;
    this.rotationDiagnosticsLastLogTs = now;

    const rows = Array.from(this.rotationDiagnosticsByUuid.entries()).map(([uuid, stats]) => ({
      uuid,
      rot_applied: stats.applied,
      rot_duplicate_skipped: stats.duplicateSkipped,
    }));
    if (rows.length === 0) return;
    console.groupCollapsed("[Viewer Rotation Diagnostics] by mesh.uuid");
    console.table(rows);
    console.groupEnd();
  }

  private applyRotationIfNeeded(
    mesh: THREE.Object3D | null | undefined,
    rotation?: { x?: number; y?: number; z?: number }
  ): void {
    if (!mesh || !rotation) return;
    let applied = false;
    if (rotation.x != null && Number.isFinite(rotation.x)) {
      mesh.rotation.x = rotation.x;
      applied = true;
    }
    if (rotation.y != null && Number.isFinite(rotation.y)) {
      const previous = this.appliedRotationByMeshUuid.get(mesh.uuid);
      if (previous == null || Math.abs(previous - rotation.y) >= 1e-6) {
        mesh.rotation.y = rotation.y;
        this.appliedRotationByMeshUuid.set(mesh.uuid, rotation.y);
        applied = true;
      }
    }
    if (rotation.z != null && Number.isFinite(rotation.z)) {
      mesh.rotation.z = rotation.z;
      applied = true;
    }
    if (applied) {
      mesh.updateMatrixWorld();
      this.incrementRotationDiagnostics(mesh.uuid, "applied");
      this.logRotationDiagnosticsIfNeeded();
    }
  }

  setCameraFrontView() {
    this.cameraManager.setPosition(0, 2.2, 6);
    this.updateCameraTarget();
  }

  private applyMousePresetToControls(): void {
    const controls = this.controls?.controls;
    if (!controls) return;
    const mapping = getMouseInputMapping(this.mouseInputPreset);
    applyMouseInputMappingToOrbitControls(controls, mapping);
  }

  /** Aplica o preset de botões do rato ao OrbitControls. Não bloqueia a órbita em nenhum modo (Selecionar, Mover, Rodar). */
  private applyTransformControlsMouseGuard(): void {
    const controls = this.controls?.controls;
    if (!controls) return;
    this.applyMousePresetToControls();
  }

  private logTransformDiagnostic(event: string, payload?: Record<string, unknown>): void {
    if (!this.transformDiagnosticsEnabled) return;
    const orbit = this.controls?.controls;
    const target = this.transformControls?.object ?? null;
    devLogger.debug(`[Viewer][TransformDiag] ${event}`, {
      mode: this.viewerState.getCurrentTool(),
      dragging: this.viewerState.getTransformControlsDragging(),
      selectedBoxId: this.viewerState.getSelectedBox(),
      orbitEnabled: orbit?.enabled ?? null,
      transformAttached: Boolean(target),
      targetUuid: target?.uuid ?? null,
      targetName: target?.name ?? null,
      targetMatrixAutoUpdate: target?.matrixAutoUpdate ?? null,
      targetPosition: target
        ? {
            x: Number(target.position.x.toFixed(4)),
            y: Number(target.position.y.toFixed(4)),
            z: Number(target.position.z.toFixed(4)),
          }
        : null,
      ...(payload ?? {}),
    });
  }

  private getTransformGizmoIntersections(event: { clientX: number; clientY: number }): number {
    return this.raycastSystem.getTransformGizmoIntersections(event);
  }

  setMousePreset(preset: ViewerMousePreset): void {
    this.mouseInputPreset = normalizeMouseInputPreset(preset);
    this.applyTransformControlsMouseGuard();
  }

  getMousePreset(): ViewerMousePreset {
    return this.mouseInputPreset;
  }

  private applyBackgroundMode(): void {
    const renderer = this.rendererManager.renderer;
    const mode = this.backgroundMode;
    const sceneBackgroundByMode: Record<ViewerBackgroundMode, string> = {
      studio: "#0f172a",
      white: "#ffffff",
      dark: "#020617",
      woodFloor: "#f8fafc",
    };
    const clearColor = sceneBackgroundByMode[mode];
    this.sceneManager.setBackground(clearColor);
    renderer.setClearColor(clearColor, 1);

    if (mode === "woodFloor") {
      this.sceneManager.setGroundAppearance({
        color: "#9a7452",
        roughness: 0.9,
        metalness: 0.02,
      });
    } else if (mode === "dark") {
      this.sceneManager.setGroundAppearance({
        color: "#1f2937",
        roughness: 0.92,
        metalness: 0,
      });
    } else if (mode === "white") {
      this.sceneManager.setGroundAppearance({
        color: "#e5e7eb",
        roughness: 0.92,
        metalness: 0,
      });
    } else {
      this.sceneManager.setGroundAppearance({
        color: "#d4dae2",
        roughness: 0.92,
        metalness: 0,
      });
    }

    const roomFloorAppearance = getRoomFloorOverlayAppearance(mode);
    const applyRoomFloorOverlayMaterial = (material: THREE.MeshStandardMaterial) => {
      material.color.set(roomFloorAppearance.color);
      material.roughness = roomFloorAppearance.roughness;
      material.metalness = roomFloorAppearance.metalness;
      material.opacity = roomFloorAppearance.opacity;
      material.transparent = roomFloorAppearance.opacity < 1;
      material.needsUpdate = true;
    };

    if (this.roomBoxFloor?.material instanceof THREE.MeshStandardMaterial) {
      applyRoomFloorOverlayMaterial(this.roomBoxFloor.material);
    }

    this.sceneManager.root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      if (node.userData?.isRoomFloor !== true) return;
      if (!(node.material instanceof THREE.MeshStandardMaterial)) return;
      applyRoomFloorOverlayMaterial(node.material);
    });

    if (this.roomBoxFloorOutline?.material instanceof THREE.LineBasicMaterial) {
      this.roomBoxFloorOutline.material.color.set(roomFloorAppearance.outlineColor);
      this.roomBoxFloorOutline.material.needsUpdate = true;
    }

    this.sceneManager.root.traverse((node) => {
      if (!(node instanceof THREE.LineLoop)) return;
      if (node.userData?.isRoomFloorOutline !== true) return;
      if (!(node.material instanceof THREE.LineBasicMaterial)) return;
      node.material.color.set(roomFloorAppearance.outlineColor);
      node.material.needsUpdate = true;
    });
    this.sceneManager.setMaterialQuality(this.materialQuality);
  }

  /** Orquestrador: quality → glossIntensity → matteMode.
   * Único ponto de reconciliação de brilho. Substitui applyMaterialQualityProfile. */
  private reapplyDisplayMaterials(): void {
    this.sceneManager.root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        const isPhysical = material instanceof THREE.MeshPhysicalMaterial;

        // Captura snapshot base pós-preset (uma única vez por material.uuid).
        if (!this.displayMaterialBaseByUuid.has(material.uuid)) {
          const snap: {
            roughness: number; metalness: number; envMapIntensity: number;
            map: THREE.Texture | null; clearcoat?: number; clearcoatRoughness?: number;
          } = {
            roughness: material.roughness,
            metalness: material.metalness,
            envMapIntensity: material.envMapIntensity,
            map: material.map,
          };
          if (isPhysical) {
            snap.clearcoat = (material as THREE.MeshPhysicalMaterial).clearcoat;
            snap.clearcoatRoughness = (material as THREE.MeshPhysicalMaterial).clearcoatRoughness;
          }
          this.displayMaterialBaseByUuid.set(material.uuid, snap);
        }
        const base = this.displayMaterialBaseByUuid.get(material.uuid);
        if (!base) return;

        // Passo 2: derivar quality a partir da base.
        let roughness = base.roughness;
        let metalness = base.metalness;
        let envMapIntensity = base.envMapIntensity;
        let clearcoat = base.clearcoat;
        let clearcoatRoughness = base.clearcoatRoughness;

        if (this.materialQuality === "lacquered") {
          roughness = Math.min(base.roughness, 0.18);
          metalness = Math.max(base.metalness, 0.1);
          envMapIntensity = Math.max(base.envMapIntensity, 1.1);
        } else if (this.materialQuality === "premium") {
          roughness = Math.max(0.24, base.roughness * 0.8);
          metalness = Math.max(0.04, base.metalness * 1.1);
          envMapIntensity = Math.max(base.envMapIntensity, 0.78);
        }
        // standard: valores da base preservados

        // Passo 3: aplicar glossIntensity (não afeta metalness; só env, roughness, clearcoat).
        if (!this.matteMode) {
          const t = this.glossIntensity;
          roughness = roughness + (1 - t) * (1 - roughness);
          envMapIntensity = envMapIntensity * t;
          if (clearcoat !== undefined) {
            clearcoat = clearcoat * t;
            if (clearcoatRoughness !== undefined) {
              clearcoatRoughness = clearcoatRoughness + (1 - t) * (1 - clearcoatRoughness);
            }
          }
        } else {
          // Passo 4: matteMode sobrepõe gloss.
          roughness = Math.max(roughness, 0.92);
          envMapIntensity = 0;
          if (clearcoat !== undefined) clearcoat = 0;
        }

        // Aplicar resultado final.
        material.roughness = roughness;
        material.metalness = metalness;
        material.envMapIntensity = envMapIntensity;
        if (isPhysical && clearcoat !== undefined) {
          (material as THREE.MeshPhysicalMaterial).clearcoat = clearcoat;
          if (clearcoatRoughness !== undefined) {
            (material as THREE.MeshPhysicalMaterial).clearcoatRoughness = clearcoatRoughness;
          }
        }
        // material.map preservado (definido pelo MaterialEngine)
        material.needsUpdate = true;
      });
    });
  }

  setGlossIntensity(value: number): void {
    this.glossIntensity = Math.max(0, Math.min(1, value));
    this.reapplyDisplayMaterials();
  }

  getGlossIntensity(): number {
    return this.glossIntensity;
  }

  setMatteMode(enabled: boolean): void {
    this.matteMode = Boolean(enabled);
    this.reapplyDisplayMaterials();
  }

  getMatteMode(): boolean {
    return this.matteMode;
  }

  setBackgroundMode(mode: ViewerBackgroundMode): void {
    this.backgroundMode =
      mode === "white" || mode === "dark" || mode === "woodFloor" ? mode : "studio";
    this.applyBackgroundMode();
  }

  getBackgroundMode(): ViewerBackgroundMode {
    return this.backgroundMode;
  }

  setMaterialQuality(quality: ViewerMaterialQuality): void {
    this.materialQuality =
      quality === "premium" || quality === "lacquered" ? quality : "standard";
    materialEngineSetLacqueredClearcoatPipeline(this.materialQuality === "lacquered");
    this.sceneManager.setMaterialQuality(this.materialQuality);
    this.reapplyDisplayMaterials();
    const mode: MaterialMode =
      this.materialQuality === "premium"
        ? "showcase"
        : this.materialQuality === "lacquered"
          ? "realistic"
          : "realistic";
    this.setMaterialMode(mode);
  }

  getMaterialQuality(): ViewerMaterialQuality {
    return this.materialQuality;
  }

  private getReflectionProbeCenter(): { x: number; y: number; z: number } {
    if (this.roomBounds) {
      return {
        x: this.roomBounds.centerX,
        y: Math.max(0.8, this.roomBounds.minY + (this.roomBounds.maxY - this.roomBounds.minY) * 0.45),
        z: this.roomBounds.centerZ,
      };
    }
    if (this.boxes.size > 0) {
      const roots = Array.from(this.boxes.values()).map((e) => e.mesh);
      runWithAllLayoutBoundsProxiesVisible(roots, () => {
        this._boundingBox.makeEmpty();
        this.boxes.forEach((entry) => {
          this._boundingBox.expandByObject(entry.mesh);
        });
      });
      this._boundingBox.getCenter(this._center);
      return { x: this._center.x, y: Math.max(0.8, this._center.y), z: this._center.z };
    }
    return { x: 0, y: 1.2, z: 0 };
  }

  private updateReflectionProbe(force = false): void {
    if (!this.reflectionsEnabled) return;
    this.sceneManager.updateReflectionProbe(this.rendererManager.renderer, {
      center: this.getReflectionProbeCenter(),
      force,
    });
  }

  setReflectionsEnabled(enabled: boolean): void {
    this.reflectionsEnabled = Boolean(enabled);
    this.sceneManager.setReflectionsEnabled(this.reflectionsEnabled, this.rendererManager.renderer);
    if (this.reflectionsEnabled) {
      this.updateReflectionProbe(true);
    }
  }

  getReflectionsEnabled(): boolean {
    return this.reflectionsEnabled;
  }

  setPhotoModeEnabled(enabled: boolean): void {
    this.photoModeEnabled = Boolean(enabled);
    this.rendererManager.renderer.toneMappingExposure = this.photoModeEnabled
      ? Math.max(this.baseToneMappingExposure, 1.2)
      : this.baseToneMappingExposure;
  }

  getPhotoModeEnabled(): boolean {
    return this.photoModeEnabled;
  }

  setExplodedViewEnabled(enabled: boolean): void {
    this.panelVisibility.setExplodedViewEnabled(enabled);
  }

  setHighlightEnabled(enabled: boolean): void {
    this.viewerState.setHighlightEnabled(Boolean(enabled));
    this.highlightManager?.setEnabled(this.viewerState.getHighlightEnabled());
    this.refreshOutlineTarget();
    this.applyPanelVisibilityForAllBoxes();
  }

  /** LEGACY: compatibilidade com API antiga; não ativa o modo régua antigo. */
  setRulerEnabled(enabled: boolean): void {
    this.rendererManager.renderer.domElement.style.cursor = enabled ? "crosshair" : "";
  }

  getExplodedViewEnabled(): boolean {
    return this.panelVisibility.getExplodedViewEnabled();
  }

  setExplodedViewIntensity(value: number): void {
    this.panelVisibility.setExplodedViewIntensity(value);
  }

  getExplodedViewIntensity(): number {
    return this.panelVisibility.getExplodedViewIntensity();
  }

  private applyPanelIdsToBox(
    root: THREE.Object3D,
    boxId: string,
    panelIds?: Partial<BoxPanelIds> | null,
    materialPresetId?: string
  ): void {
    this.panelVisibility.applyPanelIdsToBox(root, boxId, panelIds, materialPresetId);
  }

  private applyPanelVisibilityForObject(root: THREE.Object3D): void {
    this.panelVisibility.applyPanelVisibilityForObject(root);
  }

  private applyPanelVisibilityForAllBoxes(): void {
    this.panelVisibility.applyPanelVisibilityForAllBoxes();
  }

  private applyExplodedViewForObject(root: THREE.Object3D): void {
    this.panelVisibility.applyExplodedViewForObject(root);
  }

  setPanelEdgesVisible(visible: boolean): void {
    this.panelVisibility.setPanelEdgesVisible(visible);
  }

  setPanelHidden(panel: "left" | "right" | "top" | "bottom" | "back", hidden: boolean): void {
    this.panelVisibility.setPanelHidden(panel, hidden);
  }

  setHiddenPanels(keys: string[]): void {
    this.panelVisibility.setHiddenPanels(keys);
  }

  getHiddenPanels(): string[] {
    return this.panelVisibility.getHiddenPanels();
  }

  setAllPanelsHidden(hidden: boolean): void {
    this.panelVisibility.setAllPanelsHidden(hidden);
  }

  setPanelRenderingEnabled(enabled: boolean): void {
    this.panelVisibility.setPanelRenderingEnabled(enabled);
  }

  getPanelRenderingEnabled(): boolean {
    return this.panelVisibility.getPanelRenderingEnabled();
  }

  setRoomCeilingVisible(visible: boolean): void {
    this.roomCeilingVisible = Boolean(visible);
    if (this.roomBoxCeiling) {
      this.roomBoxCeiling.visible = this.roomCeilingVisible;
    }
    if (this.roomBoxGroup) {
      this.roomBoxGroup.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        if (node.userData?.isRoomCeiling === true) {
          node.visible = this.roomCeilingVisible;
        }
      });
    }
  }

  setRoomFloorMode(mode: RoomFloorMode): void {
    this.roomFloorMode = mode === "full" || mode === "hybrid" || mode === "room" ? mode : "room";
    this.rebuildRoomFloorAndCeiling();
  }

  setRoomHiddenWalls(wallIds: string[]): void {
    const byStringId = new Map(this.roomBoxWalls.map((entry) => [String(entry.mesh.userData.wallProjectId ?? entry.mesh.userData.wallId ?? entry.id), entry.id]));
    this.hiddenRoomWallIds = new Set(
      (Array.isArray(wallIds) ? wallIds : [])
        .map((id) => byStringId.get(id))
        .filter((id): id is number => typeof id === "number")
    );
    this.applyRoomWallVisibility();
  }

  setRoomUtilities(utilities: ProjectRoomUtility[]): void {
    this.rebuildRoomUtilities(Array.isArray(utilities) ? utilities : []);
  }

  setWallEditMode(enabled: boolean): void {
    this.viewerState.setWallEditMode(Boolean(enabled));
    if (this.wallGizmo) {
      this.wallGizmo.group.visible = this.viewerState.getWallEditMode();
      if (!this.viewerState.getWallEditMode()) this.wallGizmo.detach();
      if (this.viewerState.getWallEditMode() && this.viewerState.getSelectedWallIndex() !== null) {
        const wall = this.roomBoxWalls.find((w) => w.id === this.viewerState.getSelectedWallIndex())?.mesh;
        if (wall) this.wallGizmo.attach(wall);
      }
    }
  }

  addBox(id: string, options: BoxOptions = {}): boolean {
    if (this.boxes == null || this.boxManager == null) {
      throw new Error(
        "ViewerCore not ready: boxes/boxManager not initialized. Ensure viewerReady is true before calling addBox."
      );
    }
    if (this.boxes.has(id)) return false;
    const opts = options ?? {};
    const cadOnly = opts.cadOnly === true;
    const { width, height, depth: layoutDepth } = this.getBoxDimensionsFromOptions(opts);
    const index = opts.index ?? this.getNextBoxIndex();
    const manualPosition = opts.manualPosition === true;
    const carcassDepthForEntry = cadOnly
      ? layoutDepth
      : Math.max(0.001, opts.carcassDepthM ?? opts.depth ?? layoutDepth);

    let box: THREE.Object3D;
    let material: LoadedWoodMaterial | null = null;
    const materialName = opts.materialName ?? this.defaultMaterialName;

    if (cadOnly) {
      box = new THREE.Group();
      box.name = id;
    } else {
      material = this.loadMaterial(materialName) ?? this.loadMaterial("mdf_branco");
      const emptyDrill: ViewerDrillMarkersByPanel = {
        cima: [],
        fundo: [],
        lateral_esquerda: [],
        lateral_direita: [],
        porta: [],
      };
      const boxOptions: BoxOptions = {
        ...opts,
        width: opts.width ?? 1,
        height: opts.height ?? 1,
        depth: carcassDepthForEntry,
        thickness: opts.thickness ?? 0.019,
        index: opts.index,
        materialName,
        drillMarkersByPanel: filterViewerDrillMarkersForMesh(opts.drillMarkersByPanel ?? emptyDrill),
      };
      if (material?.material != null) {
        boxOptions.material = material.material;
      }
      box = buildBoxLegacy(boxOptions);
      tagBoxGroupWithId(box, id);
    }

    box.frustumCulled = false;
    box.matrixAutoUpdate = true;
    box.visible = true;
    box.layers.set(0);
    box.userData.boxId = id;
    // Garantir que todos os descendentes estejam na layer 0 para o raycaster detectar clique.
    box.traverse((child) => {
      if (isViewerLayoutProxyObject(child)) {
        child.layers.set(VIEWER_LAYOUT_PROXY_LAYER);
        return;
      }
      child.layers.set(0);
    });
    this.applyViewerDrillHoleSceneRules(box);
    box.userData.costaRotationY =
      opts.costaRotationY != null && Number.isFinite(opts.costaRotationY) ? opts.costaRotationY : 0;
    const baseY = height / 2;
    // Posição inicial aplicada IMEDIATAMENTE; sem recenter, clamp, colisão nem bbox antes.
    let position =
      manualPosition && opts.position
        ? { x: opts.position.x, y: opts.position.y, z: opts.position.z }
        : cadOnly
          ? { x: 0, y: baseY, z: 0 }
          : (opts.position ?? { x: 0, y: baseY, z: 0 });
    const cabinetType =
      opts.cabinetType === "lower" || opts.cabinetType === "upper"
        ? opts.cabinetType
        : undefined;
    const feetEnabled = opts.feetEnabled ?? (cabinetType === "lower");
    const feetHeight = Math.max(40, opts.feetHeight ?? ((opts.pe_cm ?? ViewerCore.HEIGHT_BASE_CM) * 10));
    const feetOffsetFront = Math.max(0, opts.feetOffsetFront ?? 100);
    if (cabinetType === "lower" && feetEnabled) {
      position = {
        ...position,
        y: this.getFixedYForCabinet({ height, cabinetType, pe_cm: feetHeight / 10 }),
      };
    }
    box.position.set(position.x, position.y, position.z);
    this.applyRotationIfNeeded(box, {
      x: opts.rotationX,
      y: opts.rotationY,
      z: opts.rotationZ,
    });
    // Registar no BoxManager ANTES de adicionar à cena (getRightmostX e restante lógica usam este mapa).
    this.boxManager.addEntry(id, {
      mesh: box,
      width,
      height,
      carcassDepth: carcassDepthForEntry,
      depth: layoutDepth,
      index,
      cadOnly: cadOnly || undefined,
      manualPosition,
      cabinetType: cabinetType ?? undefined,
      pe_cm: feetHeight / 10,
      feetHeight,
      feetOffsetFront,
      feetEnabled,
      autoRotateEnabled: opts.autoRotateEnabled !== false,
      locked: opts.locked === true,
      cadModels: [],
      material,
      drillMarkersByPanel: opts.drillMarkersByPanel,
      materialName: materialName,
    });
    const createdEntry = this.boxes.get(id);
    if (createdEntry) {
      this.attachLayoutBoundsMesh(createdEntry);
      this.syncFeetVisualForBox(createdEntry);
    }
    this.sceneManager.add(box);
    this.applyPanelIdsToBox(box, id, opts.panelIds, materialName);
    this.applyPanelVisibilityForObject(box);
    this.applyExplodedViewForObject(box);
    this.syncOrlaForBox(id);
    this.syncRemateForBox(id);
    tagBoxGroupWithId(box, id);
    this.edgeOutlineSystem?.syncRoot(this.sceneManager.root, this.getEdgeOutlineBoxesMap());
    this.applyBackgroundMode();
    this.reapplyDisplayMaterials();
    if (this.roomBounds && this.isMeshInsideOrTouchingRoom(box)) {
      // auto-rotate disabled — centralizado no snapping
      // this.applyAutoRotateToRoom(box, { snapPosition: this.lockEnabled });
      if (this.lockEnabled) this.applyRoomConstraint(box, { ignoreY: manualPosition });
    }
    // Base do box em Y=0 (após exploded view) e câmera no centro do bbox real — só após box totalmente construído.
    this.ensureBoxesBaseAtFloor();
    this.reflowBoxes();
    if (this.boxes.size === 1) {
      this.updateCameraTargetToBox(id, { onlyMovePositionIfOutOfFrame: true });
    } else {
      this.updateCameraTarget();
    }
    return true;
  }

  updateBox(id: string, options: Partial<BoxOptions> = {}): boolean {
    const entry = this.boxes.get(id);
    const opts = options ?? {};
    const hasDimOpts =
      opts.width !== undefined ||
      opts.height !== undefined ||
      opts.depth !== undefined ||
      opts.size !== undefined ||
      opts.layoutDepthM !== undefined ||
      opts.carcassDepthM !== undefined;
    if (import.meta.env.DEV && hasDimOpts) {
      devLogger.debug("[ViewerCore.updateBox] chamado com dimensões", {
        id,
        entry: !!entry,
        width: opts.width,
        height: opts.height,
        depth: opts.depth,
        layoutDepthM: opts.layoutDepthM,
        carcassDepthM: opts.carcassDepthM,
      });
    }
    if (!entry) return false;
    if (
      (opts.size !== undefined && (!Number.isFinite(opts.size) || opts.size <= 0)) ||
      (opts.width !== undefined && (!Number.isFinite(opts.width) || opts.width <= 0)) ||
      (opts.height !== undefined && (!Number.isFinite(opts.height) || opts.height <= 0)) ||
      (opts.depth !== undefined && (!Number.isFinite(opts.depth) || opts.depth <= 0)) ||
      (opts.layoutDepthM !== undefined &&
        (!Number.isFinite(opts.layoutDepthM) || opts.layoutDepthM <= 0)) ||
      (opts.carcassDepthM !== undefined &&
        (!Number.isFinite(opts.carcassDepthM) || opts.carcassDepthM <= 0))
    ) {
      return false;
    }
    if (
      opts.position &&
      (!Number.isFinite(opts.position.x) ||
        !Number.isFinite(opts.position.y) ||
        !Number.isFinite(opts.position.z))
    ) {
      return false;
    }
    if (opts.index !== undefined && (!Number.isFinite(opts.index) || opts.index < 0)) {
      return false;
    }

    // Atualização apenas de posição/rotação (ex.: após drag ou sync do projeto). Não fazer rebuild (updateBoxGroup/createDoorObject).
    const onlyTransform =
      opts.position !== undefined ||
      opts.rotationX !== undefined ||
      opts.rotationY !== undefined ||
      opts.rotationZ !== undefined ||
      opts.manualPosition !== undefined ||
      opts.costaRotationY !== undefined;
    const hasStructureOpts =
      opts.width !== undefined ||
      opts.height !== undefined ||
      opts.depth !== undefined ||
      opts.layoutDepthM !== undefined ||
      opts.carcassDepthM !== undefined ||
      opts.size !== undefined ||
      opts.shelves !== undefined ||
      opts.doorLayerItems !== undefined ||
      opts.drawerLayerItems !== undefined ||
      opts.drillMarkersByPanel !== undefined ||
      opts.thickness !== undefined;
    if (onlyTransform && !hasStructureOpts) {
      if (import.meta.env.DEV) {
        devLogger.debug("[DOOR-MAT] ViewerCore.updateBox ramo onlyTransform — NÃO chama updateBoxGroup", { boxId: id, onlyTransform: true, hasStructureOpts: false });
      }
      // Defesa: ignorar updates externos de posição/rotação enquanto o drag estiver activo
      // para esta caixa. O Fix principal está em objectChange (notifyBoxTransform removido
      // durante drag), mas este guard protege contra qualquer outro caminho que chame updateBox.
      const isActiveDragForThisBox =
        this.viewerState.getTransformControlsDragging() &&
        this.viewerState.getSelectedBox() === id;

      if (!isActiveDragForThisBox) {
        if (entry.manualPosition && !opts.position) {
          // nada a alterar
        } else if (opts.position && !this.shouldUseFeetLock(entry)) {
          entry.mesh.position.set(opts.position.x, opts.position.y, opts.position.z);
        } else if (this.shouldUseFeetLock(entry)) {
          const fixedY = this.getFixedYForCabinet({
            height: entry.height,
            cabinetType: entry.cabinetType,
            pe_cm: entry.pe_cm,
          });
          if (opts.position) {
            entry.mesh.position.set(opts.position.x, fixedY, opts.position.z);
          } else {
            entry.mesh.position.y = fixedY;
          }
        } else if (opts.position) {
          entry.mesh.position.set(opts.position.x, opts.position.y, opts.position.z);
        }
        this.applyRotationIfNeeded(entry.mesh, {
          x: opts.rotationX,
          y: opts.rotationY,
          z: opts.rotationZ,
        });
      }
      if (opts.costaRotationY !== undefined) {
        (entry.mesh as THREE.Object3D & { userData: { costaRotationY?: number } }).userData.costaRotationY =
          Number.isFinite(opts.costaRotationY) ? opts.costaRotationY : 0;
      }
      if (opts.manualPosition !== undefined) {
        entry.manualPosition = opts.manualPosition;
      }
      if (opts.locked !== undefined) {
        entry.locked = opts.locked === true;
      }
      entry.mesh.updateMatrixWorld(true);
      this.edgeOutlineSystem?.syncRoot(this.sceneManager.root, this.getEdgeOutlineBoxesMap());
      return true;
    }

    let width = entry.width;
    let height = entry.height;
    let layoutDepth = entry.depth;
    let carcassDepth = entry.carcassDepth ?? layoutDepth;
    let heightChanged = false;
    let indexChanged = false;
    const dimensionsChanged =
      opts.width !== undefined ||
      opts.height !== undefined ||
      opts.depth !== undefined ||
      opts.layoutDepthM !== undefined ||
      opts.carcassDepthM !== undefined ||
      opts.size !== undefined ||
      opts.thickness !== undefined;
    const structureChanged =
      dimensionsChanged ||
      opts.shelves !== undefined ||
      opts.doorLayerItems !== undefined ||
      opts.drawerLayerItems !== undefined ||
      opts.drillMarkersByPanel !== undefined;
    if (structureChanged && this.viewerState.getTransformControlsDragging()) {
      this.pendingBoxStructureUpdates.set(id, {
        ...(this.pendingBoxStructureUpdates.get(id) ?? {}),
        ...opts,
      });
      return true;
    }
    if (structureChanged) {
      width = Math.max(0.001, opts.width ?? opts.size ?? width);
      height = Math.max(0.001, opts.height ?? opts.size ?? height);
      layoutDepth = Math.max(0.001, opts.layoutDepthM ?? opts.depth ?? opts.size ?? layoutDepth);
      carcassDepth = Math.max(0.001, opts.carcassDepthM ?? opts.depth ?? opts.size ?? layoutDepth);
      heightChanged = height !== entry.height;
      const hasLayerUpdate =
        opts.doorLayerItems !== undefined ||
        opts.drawerLayerItems !== undefined ||
        opts.drillMarkersByPanel !== undefined;
      // Só pular updateBoxGroup para caixa CAD-only quando não há alteração de dimensões nem de portas/gavetas.
      if (entry.cadOnly && !hasLayerUpdate && !dimensionsChanged) {
        if (!entry.manualPosition) {
          entry.mesh.position.y = height / 2;
        }
      } else {
        const emptyDrillMarkers: ViewerDrillMarkersByPanel = {
          cima: [],
          fundo: [],
          lateral_esquerda: [],
          lateral_direita: [],
          porta: [],
        };
        const drillMarkers: ViewerDrillMarkersByPanel =
          opts.drillMarkersByPanel ?? emptyDrillMarkers;
        const materialName = opts.materialName ?? entry.materialName ?? this.defaultMaterialName;
        const loadedMat = entry.material ?? this.loadMaterial(materialName) ?? this.loadMaterial("mdf_branco");
        const boxOptions: BoxOptions = {
          ...opts,
          width,
          height,
          depth: carcassDepth,
          thickness: opts.thickness ?? 0.019,
          shelves: opts.shelves,
          doorLayerItems: opts.doorLayerItems,
          drawerLayerItems: opts.drawerLayerItems,
          drillMarkersByPanel: filterViewerDrillMarkersForMesh(drillMarkers),
          materialName,
        };
        if (loadedMat?.material != null) boxOptions.material = loadedMat.material;

        const canIncrementalUpdate = !dimensionsChanged && !entry.cadOnly;
        if (canIncrementalUpdate) {
          updateBoxGroup(entry.mesh as THREE.Group, boxOptions);
          tagBoxGroupWithId(entry.mesh, id);
          this.applyViewerDrillHoleSceneRules(entry.mesh);
          entry.width = width;
          entry.height = height;
          entry.depth = layoutDepth;
          entry.carcassDepth = carcassDepth;
          if (!entry.material && loadedMat) entry.material = loadedMat;
          this.edgeOutlineSystem?.syncRoot(this.sceneManager.root, this.getEdgeOutlineBoxesMap());
          this.requestRender();
        } else {
        const savedPosition = new THREE.Vector3().setFromMatrixPosition(entry.mesh.matrixWorld);
        const savedQuaternion = new THREE.Quaternion().copy(entry.mesh.quaternion);
        const savedCostaRotationY = (entry.mesh as THREE.Object3D & { userData: { costaRotationY?: number } }).userData?.costaRotationY;

        // Desanexar modelos CAD antes de dispor o mesh (não dispor os GLBs).
        const cadModels = entry.cadModels ? [...entry.cadModels] : [];
        cadModels.forEach((m) => {
          if (m.object.parent) m.object.parent.remove(m.object);
        });

        this.appliedRotationByMeshUuid.delete(entry.mesh.uuid);
        this.disposeBoxMeshFromScene(entry.mesh);

        let newBox: THREE.Object3D;
        if (entry.cadOnly) {
          newBox = new THREE.Group();
          newBox.name = id;
        } else {
          newBox = buildBoxLegacy(boxOptions);
          tagBoxGroupWithId(newBox, id);
          if (!entry.material && loadedMat) entry.material = loadedMat;
        }

        newBox.frustumCulled = false;
        newBox.matrixAutoUpdate = true;
        newBox.visible = true;
        newBox.layers.set(0);
        newBox.traverse((child) => {
          if (isViewerLayoutProxyObject(child)) {
            child.layers.set(VIEWER_LAYOUT_PROXY_LAYER);
            return;
          }
          child.layers.set(0);
        });
        this.applyViewerDrillHoleSceneRules(newBox);
        newBox.userData.boxId = id;
        newBox.userData.costaRotationY =
          opts.costaRotationY != null && Number.isFinite(opts.costaRotationY)
            ? opts.costaRotationY
            : savedCostaRotationY ?? 0;
        newBox.position.copy(savedPosition);
        newBox.quaternion.copy(savedQuaternion);

        entry.mesh = newBox;
        entry.drillMarkersByPanel = drillMarkers;

        this.sceneManager.root.add(newBox);
        cadModels.forEach((m) => newBox.add(m.object));

        if (import.meta.env.DEV && dimensionsChanged) {
          devLogger.debug("[ViewerCore.updateBox] mesh reconstruído (estrutura alterada)", {
            boxId: id,
            width,
            height,
            layoutDepth,
            carcassDepth,
          });
        }
        // [CORRIGIDO 2026-03] Forçar rebuild completo do Scene Graph após mesh rebuild (sem alterar transforms ou offsets)
        this.edgeOutlineSystem?.syncRoot(this.sceneManager.root, this.getEdgeOutlineBoxesMap());
        this.requestRender();
        }
      }
    }
    if (opts.index !== undefined && opts.index !== entry.index) {
      entry.index = opts.index;
      indexChanged = true;
    }
    if (opts.materialName && !entry.cadOnly) {
      this.updateBoxMaterial(id, opts.materialName);
      this.reapplyDisplayMaterials();
    }
    if (opts.cabinetType !== undefined) {
      entry.cabinetType =
        opts.cabinetType === "lower" || opts.cabinetType === "upper"
          ? opts.cabinetType
          : undefined;
    }
    if (opts.pe_cm !== undefined) entry.pe_cm = opts.pe_cm;
    if (opts.feetHeight !== undefined) {
      entry.feetHeight = Math.max(40, opts.feetHeight);
      entry.pe_cm = entry.feetHeight / 10;
    }
    if (opts.feetOffsetFront !== undefined) {
      entry.feetOffsetFront = Math.max(0, opts.feetOffsetFront);
    }
    if (opts.feetEnabled !== undefined) entry.feetEnabled = opts.feetEnabled;
    if (opts.autoRotateEnabled !== undefined) entry.autoRotateEnabled = opts.autoRotateEnabled;
    if (opts.locked !== undefined) entry.locked = opts.locked === true;
    if (entry.manualPosition && !opts.position) {
      // Nunca alterar position.x/y/z quando manualPosition sem opts.position explícito.
    } else if (opts.position && !this.shouldUseFeetLock(entry)) {
      entry.mesh.position.set(opts.position.x, opts.position.y, opts.position.z);
    } else if (this.shouldUseFeetLock(entry)) {
      const fixedY = this.getFixedYForCabinet({
        height,
        cabinetType: entry.cabinetType,
        pe_cm: entry.pe_cm,
      });
      if (opts.position) {
        entry.mesh.position.set(opts.position.x, fixedY, opts.position.z);
      } else {
        entry.mesh.position.y = fixedY;
      }
    } else if (opts.position) {
      entry.mesh.position.set(opts.position.x, opts.position.y, opts.position.z);
    } else if (!entry.manualPosition) {
      entry.mesh.position.y = height / 2;
    }
    if (dimensionsChanged && !entry.manualPosition && !this.shouldUseFeetLock(entry)) {
      entry.mesh.position.y = height / 2;
    }
    this.applyRotationIfNeeded(entry.mesh, {
      x: opts.rotationX,
      y: opts.rotationY,
      z: opts.rotationZ,
    });
    this.applyPanelIdsToBox(
      entry.mesh,
      id,
      opts.panelIds,
      opts.materialName ?? entry.materialName ?? this.defaultMaterialName
    );
    this.applyExplodedViewForObject(entry.mesh);
    if (opts.costaRotationY !== undefined) {
      (entry.mesh as THREE.Object3D & { userData: { costaRotationY?: number } }).userData.costaRotationY =
        Number.isFinite(opts.costaRotationY) ? opts.costaRotationY : 0;
    }
    if (opts.manualPosition !== undefined) {
      entry.manualPosition = opts.manualPosition;
    }
    entry.mesh.updateMatrixWorld();
    entry.mesh.matrixAutoUpdate = true;
    entry.width = width;
    entry.height = height;
    entry.depth = layoutDepth;
    entry.carcassDepth = carcassDepth;
    if (structureChanged) {
      this.attachLayoutBoundsMesh(entry);
    }
    this.syncFeetVisualForBox(entry);
    tagBoxGroupWithId(entry.mesh, id);
    if (opts.drillMarkersByPanel !== undefined) {
      entry.drillMarkersByPanel = opts.drillMarkersByPanel;
    }
    // Recriar overlays de bordas/furos no mesh reconstruído (structureChanged).
    // applyPanelVisibilityForObject lê entry.drillMarkersByPanel (já atualizado acima)
    // e mesh.userData.boxId (setado por applyPanelIdsToBox). Deve ser chamado aqui,
    // pois updateBox não chama applyPanelVisibilityForObject (diferente de addBox).
    if (structureChanged) {
      this.applyPanelVisibilityForObject(entry.mesh);
    }
    this.syncOrlaForBox(id);
    this.syncRemateForBox(id);
    if (this.lockEnabled) this.applyFloorConstraint(entry.mesh);
    if (dimensionsChanged && entry.cadOnly) {
      entry.cadModels.forEach((model) => {
        if (model.object.userData?.isCatalogGlb) {
          this.applyCatalogModelScale(entry, model.object);
        }
      });
    }
    const reflowNeeded =
      indexChanged || (dimensionsChanged && entry.cadOnly);
    if (reflowNeeded) {
      this.reflowBoxes();
      if (!structureChanged) this.updateCameraTarget();
    }
    if (structureChanged) {
      this.updateCameraTargetToBox(id, { onlyMovePositionIfOutOfFrame: true });
      this.refreshViewerAttachmentsAfterMeshMutation();
    }
    if (heightChanged && !entry.cadOnly) {
      this.updateModelsVerticalPosition(entry);
    }
    if (this.roomBounds && this.isMeshInsideOrTouchingRoom(entry.mesh)) {
      // auto-rotate disabled — centralizado no snapping
      // this.applyAutoRotateToRoom(entry.mesh, { snapPosition: this.lockEnabled });
      if (this.lockEnabled) this.applyRoomConstraint(entry.mesh, { ignoreY: entry.manualPosition });
    }
    if (id === this.viewerState.getSelectedBox()) {
      this.selectedBoxChangeListeners.forEach((cb) => {
        try {
          cb(id);
        } catch {
          /* ignore */
        }
      });
    }
    this.edgeOutlineSystem?.syncRoot(this.sceneManager.root, this.getEdgeOutlineBoxesMap());

    // Forçar render imediato após alteração estrutural (rebuild do mesh) para que furações e geometria nova apareçam sem segunda ação.
    if (structureChanged) {
      this.requestRender();
    }
    return true;
  }

  /** Agenda um frame de render no próximo requestAnimationFrame. Usado após rebuild de mesh para atualizar a tela imediatamente. */
  private requestRender(): void {
    this.runtimeLoop.requestRender();
  }

  setBoxIndex(id: string, index: number): boolean {
    const entry = this.boxes.get(id);
    if (!entry) return false;
    if (!Number.isFinite(index) || index < 0) return false;
    entry.index = index;
    this.reflowBoxes();
    this.updateCameraTarget();
    return true;
  }

  /**
   * Objetos marcados como furo CNC auxiliar (malha dedicada): invisíveis e sem raycast.
   * Os furos estruturais em painéis são filtrados antes do CSG via viewerCncDrillFilter.
   */
  private applyViewerDrillHoleSceneRules(root: THREE.Object3D): void {
    root.traverse((node) => {
      if (node.userData?.isDrillHole === true) {
        node.visible = false;
        if (node instanceof THREE.Mesh) {
          node.raycast = () => null;
        }
      }
    });
  }

  /** Remove e dispõe geometrias/materiais do mesh da cena (não dispõe entry.material, que é cache). */
  private disposeBoxMeshFromScene(mesh: THREE.Object3D): void {
    if (mesh.parent) mesh.parent.remove(mesh);
    const disposedGeometries = new Set<THREE.BufferGeometry>();
    const disposedMaterials = new Set<THREE.Material>();
    mesh.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      if (node.geometry && !disposedGeometries.has(node.geometry)) {
        node.geometry.dispose();
        disposedGeometries.add(node.geometry);
      }
      if (Array.isArray(node.material)) {
        node.material.forEach((m) => {
          if (!disposedMaterials.has(m)) {
            m.dispose();
            disposedMaterials.add(m);
          }
        });
      } else if (node.material && !disposedMaterials.has(node.material)) {
        node.material.dispose();
        disposedMaterials.add(node.material);
      }
    });
  }

  removeBox(id: string): boolean {
    const entry = this.boxes.get(id);
    if (!entry) return false;
    if (this.viewerState.getSelectedBox() === id) {
      this.setSelectedBox(null);
    }
    this.clearModelsFromBox(id);
    this.disposeBoxMeshFromScene(entry.mesh);
    this.edgeOutlineSystem?.syncRoot(this.sceneManager.root, this.getEdgeOutlineBoxesMap());
    if (entry.material) {
      entry.material.textures.forEach((texture) => texture.dispose());
    }
    this.boxManager.removeEntry(id);
    this.appliedRotationByMeshUuid.delete(entry.mesh.uuid);
    this.reflowBoxes();
    this.updateCameraTarget();
    return true;
  }

  clearBoxes(): void {
    Array.from(this.boxes.keys()).forEach((id) => this.removeBox(id));
  }

  /*
   * ROOM SYSTEM — 3 subsistemas complementares:
   * 1. RoomManager: sala principal (paredes, piso)
   * 2. RoomBuilder: aberturas (portas/janelas)
   * 3. wallStore + roomMeshFromWallStore: persistência e restore automático
   *
   * Fluxo de criação: createRoomWithDimensions -> RoomManager
   * Fluxo de restore: loadRoomConfig -> roomMeshSyncToken -> Workspace -> applyRoomMeshFromWallStore
   */
  /**
   * @deprecated Preferir `createRoomWithDimensions` no fluxo de UI (Painel Sala).
   * Mantido para compatibilidade com `ViewerApi.createRoom(RoomConfig)` em fluxos programáticos/snapshot.
   * Internamente este método converte `RoomConfig` para dimensões e delega em `createRoomWithDimensions`.
   */
  createRoom(config: RoomConfig): void {
    const { walls, numWalls } = config;
    if (!walls?.length || walls.length < 3) {
      this.removeRoom();
      return;
    }
    const w0 = walls[0]?.lengthMm ?? 3000;
    const w2 = walls[Math.min(2, walls.length - 1)]?.lengthMm ?? w0;
    const w1 = walls[1]?.lengthMm ?? w0;
    const w3 = walls.length >= 4 ? (walls[3]?.lengthMm ?? w1) : w1;
    const widthM = Math.max(0.1, (w0 + w2) / 2 / 1000);
    const depthM = Math.max(0.1, (w1 + w3) / 2 / 1000);
    const heightM = Math.max(
      0.1,
      ...walls.map((w) => (w.heightMm ?? 2800) / 1000),
      2.8
    );
    const n: 3 | 4 =
      numWalls === 3 || walls.length === 3 ? 3 : walls.length >= 4 ? 4 : 3;
    this.createRoomWithDimensions(widthM, depthM, heightM, n);
  }

  /** Cria a sala com o sistema RoomManager. numWalls: 4 = fechada, 3 = sala de estar (aberta, sem parede traseira). */
  createRoomWithDimensions(
    width: number,
    depth: number,
    height: number,
    numWalls?: 3 | 4,
    wallThicknessM?: number
  ): void {
    this.roomManager?.createRoom(width, depth, height, numWalls ?? 4, wallThicknessM);
  }

  removeRoom(): void {
    if (this.roomManager?.room) {
      this.roomManager.removeRoom();
    } else {
      this.clearRoomBounds();
    }
  }

  setRoomDimensions(width: number, depth: number, height: number): void {
    this.roomManager?.setDimensions(width, depth, height);
  }

  addExtraWall(): void {
    this.roomManager?.addExtraWall();
  }

  setRoomLocked(locked: boolean): void {
    this.roomManager?.setLocked(locked);
  }

  getRoomExists(): boolean {
    return Boolean(this.roomManager?.room);
  }

  getRoomLocked(): boolean {
    return this.roomManager?.locked ?? false;
  }

  getRoomDimensions(): { width: number; depth: number; height: number } | null {
    if (!this.roomManager?.room) return null;
    const r = this.roomManager.room;
    return { width: r.width, depth: r.depth, height: r.height };
  }

  hideRoom(): void {
    this.roomManager?.hideRoom();
  }

  showRoom(): void {
    this.roomManager?.showRoom();
  }

  getRoomVisible(): boolean {
    return this.roomManager?.visible ?? false;
  }

  private clearRoomBox(): void {
    if (this.roomBoxGroup) {
      this.sceneManager.root.remove(this.roomBoxGroup);
    }
    this.roomBoxWalls.forEach((w) => {
      w.mesh.geometry.dispose();
      if (Array.isArray(w.mesh.material)) {
        w.mesh.material.forEach((m) => m.dispose());
      } else {
        w.mesh.material.dispose();
      }
    });
    if (this.roomBoxFloor) {
      this.roomBoxFloor.geometry.dispose();
      if (Array.isArray(this.roomBoxFloor.material)) {
        this.roomBoxFloor.material.forEach((m) => m.dispose());
      } else {
        this.roomBoxFloor.material.dispose();
      }
    }
    if (this.roomBoxCeiling) {
      this.roomBoxCeiling.geometry.dispose();
      if (Array.isArray(this.roomBoxCeiling.material)) {
        this.roomBoxCeiling.material.forEach((m) => m.dispose());
      } else {
        this.roomBoxCeiling.material.dispose();
      }
    }
    if (this.roomFloorRoot) {
      this.disposeObject(this.roomFloorRoot);
      this.roomFloorRoot.removeFromParent();
    }
    if (this.roomUtilitiesRoot) {
      this.disposeObject(this.roomUtilitiesRoot);
      this.roomUtilitiesRoot.removeFromParent();
    }
    this.roomBoxGroup = null;
    this.roomBoxWalls = [];
    this.roomBoxFloor = null;
    this.roomBoxFloorOutline = null;
    this.roomBoxCeiling = null;
    this.roomFloorRoot = null;
    this.roomUtilitiesRoot = null;
  }

  /** Room 2.1: chão global fixo (25 m), independente da sala. Não redimensionar com bounds. */
  private ensureStaticSceneGround(): void {
    this.sceneManager.setGroundSize(this.defaultGroundSize, this.defaultGroundSize);
    this.sceneManager.setGroundPosition(0, 0);
  }

  /** Chamado pelo RoomManager quando a sala é criada/atualizada. Adiciona o grupo à cena e regista paredes/bounds. */
  setRoomFromManager(
    walls: WallEntryForViewer[],
    bounds: RoomBounds,
    group: THREE.Group
  ): void {
    if (this.roomBoxGroup && this.roomBoxGroup !== group) {
      this.sceneManager.root.remove(this.roomBoxGroup);
    }
    this.roomBoxGroup = group;
    this.roomBoxWalls = walls;
    this.roomBoxFloor = null;
    this.roomBoxFloorOutline = null;
    this.roomBoxCeiling = null;
    this.roomBounds = bounds;
    this.boundsCache.invalidateRoom();
    this.sceneManager.root.add(group);
    this.ensureStaticSceneGround();
    this.rebuildRoomFloorAndCeiling();
    this.applyRoomWallVisibility();
    this.setRoomCeilingVisible(this.roomCeilingVisible);
  }

  /** Chamado pelo RoomManager quando a sala é removida. Remove o grupo da cena e limpa estado. */
  clearRoomFromManager(): void {
    this.roomBuilder.clearRoom(true);
    if (this.roomBoxGroup) {
      this.sceneManager.root.remove(this.roomBoxGroup);
    }
    this.roomBoxWalls = [];
    this.roomBoxGroup = null;
    this.roomBoxFloor = null;
    this.roomBoxFloorOutline = null;
    this.roomBoxCeiling = null;
    this.roomFloorRoot = null;
    this.roomUtilitiesRoot = null;
    this.roomBounds = null;
    this.boundsCache.invalidateRoom();
    this.viewerState.setSelectedWallIndex(null);
    if (this.wallGizmo) this.wallGizmo.detach();
    this.refreshTransformControlsAttachment();
    this.refreshOutlineTarget();
    this.ensureStaticSceneGround();
  }

  createRoomBox(bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY: number;
    maxY: number;
    centerX: number;
    centerZ: number;
  }): void {
    this.clearRoomBox();
    const { minX, maxX, minZ, maxZ, minY, maxY, centerX, centerZ } = bounds;
    const width = Math.max(0.01, maxX - minX);
    const depth = Math.max(0.01, maxZ - minZ);
    const height = Math.max(0.01, maxY - minY);
    const t = ViewerCore.ROOM_WALL_THICKNESS_M;
    const sceneConfig = getSceneMaterialConfig();
    const roomBoxConfig = sceneConfig.roomBox;
    const wallMat = new THREE.MeshStandardMaterial({
      color: roomBoxConfig.color,
      roughness: roomBoxConfig.roughness,
      metalness: roomBoxConfig.metalness,
      transparent: roomBoxConfig.transparent,
      opacity: roomBoxConfig.opacity,
    });

    const group = new THREE.Group();
    group.name = "roomBox";

    const front = new THREE.Mesh(new THREE.BoxGeometry(width, height, t), wallMat.clone());
    front.position.set(centerX, minY + height / 2, minZ - t / 2);
    front.userData.wallId = 0;
    front.userData.wallNormal = new THREE.Vector3(0, 0, -1);
    front.userData.isRoomWall = true;
    front.userData.wallLengthMm = width * 1000;
    front.userData.wallHeightMm = height * 1000;
    front.userData.wallThicknessM = t;
    group.add(front);

    const right = new THREE.Mesh(new THREE.BoxGeometry(depth, height, t), wallMat.clone());
    right.rotation.y = Math.PI / 2;
    right.position.set(maxX + t / 2, minY + height / 2, centerZ);
    right.userData.wallId = 1;
    right.userData.wallNormal = new THREE.Vector3(-1, 0, 0);
    right.userData.isRoomWall = true;
    right.userData.wallLengthMm = depth * 1000;
    right.userData.wallHeightMm = height * 1000;
    right.userData.wallThicknessM = t;
    group.add(right);

    const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, t), wallMat.clone());
    back.position.set(centerX, minY + height / 2, maxZ + t / 2);
    back.userData.wallId = 2;
    back.userData.wallNormal = new THREE.Vector3(0, 0, 1);
    back.userData.isRoomWall = true;
    back.userData.wallLengthMm = width * 1000;
    back.userData.wallHeightMm = height * 1000;
    back.userData.wallThicknessM = t;
    group.add(back);

    const left = new THREE.Mesh(new THREE.BoxGeometry(depth, height, t), wallMat.clone());
    left.rotation.y = Math.PI / 2;
    left.position.set(minX - t / 2, minY + height / 2, centerZ);
    left.userData.wallId = 3;
    left.userData.wallNormal = new THREE.Vector3(1, 0, 0);
    left.userData.isRoomWall = true;
    left.userData.wallLengthMm = depth * 1000;
    left.userData.wallHeightMm = height * 1000;
    left.userData.wallThicknessM = t;
    group.add(left);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), wallMat.clone());
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(centerX, minY, centerZ);
    floor.userData.isRoomFloor = true;
    group.add(floor);

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(width, t, depth), wallMat.clone());
    ceiling.position.set(centerX, maxY + t / 2, centerZ);
    ceiling.userData.isRoomCeiling = true;
    group.add(ceiling);

    this.sceneManager.root.add(group);
    this.roomBoxGroup = group;
    this.roomBoxWalls = [
      { id: 0, normal: new THREE.Vector3(0, 0, -1), mesh: front },
      { id: 1, normal: new THREE.Vector3(-1, 0, 0), mesh: right },
      { id: 2, normal: new THREE.Vector3(0, 0, 1), mesh: back },
      { id: 3, normal: new THREE.Vector3(1, 0, 0), mesh: left },
    ];
    this.roomBoxFloor = floor;
    this.roomBoxCeiling = ceiling;
    this.setRoomCeilingVisible(this.roomCeilingVisible);
    this.applyBackgroundMode();
    this.reapplyDisplayMaterials();
  }

  private getRoomFloorShape(expandM = 0): THREE.Shape | null {
    if (!this.roomBounds) return null;
    const { minX, maxX, minZ, maxZ } = this.roomBounds;
    const shape = new THREE.Shape();
    shape.moveTo(minX - expandM, minZ - expandM);
    shape.lineTo(maxX + expandM, minZ - expandM);
    shape.lineTo(maxX + expandM, maxZ + expandM);
    shape.lineTo(minX - expandM, maxZ + expandM);
    shape.lineTo(minX - expandM, minZ - expandM);
    return shape;
  }

  private clearRoomFloorRoot(): void {
    if (!this.roomFloorRoot) return;
    this.disposeObject(this.roomFloorRoot);
    this.roomFloorRoot.removeFromParent();
    this.roomFloorRoot = null;
    this.roomBoxFloor = null;
    this.roomBoxFloorOutline = null;
    this.roomBoxCeiling = null;
  }

  private rebuildRoomFloorAndCeiling(): void {
    if (!this.roomBoxGroup || !this.roomBounds) return;
    this.clearRoomFloorRoot();
    const sceneConfig = getSceneMaterialConfig();
    const group = new THREE.Group();
    group.name = "room-floor-root";
    const expandM = getRoomFloorExpandM(this.roomFloorMode);
    const shape = this.getRoomFloorShape(expandM);
    if (!shape) return;
    const floorAppearance = getRoomFloorOverlayAppearance(this.backgroundMode);
    const floorGeom = new THREE.ShapeGeometry(shape);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = createRoomFloorOverlayMaterial(floorAppearance);
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = this.roomBounds.minY + 0.002;
    floor.name = "room-floor-root";
    floor.userData.isRoomFloor = true;
    floor.renderOrder = 1;
    group.add(floor);

    const outline = createRoomFloorOutline(
      this.roomBounds.minX,
      this.roomBounds.maxX,
      this.roomBounds.minZ,
      this.roomBounds.maxZ,
      expandM,
      this.roomBounds.minY + 0.004,
      floorAppearance.outlineColor
    );
    group.add(outline);

    const ceilingGeom = new THREE.ShapeGeometry(shape);
    ceilingGeom.rotateX(Math.PI / 2);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: sceneConfig.roomBox.color,
      roughness: sceneConfig.roomBox.roughness,
      metalness: sceneConfig.roomBox.metalness,
      transparent: true,
      opacity: Math.min(0.45, sceneConfig.roomBox.opacity),
      side: THREE.DoubleSide,
    });
    const ceiling = new THREE.Mesh(ceilingGeom, ceilingMat);
    ceiling.position.y = this.roomBounds.maxY;
    ceiling.name = "room-ceiling";
    ceiling.userData.isRoomCeiling = true;
    ceiling.visible = this.roomCeilingVisible;
    group.add(ceiling);

    this.roomBoxGroup.add(group);
    this.roomFloorRoot = group;
    this.roomBoxFloor = floor;
    this.roomBoxFloorOutline = outline;
    this.roomBoxCeiling = ceiling;
    this.applyBackgroundMode();
  }

  private clearRoomUtilitiesRoot(): void {
    this.roomBoxWalls.forEach((entry) => {
      const toRemove = entry.mesh.children.filter((child) => child.userData?.roomUtilityId);
      toRemove.forEach((child) => {
        entry.mesh.remove(child);
        this.disposeObject(child);
      });
    });
    if (!this.roomUtilitiesRoot) return;
    this.roomUtilitiesRoot.removeFromParent();
    this.roomUtilitiesRoot = null;
  }

  private utilityColor(type: ProjectRoomUtility["type"]): number {
    if (type === "WaterPoint") return 0x38bdf8;
    if (type === "DrainPoint") return 0x64748b;
    return 0xfacc15;
  }

  private rebuildRoomUtilities(utilities: ProjectRoomUtility[]): void {
    this.clearRoomUtilitiesRoot();
    if (!this.roomBoxGroup || !utilities.length) return;
    const root = new THREE.Group();
    root.name = "room-utilities-root";
    const wallsByProjectId = new Map<string, THREE.Mesh>();
    this.roomBoxWalls.forEach((entry) => {
      const key = String(entry.mesh.userData.wallProjectId ?? entry.mesh.userData.wallId ?? entry.id);
      wallsByProjectId.set(key, entry.mesh);
    });
    utilities.forEach((utility) => {
      const wall = wallsByProjectId.get(utility.wallId);
      if (!wall) return;
      const wallLenMm = (wall.userData.wallLengthMm as number | undefined) ?? 1000;
      const wallHeightMm = (wall.userData.wallHeightMm as number | undefined) ?? 2600;
      const wallLenM = wallLenMm / 1000;
      const wallHeightM = wallHeightMm / 1000;
      const t = (wall.userData.wallThicknessM as number | undefined) ?? 0.12;
      const marker = new THREE.Group();
      marker.name = `room-utility-${utility.type}`;
      marker.userData.roomUtilityId = utility.id;
      marker.userData.roomUtility = { ...utility };
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.16, 0.018),
        new THREE.MeshStandardMaterial({ color: this.utilityColor(utility.type), roughness: 0.55, metalness: 0.05 })
      );
      plate.userData.roomUtilityId = utility.id;
      marker.add(plate);
      const x = -wallLenM / 2 + Math.max(0, Math.min(wallLenMm, utility.positionAlongWall)) / 1000;
      const y = -wallHeightM / 2 + Math.max(0, Math.min(wallHeightMm, utility.heightMm)) / 1000;
      marker.position.set(x, y, t / 2 + 0.04);
      wall.add(marker);
    });
    this.roomBoxGroup.add(root);
    this.roomUtilitiesRoot = root;
    this.applyRoomWallVisibility();
  }

  private getRoomUtilityById(utilityId: string): THREE.Object3D | null {
    for (const wall of this.roomBoxWalls) {
      const found = wall.mesh.children.find((child) => child.userData?.roomUtilityId === utilityId);
      if (found) return found;
    }
    return null;
  }

  setRoomBounds(bounds: {
    width: number;
    depth: number;
    height: number;
    originX?: number;
    originZ?: number;
  }): void {
    void bounds;
    // Sistema de sala desativado temporariamente.
    this.clearRoomBounds();
  }

  clearRoomBounds(): void {
    if (this.roomManager?.room) {
      this.roomManager.removeRoom();
      return;
    }
    this.roomBounds = null;
    this.ensureStaticSceneGround();
    this.clearRoomBox();
    this.roomBuilder.clearRoom(true);
  }

  /**
   * Reposiciona a câmera numa vista pré-definida.
   * Target sempre no centro do bounding box combinado (ou sala/origem).
   * Orientações: Frontal = -Z, Traseira = +Z, Esquerda = +X, Direita = -X, Superior = -Y, Inferior = +Y.
   * Nenhum auto-follow deve sobrescrever a orientação enquanto esta vista estiver ativa.
   */
  setCameraView(
    preset: "top" | "bottom" | "front" | "back" | "right" | "left" | "isometric"
  ): void {
    const bounds = this.getCombinedBoundingBox();
    let cx: number;
    let cy: number;
    let cz: number;
    let dist: number;

    if (bounds) {
      cx = (bounds.min.x + bounds.max.x) * 0.5;
      cy = (bounds.min.y + bounds.max.y) * 0.5;
      cz = (bounds.min.z + bounds.max.z) * 0.5;
      dist = Math.max(bounds.width, bounds.height, bounds.depth, 0.1) * 1.2;
    } else if (this.roomBounds) {
      cx = this.roomBounds.centerX;
      cy = (this.roomBounds.minY + this.roomBounds.maxY) * 0.5;
      cz = this.roomBounds.centerZ;
      const roomHeight = this.roomBounds.maxY - this.roomBounds.minY;
      const roomWidth = this.roomBounds.maxX - this.roomBounds.minX;
      const roomDepth = this.roomBounds.maxZ - this.roomBounds.minZ;
      dist = Math.max(roomWidth, roomDepth, roomHeight, 0.1) * 1.2;
    } else {
      cx = 0;
      cy = 0;
      cz = 0;
      dist = 2.5;
    }

    this.cameraManager.setTarget(cx, cy, cz);

    switch (preset) {
      case "front":
        this.cameraManager.setPosition(cx, cy, cz + dist);
        break;
      case "back":
        this.cameraManager.setPosition(cx, cy, cz - dist);
        break;
      case "left":
        this.cameraManager.setPosition(cx - dist, cy, cz);
        break;
      case "right":
        this.cameraManager.setPosition(cx + dist, cy, cz);
        break;
      case "top":
        this.cameraManager.setPosition(cx, cy + dist, cz);
        break;
      case "bottom":
        this.cameraManager.setPosition(cx, cy - dist, cz);
        break;
      case "isometric":
      default: {
        const d = dist * 0.9;
        this.cameraManager.setPosition(cx + d, cy + d * 0.8, cz + d);
        break;
      }
    }

    if (this.controls) {
      this.syncCameraTarget(new THREE.Vector3(cx, cy, cz), { updateLookAt: false });
    }

    this.cameraViewPreset = preset;
  }

  /** Aplica apenas a vista frontal padrão e limpa o preset (permite que auto-follow volte a atuar). */
  resetCamera(): void {
    this.cameraViewPreset = null;
    this.setCameraView("front");
  }

  /**
   * Enquadra a câmara numa caixa específica (centro no target, distância pelo FOV).
   */
  frameSelection(boxId: string): boolean {
    const entry = this.boxes.get(boxId);
    if (!entry) return false;
    entry.mesh.updateMatrixWorld(true);
    runWithLayoutBoundsProxiesVisible(entry.mesh, () => {
      this._boxSingle.setFromObject(entry.mesh);
    });
    this._boxSingle.getCenter(this._center);
    this._boxSingle.getSize(this._size);
    const maxDim = Math.max(this._size.x, this._size.y, this._size.z, 0.1);
    const cam = this.cameraManager.camera;
    const fovRad = (cam.fov * Math.PI) / 180;
    const distance = Math.max(0.3, (maxDim / (2 * Math.tan(fovRad * 0.5))) * 1.2);
    const orbitTarget = this.controls?.controls.target ?? this.cameraManager.getTarget();
    const dir = new THREE.Vector3().subVectors(cam.position, orbitTarget);
    if (dir.lengthSq() < 1e-8) dir.set(0, 0.2, 1);
    dir.normalize();
    cam.position.copy(this._center).addScaledVector(dir, distance);
    this.syncCameraTarget(this._center, { updateLookAt: false });
    cam.lookAt(this._center);
    this.controls?.update();
    return true;
  }

  setPlacementMode(mode: "door" | "window" | null): void {
    this.viewerState.setPlacementMode(mode);
  }

  setOnRoomElementPlaced(
    callback: ((_wallId: number, _config: DoorWindowConfig, _type: "door" | "window") => void) | null
  ): void {
    this.onRoomElementPlaced = callback;
  }

  setOnRoomElementSelected(
    callback: ((_data: { elementId: string; wallId: number; type: "door" | "window"; config: DoorWindowConfig } | null) => void) | null
  ): void {
    this.onRoomElementSelected = callback;
  }

  setOnWallSelected(callback: ((_wallId: number | null) => void) | null): void {
    this.onWallSelected = callback;
  }

  setOnWallTransform(callback: ((_wallIndex: number, _position: { x: number; z: number }, _rotation: number) => void) | null): void {
    this.onWallTransform = callback;
  }

  setOnRoomElementTransform(callback: ((_elementId: string, _config: DoorWindowConfig) => void) | null): void {
    this.onRoomElementTransform = callback;
  }

  setOnRoomUtilitySelected(
    callback: ((_data: { utilityId: string; wallId: number; config: ProjectRoomUtility } | null) => void) | null
  ): void {
    this.onRoomUtilitySelected = callback;
  }

  setOnRoomUtilityTransform(
    callback: ((_utilityId: string, _patch: Pick<ProjectRoomUtility, "positionAlongWall" | "heightMm">) => void) | null
  ): void {
    this.onRoomUtilityTransform = callback;
  }

  updateRoomElementConfig(elementId: string, config: DoorWindowConfig): boolean {
    return this.roomBuilder.updateElementConfig(elementId, config);
  }

  addDoorToRoom(wallId: number, config: DoorWindowConfig, elementId?: string): string {
    const id = this.roomBuilder.addDoorByIndex(wallId, config, elementId);
    this.boundsCache.invalidateRoom();
    return id;
  }

  addWindowToRoom(wallId: number, config: DoorWindowConfig, elementId?: string): string {
    const id = this.roomBuilder.addWindowByIndex(wallId, config, elementId);
    this.boundsCache.invalidateRoom();
    return id;
  }

  getRoomWalls(): THREE.Mesh[] {
    return this.roomBoxWalls.map((w) => w.mesh);
  }

  /** Seleciona parede por índice (ex.: ao clicar na lista do painel). Atualiza gizmo e outline. */
  selectWallByIndex(index: number | null): void {
    this.viewerState.setSelectedWallIndex(index !== null && this.roomBoxWalls.some((w) => w.id === index) ? index : null);
    if (this.wallGizmo) {
      if (this.viewerState.getWallEditMode() && this.viewerState.getSelectedWallIndex() !== null) {
        const wall = this.roomBoxWalls.find((w) => w.id === this.viewerState.getSelectedWallIndex())?.mesh;
        if (wall) this.wallGizmo.attach(wall);
      } else {
        this.wallGizmo.detach();
      }
    }
    this.refreshTransformControlsAttachment();
    this.refreshOutlineTarget();
    this.onWallSelected?.(this.viewerState.getSelectedWallIndex());
  }

  selectRoomElementById(elementId: string | null): void {
    this.viewerState.setSelectedRoomElementId(elementId);
    if (elementId) this.viewerState.setSelectedRoomUtilityId(null);
    this.refreshTransformControlsAttachment();
    this.refreshOutlineTarget();
  }

  selectRoomUtilityById(utilityId: string | null): void {
    this.viewerState.setSelectedRoomUtilityId(utilityId);
    if (utilityId) this.viewerState.setSelectedRoomElementId(null);
    this.refreshTransformControlsAttachment();
    this.refreshOutlineTarget();
  }

  setOnBoxSelected(callback: (_id: string | null) => void): void {
    this.onBoxSelected = callback;
  }

  /** LEGACY / NO-OP: callback legado da régua mantido apenas para compatibilidade externa. */
  setOnRulerTick(callback: (() => void) | null): void {
    void callback;
  }

  setOnDoorLayerDoubleClick(callback: ((_boxId: string, _doorLayerId: string) => void) | null): void {
    this.onDoorLayerDoubleClick = callback;
  }

  setOnDrawerLayerDoubleClick(callback: ((_boxId: string, _drawerLayerId: string) => void) | null): void {
    this.onDrawerLayerDoubleClick = callback;
  }

  setOnDrawerLayerClick(callback: ((_boxId: string, _drawerLayerId: string) => void) | null): void {
    this.onDrawerLayerClick = callback;
  }

  setOnBoxDoubleClick(callback: ((_boxId: string) => void) | null): void {
    this.onBoxDoubleClick = callback;
  }

  setOnModelLoaded(callback: ((_boxId: string, _modelId: string, _object: THREE.Object3D) => void) | null): void {
    this.onModelLoaded = callback;
  }

  setOnBoxTransform(callback: ((_boxId: string, _position: { x: number; y: number; z: number }, _rotation: { x: number; y: number; z: number }) => void) | null): void {
    this.onBoxTransform = callback;
  }

  setTransformMode(mode: "translate" | "rotate" | "scale" | null): void {
    this.viewerState.setCurrentTool(mode);
    this.refreshTransformControlsAttachment();
    this.applyTransformControlsMouseGuard();
  }

  /** Delega ao ViewerTools. */
  private refreshTransformControlsAttachment(): void {
    this.viewerTools.updateTransformControlsAttachment();
  }

  private setTransformAttachmentRefreshSuspended(_v: boolean): void {
    void _v;
  }

  private refreshViewerAttachmentsAfterMeshMutation(): void {
    if (this.viewerState.getTransformControlsDragging()) return;
    this.sanitizeStaleViewerReferences();
    this.refreshTransformControlsAttachment();
    this.sanitizeStaleViewerReferences();
    this.refreshOutlineTarget();
    this.validateViewerMeshLifecycle("mesh-mutation");
  }

  private hasPendingViewerVisualSyncs(): boolean {
    return (
      this.pendingViewerVisualSync.orla ||
      this.pendingViewerVisualSync.remate ||
      this.pendingViewerVisualSync.hemati ||
      this.pendingViewerVisualSync.rodape
    );
  }

  private flushDeferredBoxStructureUpdates(): void {
    if (this.viewerState.getTransformControlsDragging()) return;
    if (this.pendingBoxStructureUpdates.size === 0) return;
    const pending = Array.from(this.pendingBoxStructureUpdates.entries());
    this.pendingBoxStructureUpdates.clear();
    pending.forEach(([boxId, options]) => {
      this.updateBox(boxId, options);
    });
  }

  private flushDeferredViewerVisualSyncs(): void {
    if (this.viewerState.getTransformControlsDragging()) return;
    if (!this.hasPendingViewerVisualSyncs()) return;
    const pending = { ...this.pendingViewerVisualSync };
    this.pendingViewerVisualSync.orla = false;
    this.pendingViewerVisualSync.remate = false;
    this.pendingViewerVisualSync.hemati = false;
    this.pendingViewerVisualSync.rodape = false;

    if (pending.orla) this.syncOrlaVisuals();
    if (pending.remate) this.syncRemateVisuals();
    if (pending.hemati) this.syncHematiVisuals();
    if (pending.rodape) this.syncRodapeVisuals();
  }

  private isObjectAttachedToScene(object: THREE.Object3D | null | undefined): boolean {
    let current: THREE.Object3D | null | undefined = object;
    while (current) {
      if (current === this.sceneManager.scene) return true;
      current = current.parent;
    }
    return false;
  }

  private sanitizeStaleViewerReferences(): void {
    if (this.viewerState.getTransformControlsDragging()) return;
    const attached = this.transformControls?.object ?? null;
    if (attached && !this.isObjectAttachedToScene(attached)) {
      this.transformControls?.detach();
      if (this.transformControlsHelper) this.transformControlsHelper.visible = false;
    }
    if (this.selectionOutlineTarget && !this.isObjectAttachedToScene(this.selectionOutlineTarget)) {
      this.selectionOutlineTarget = null;
      this.selectionOutlinePiecesSig = null;
    }
  }

  private incrementLifecycleCount(map: Map<string, number>, id: unknown): void {
    if (typeof id !== "string" || id.length === 0) return;
    map.set(id, (map.get(id) ?? 0) + 1);
  }

  private collectDuplicateLifecycleIds(map: Map<string, number>): string[] {
    return Array.from(map.entries())
      .filter(([, count]) => count > 1)
      .map(([id]) => id);
  }

  private validateViewerMeshLifecycle(reason: string): void {
    if (!import.meta.env.DEV) return;
    const boxRoots = new Map<string, number>();
    const remates = new Map<string, number>();
    const hematis = new Map<string, number>();
    const rodapes = new Map<string, number>();
    const staleBoxRoots: string[] = [];
    const staleFinishMeshes: string[] = [];
    const remateRodapeOverlap: string[] = [];

    this.sceneManager.scene.traverse((node) => {
      if (!node.visible) return;
      const boxId = node.userData?.boxId;
      if (typeof boxId === "string" && boxId.length > 0 && !this.boxes.has(boxId)) {
        staleFinishMeshes.push(`box:${boxId}`);
      }
      if (typeof boxId === "string" && this.boxes.get(boxId)?.mesh === node) {
        this.incrementLifecycleCount(boxRoots, boxId);
      } else if (typeof boxId === "string" && node.name === boxId && this.boxes.get(boxId)?.mesh !== node) {
        staleBoxRoots.push(boxId);
      }
      if (node.userData?.isRematePiece === true) {
        const remateId = node.userData?.remateId;
        this.incrementLifecycleCount(remates, remateId);
        if (node.userData?.remateTipo === "RODAPE" || node.userData?.remateTipo === "RODAPE_L") {
          remateRodapeOverlap.push(String(remateId ?? "unknown"));
        }
      }
      if (node.userData?.isHematiPiece === true && node.userData?.isHematiMergeVisual !== true) {
        this.incrementLifecycleCount(hematis, node.userData?.hematiId);
      }
      if (node.userData?.isRodapePiece === true && node.userData?.isRodapeMergeVisual !== true) {
        this.incrementLifecycleCount(rodapes, node.userData?.rodapeId);
      }
    });

    const issues = {
      duplicateBoxes: this.collectDuplicateLifecycleIds(boxRoots),
      duplicateRemates: this.collectDuplicateLifecycleIds(remates),
      duplicateHematis: this.collectDuplicateLifecycleIds(hematis),
      duplicateRodapes: this.collectDuplicateLifecycleIds(rodapes),
      staleBoxRoots,
      staleFinishMeshes: Array.from(new Set(staleFinishMeshes)),
      remateRodapeOverlap,
      staleTransformTarget: Boolean(this.transformControls?.object && !this.isObjectAttachedToScene(this.transformControls.object)),
      staleOutlineTarget: Boolean(this.selectionOutlineTarget && !this.isObjectAttachedToScene(this.selectionOutlineTarget)),
    };
    const hasIssues = Object.values(issues).some((value) => Array.isArray(value) ? value.length > 0 : value);
    if (hasIssues) {
      devLogger.info("[ViewerCore][LifecycleValidation]", { reason, ...issues });
    }
  }

  selectBox(id: string | null): void {
    this.setSelectedBox(id);
  }

  /**
   * Subscreve alterações da caixa selecionada (mudança de seleção ou updateBox na caixa selecionada).
   * Retorna função para cancelar a assinatura.
   */
  subscribeSelectedBoxChange(callback: (_id: string | null) => void): () => void {
    this.selectedBoxChangeListeners.add(callback);
    return () => {
      this.selectedBoxChangeListeners.delete(callback);
    };
  }

  /** Aplica highlight na caixa (igual a selectBox; exposto para sincronização RightPanel ↔ Viewer). */
  highlightBox(id: string | null): void {
    // Guard-rail: highlight nunca deve limpar seleção ativa.
    // O clear de seleção deve ocorrer apenas por clique explícito fora de box (EventsManager).
    if (id == null) return;
    this.setSelectedBox(id);
  }

  addModelToBox(boxId: string, modelPath: string, modelId?: string): boolean {
    const entry = this.boxes.get(boxId);
    if (!entry) return false;
    if (!modelPath || typeof modelPath !== "string") return false;
    const extension = this.getModelExtension(modelPath);
    if (!extension) return false;
    const id = modelId ?? this.getNextModelId();
    if (entry.cadModels.some((model) => model.id === id)) return false;
    const isCatalogModel = id.startsWith("catalog:");

    this.loadModelObject(modelPath, extension)
      .then((object) => {
        entry.mesh.add(object);
        object.traverse((child) => {
          child.userData.boxId = boxId;
          if (child.layers && typeof child.layers.set === "function") {
            child.layers.set(0);
          }
        });
        if (isCatalogModel) {
          object.userData.isCatalogGlb = true;
          this.storeCatalogBaseSize(object);
          if (entry.cadOnly) {
            this.applyCatalogModelScale(entry, object);
          }
        } else if (entry.cadOnly) {
          this.centerObjectInGroup(object);
        } else {
          object.position.set(0, entry.height / 2, 0);
        }
        entry.cadModels.push({ id, object, path: modelPath });
        this.edgeOutlineSystem?.syncRoot(this.sceneManager.root, this.getEdgeOutlineBoxesMap());
        this.onModelLoaded?.(boxId, id, object);
      })
      .catch(() => {
        // Falha silenciosa conforme especificado
      });

    return true;
  }

  /**
   * Normaliza o pivot do modelo: centro em X/Z na origem do grupo, base no chão (y=0).
   * Usado para modelos do Catálogo e CAD-only para que não nasçam com pivot no meio (centro da tela).
   * Altera apenas object.position (filho); a posição do grupo (entry.mesh) não é tocada.
   */
  private centerObjectInGroup(object: THREE.Object3D): void {
    object.updateMatrixWorld(true);
    this._boundingBox.setFromObject(object);
    this._boundingBox.getCenter(this._center);
    this._boundingBox.getSize(this._size);
    object.position.x = -this._center.x;
    object.position.z = -this._center.z;
    object.position.y = this._size.y / 2;
  }

  /** Guarda o bounding box base do GLB para permitir escala por dimensão. */
  private storeCatalogBaseSize(object: THREE.Object3D): void {
    object.updateMatrixWorld(true);
    this._boundingBox.setFromObject(object);
    this._boundingBox.getSize(this._size);
    object.userData.glbBaseSize = {
      x: Math.max(this._size.x, 0.001),
      y: Math.max(this._size.y, 0.001),
      z: Math.max(this._size.z, 0.001),
    };
  }

  /** Ajusta escala do GLB de catálogo e normaliza pivot (base no chão, centro XZ). Grupo não é movido. */
  private applyCatalogModelScale(
    entry: { width: number; height: number; depth: number },
    object: THREE.Object3D
  ): void {
    const base = object.userData.glbBaseSize as { x: number; y: number; z: number } | undefined;
    if (!base) return;
    const sx = entry.width / Math.max(base.x, 0.001);
    const sy = entry.height / Math.max(base.y, 0.001);
    const sz = entry.depth / Math.max(base.z, 0.001);
    object.scale.set(sx, sy, sz);
    this.centerObjectInGroup(object);
  }

  removeModelFromBox(boxId: string, modelId: string): boolean {
    const entry = this.boxes.get(boxId);
    if (!entry) return false;
    const index = entry.cadModels.findIndex((model) => model.id === modelId);
    if (index === -1) return false;
    const [model] = entry.cadModels.splice(index, 1);
    if (model.object.parent) {
      model.object.parent.remove(model.object);
    }
    this.edgeOutlineSystem?.syncRoot(this.sceneManager.root, this.getEdgeOutlineBoxesMap());
    this.disposeObject(model.object);
    return true;
  }

  clearModelsFromBox(boxId: string): void {
    const entry = this.boxes.get(boxId);
    if (!entry) return;
    entry.cadModels.forEach((model) => {
      if (model.object.parent) {
        model.object.parent.remove(model.object);
      }
      this.disposeObject(model.object);
    });
    entry.cadModels = [];
    this.edgeOutlineSystem?.syncRoot(this.sceneManager.root, this.getEdgeOutlineBoxesMap());
  }

  listModels(boxId: string): Array<{ id: string; path: string }> | null {
    const entry = this.boxes.get(boxId);
    if (!entry) return null;
    return entry.cadModels.map((model) => ({ id: model.id, path: model.path }));
  }

  /** Dimensões da caixa em metros (para layout e auto-posicionamento). */
  getBoxDimensions(boxId: string): { width: number; height: number; depth: number } | null {
    const entry = this.boxes.get(boxId);
    if (!entry) return null;
    return { width: entry.width, height: entry.height, depth: entry.depth };
  }

  getBoxWorldMatrix(boxId: string): THREE.Matrix4 | null {
    const entry = this.boxes.get(boxId);
    if (!entry) return null;
    entry.mesh.updateMatrixWorld(true);
    return entry.mesh.matrixWorld.clone();
  }

  getRemateIdAtPointer(event: { clientX: number; clientY: number }): string | null {
    return this.raycastSystem.getRemateIdAtPointer(event);
  }

  /** Posição do modelo em espaço local da caixa (metros; origem no centro da caixa). */
  getModelPosition(boxId: string, modelId: string): { x: number; y: number; z: number } | null {
    const entry = this.boxes.get(boxId);
    if (!entry) return null;
    const model = entry.cadModels.find((m) => m.id === modelId);
    if (!model) return null;
    const p = model.object.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  /** Tamanho do bounding box do modelo em metros (largura, altura, profundidade). */
  getModelBoundingBoxSize(boxId: string, modelId: string): { width: number; height: number; depth: number } | null {
    const entry = this.boxes.get(boxId);
    if (!entry) return null;
    const model = entry.cadModels.find((m) => m.id === modelId);
    if (!model) return null;
    entry.mesh.updateMatrixWorld(true);
    model.object.updateMatrixWorld(true);
    this._boundingBox.setFromObject(model.object);
    const size = new THREE.Vector3();
    this._boundingBox.getSize(size);
    return { width: size.x, height: size.y, depth: size.z };
  }

  /** Define a posição do modelo em espaço local da caixa (metros; origem no centro da caixa). */
  setModelPosition(boxId: string, modelId: string, position: { x: number; y: number; z: number }): boolean {
    const entry = this.boxes.get(boxId);
    if (!entry) return false;
    const model = entry.cadModels.find((m) => m.id === modelId);
    if (!model) return false;
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      return false;
    }
    model.object.position.set(position.x, position.y, position.z);
    return true;
  }

  setBoxGap(gap: number): boolean {
    this.boxGap = Math.max(0, gap);
    this.reflowBoxes();
    this.updateCameraTarget();
    return true;
  }

  /** LEGACY: alias mantido para integração histórica com useCalculadoraSync. */
  setBoxSpacing(spacing: number): boolean {
    return this.setBoxGap(spacing);
  }

  /** LEGACY: alias mantido para integração histórica com useCalculadoraSync. */
  updateBoxSpacing(spacing: number): boolean {
    return this.setBoxGap(spacing);
  }

  /**
   * Com lock ATIVADO: garante que o mesh não penetre abaixo de Y = 0.
   * Com lock DESATIVADO: não altera posição (permite atravessar o chão).
   */
  private applyFloorConstraint(mesh: THREE.Object3D): void {
    if (!this.lockEnabled) return;
    mesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(this._boundingBox, mesh);
    if (this._boundingBox.min.y < 0) {
      mesh.position.y += -this._boundingBox.min.y;
      mesh.updateMatrixWorld(true);
    }
  }

  /**
   * Garante que a base de todas as caixas (sem manualPosition) fique em Y = 0.
   * Recalcula o bounding box real após exploded view e ajusta position.y para que min.y >= 0.
   * Chamado após o box estar totalmente construído (ex.: após applyExplodedViewForObject).
   */
  private ensureBoxesBaseAtFloor(): void {
    if (this.boxes.size === 0) return;
    this.boxes.forEach((entry) => entry.mesh.updateMatrixWorld(true));
    this._boundingBox.makeEmpty();
    this.boxes.forEach((entry) =>
      expandBox3ByObjectExcludingLayoutProxy(this._boundingBox, entry.mesh)
    );
    const minY = this._boundingBox.min.y;
    if (minY >= 0) return;
    const shiftUp = -minY;
    this.boxes.forEach((entry) => {
      if (!entry.manualPosition) {
        entry.mesh.position.y += shiftUp;
      }
    });
    this.boxes.forEach((entry) => entry.mesh.updateMatrixWorld(true));
  }

  /**
   * Posiciona caixas sem manualPosition lado a lado em X/Z.
   * manualPosition === true: NUNCA alterar position.x, position.y nem position.z.
   */
  reflowBoxes() {
    this.boxManager.reflowBoxes(this.boxGap);
  }

  /** Mantém CameraManager.target e OrbitControls.target sincronizados. */
  private syncCameraTarget(
    center: THREE.Vector3,
    options?: { updateLookAt?: boolean }
  ): void {
    const updateLookAt = options?.updateLookAt !== false;
    if (updateLookAt) {
      this.cameraManager.setTarget(center.x, center.y, center.z);
    } else {
      this.cameraManager.getTarget().copy(center);
    }
    if (this.controls) {
      this.controls.controls.target.copy(center);
      this.controls.update();
    }
  }

  private updateCameraTarget() {
    if (this.boxes.size === 0) {
      if (this.cameraViewPreset == null) {
        this.syncCameraTarget(new THREE.Vector3(0, 0, 0));
      }
      return;
    }
    const camBboxRoots = Array.from(this.boxes.values()).map((e) => e.mesh);
    runWithAllLayoutBoundsProxiesVisible(camBboxRoots, () => {
      this._boundingBox.makeEmpty();
      this.boxes.forEach((entry) => {
        this._boundingBox.expandByObject(entry.mesh);
      });
    });
    this._boundingBox.getCenter(this._center);

    if (this.cameraViewPreset != null) {
      this.syncCameraTarget(this._center, { updateLookAt: false });
      return;
    }

    this.syncCameraTarget(this._center);
  }

  /**
   * Centro do bounding box real do box em mundo (atualiza matriz antes).
   */
  private getBoxBoundingBoxCenter(boxId: string): THREE.Vector3 | null {
    const entry = this.boxes.get(boxId);
    if (!entry) return null;
    entry.mesh.updateMatrixWorld(true);
    runWithLayoutBoundsProxiesVisible(entry.mesh, () => {
      this._boxSingle.setFromObject(entry.mesh);
    });
    this._boxSingle.getCenter(this._center);
    return this._center.clone();
  }

  /**
   * True se o box está (parcialmente) dentro do frustum da câmera.
   */
  private isBoxInCameraFrame(boxId: string): boolean {
    const entry = this.boxes.get(boxId);
    if (!entry) return false;
    entry.mesh.updateMatrixWorld(true);
    this.cameraManager.camera.updateMatrixWorld(true);
    this._projScreenMatrix.multiplyMatrices(
      this.cameraManager.camera.projectionMatrix,
      this.cameraManager.camera.matrixWorldInverse
    );
    this._frustum.setFromProjectionMatrix(this._projScreenMatrix);
    runWithLayoutBoundsProxiesVisible(entry.mesh, () => {
      this._boxSingle.setFromObject(entry.mesh);
    });
    return this._frustum.intersectsBox(this._boxSingle);
  }

  /**
   * Ajusta a posição da câmera para que o box entre no enquadramento (sem saltos bruscos).
   * Só altera a distância ao alvo para caber o box no FOV.
   */
  private adjustCameraPositionToIncludeBox(boxId: string): void {
    const entry = this.boxes.get(boxId);
    if (!entry) return;
    entry.mesh.updateMatrixWorld(true);
    runWithLayoutBoundsProxiesVisible(entry.mesh, () => {
      this._boxSingle.setFromObject(entry.mesh);
    });
    this._boxSingle.getCenter(this._center);
    this._boxSingle.getSize(this._size);
    const cam = this.cameraManager.camera;
    const dir = new THREE.Vector3().subVectors(cam.position, this._center).normalize();
    const maxDim = Math.max(this._size.x, this._size.y, this._size.z, 0.1);
    const fovRad = (cam.fov * Math.PI) / 180;
    const distance = Math.max(0.3, maxDim / (2 * Math.tan(fovRad * 0.5)) * 1.1);
    cam.position.copy(this._center).addScaledVector(dir, distance);
    this.syncCameraTarget(this._center, { updateLookAt: false });
    cam.lookAt(this._center);
    this.controls?.update();
  }

  /**
   * Auto-follow: atualiza o alvo da câmera para o centro do box (sempre o objeto editado).
   * Só move a posição da câmera se onlyMovePositionIfOutOfFrame e o box estiver fora do enquadramento.
   * Com vista pré-definida ativa, só atualiza o alvo (não altera orientação nem posição).
   */
  private updateCameraTargetToBox(
    boxId: string,
    options?: { onlyMovePositionIfOutOfFrame?: boolean }
  ): void {
    const center = this.getBoxBoundingBoxCenter(boxId);
    if (!center) return;

    if (this.cameraViewPreset != null) {
      this.syncCameraTarget(center, { updateLookAt: false });
      return;
    }

    this.syncCameraTarget(center);
    const onlyIfOut = options?.onlyMovePositionIfOutOfFrame === true;
    if (onlyIfOut && !this.isBoxInCameraFrame(boxId)) {
      this.adjustCameraPositionToIncludeBox(boxId);
    }
  }

  private getBoxDimensionsFromOptions(options?: BoxOptions) {
    const width = Math.max(0.001, options?.width ?? options?.size ?? 1);
    const height = Math.max(0.001, options?.height ?? options?.size ?? 1);
    const depth = Math.max(
      0.001,
      options?.layoutDepthM ?? options?.depth ?? options?.size ?? 1
    );
    return { width, height, depth };
  }

  private shouldUseFeetLock(entry: {
    cabinetType?: "lower" | "upper";
    feetEnabled?: boolean;
  }): boolean {
    return entry.cabinetType === "lower" && entry.feetEnabled !== false;
  }

  private shouldRenderFeet(entry: {
    feetEnabled?: boolean;
  }): boolean {
    return entry.feetEnabled === true;
  }

  /** Altura Y (m) fixa para caixas inferiores com pés ativos. */
  private getFixedYForCabinet(entry: {
    height: number;
    cabinetType?: "lower" | "upper";
    pe_cm?: number;
  }): number {
    const h = entry.height;
    if (entry.cabinetType === "lower") {
      const peM = ((entry.pe_cm ?? ViewerCore.HEIGHT_BASE_CM) / 100);
      return peM + h / 2;
    }
    if (entry.cabinetType === "upper") {
      const baseM = ViewerCore.HEIGHT_UPPER_CM / 100;
      return baseM + h / 2;
    }
    return h / 2;
  }

  private removeFeetVisual(root: THREE.Object3D): void {
    const existing = root.getObjectByName("kitchen-feet-group");
    if (!existing) return;
    root.remove(existing);
    const disposedGeometries = new Set<THREE.BufferGeometry>();
    const disposedMaterials = new Set<THREE.Material>();
    existing.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      if (node.geometry && !disposedGeometries.has(node.geometry)) {
        node.geometry.dispose();
        disposedGeometries.add(node.geometry);
      }
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => {
          if (!disposedMaterials.has(material)) {
            material.dispose();
            disposedMaterials.add(material);
          }
        });
      } else if (node.material && !disposedMaterials.has(node.material)) {
        node.material.dispose();
        disposedMaterials.add(node.material);
      }
    });
  }

  private createKitchenFeetGroup(
    width: number,
    height: number,
    depth: number,
    feetHeightM: number,
    feetOffsetFrontM: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = "kitchen-feet-group";
    group.userData.isKitchenFeet = true;

    const headHeight = 0.012;
    const baseHeight = 0.008;
    const bodyHeight = Math.max(0.02, feetHeightM - headHeight - baseHeight);
    const headSize = 0.036;
    const bodyRadius = 0.012;
    const baseRadius = 0.03;

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.32,
      metalness: 0.82,
    });
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.85,
      metalness: 0.1,
    });

    const headGeometry = new THREE.BoxGeometry(headSize, headHeight, headSize);
    const bodyGeometry = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 18);
    const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 22);

    const createFoot = () => {
      const foot = new THREE.Group();
      const topY = -height / 2;
      const head = new THREE.Mesh(headGeometry, metalMat);
      head.position.y = topY - headHeight / 2;
      head.castShadow = true;
      head.receiveShadow = true;

      const body = new THREE.Mesh(bodyGeometry, metalMat);
      body.position.y = topY - headHeight - bodyHeight / 2;
      body.castShadow = true;
      body.receiveShadow = true;

      const base = new THREE.Mesh(baseGeometry, baseMat);
      base.position.y = topY - headHeight - bodyHeight - baseHeight / 2;
      base.castShadow = true;
      base.receiveShadow = true;

      foot.add(head, body, base);
      return foot;
    };

    const widthInsetLimit = Math.max(0.02, width / 2 - baseRadius - 0.005);
    const depthInsetLimit = Math.max(0.02, depth / 2 - baseRadius - 0.005);
    const sideInset = Math.min(ViewerCore.FEET_SIDE_INSET_M, widthInsetLimit);
    const frontInset = Math.min(Math.max(0, feetOffsetFrontM), depthInsetLimit);
    const backInset = Math.min(ViewerCore.FEET_BACK_INSET_M, depthInsetLimit);

    const xLeft = -width / 2 + sideInset;
    const xRight = width / 2 - sideInset;
    const zFront = depth / 2 - frontInset;
    const zBack = -depth / 2 + backInset;

    const placements: Array<{ x: number; z: number }> = [
      { x: xLeft, z: zFront },
      { x: xRight, z: zFront },
      { x: xLeft, z: zBack },
      { x: xRight, z: zBack },
    ];

    placements.forEach(({ x, z }) => {
      const foot = createFoot();
      foot.position.set(x, 0, z);
      group.add(foot);
    });

    return group;
  }

  private syncFeetVisualForBox(
    entry: {
      mesh: THREE.Object3D;
      width: number;
      height: number;
      depth: number;
      cabinetType?: "lower" | "upper";
      pe_cm?: number;
      feetHeight?: number;
      feetOffsetFront?: number;
      feetEnabled?: boolean;
    }
  ): void {
    this.removeFeetVisual(entry.mesh);
    if (!this.shouldRenderFeet(entry)) return;
    const feetHeightMm = Math.max(40, entry.feetHeight ?? ((entry.pe_cm ?? ViewerCore.HEIGHT_BASE_CM) * 10));
    const feetOffsetFrontMm = Math.max(0, entry.feetOffsetFront ?? (ViewerCore.FEET_FRONT_INSET_M * 1000));
    const feet = this.createKitchenFeetGroup(
      entry.width,
      entry.height,
      entry.depth,
      feetHeightMm / 1000,
      feetOffsetFrontMm / 1000
    );
    entry.mesh.add(feet);
  }

  private getNextBoxIndex() {
    if (this.boxes.size === 0) return 0;
    let maxIndex = -1;
    this.boxes.forEach((entry) => {
      if (entry.index > maxIndex) {
        maxIndex = entry.index;
      }
    });
    return maxIndex + 1;
  }

  private getNextModelId() {
    this.modelCounter += 1;
    return `model-${this.modelCounter}`;
  }

  private getModelExtension(path: string) {
    const lower = path.toLowerCase();
    // Data URLs (ex.: upload GLB em base64) não têm extensão no fim
    if (lower.startsWith("data:")) {
      if (lower.includes("gltf-binary") || lower.includes("model/gltf") || lower.includes("model/gltf-binary")) return "glb";
      if (lower.includes("model/gltf+json")) return "gltf";
      return null;
    }
    const match = lower.match(/\.(glb|gltf|obj|stl)$/);
    return match ? match[1] : null;
  }

  private loadModelObject(path: string, extension: string): Promise<THREE.Object3D> {
    if (extension === "glb" || extension === "gltf") {
      return loadGLB(path);
    }
    if (extension === "obj") {
      const loader = new OBJLoader();
      return loader.loadAsync(path);
    }
    if (extension === "stl") {
      const loader = new STLLoader();
      return loader.loadAsync(path).then((geometry) => {
        const material = new THREE.MeshStandardMaterial({ color: "#d1d5db", roughness: 0.8 });
        return new THREE.Mesh(geometry, material);
      });
    }
    return Promise.reject(new Error("Unsupported model format"));
  }

  private updateModelsVerticalPosition(entry: {
    cadModels: Array<{ object: THREE.Object3D }>;
    height: number;
  }) {
    entry.cadModels.forEach((model) => {
      model.object.position.y = entry.height / 2;
    });
  }

  private disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  /** API mínima para o EventsManager (handlers de canvas). */
  private getEventEngineApi(): IViewerEventEngine {
    return {
      getCanvas: () => this.rendererManager.renderer.domElement,
      getTransformControlsDragging: () => this.viewerState.getTransformControlsDragging(),
      getSuppressNextCanvasClick: () => this.viewerState.getSuppressNextCanvasClick(),
      setSuppressNextCanvasClick: (v) => { this.viewerState.setSuppressNextCanvasClick(v); },
      getHighlightEnabled: () => this.viewerState.getHighlightEnabled(),
      getHighlightManager: () => this.highlightManager,
      getHighlightIntersects: (e) => this.getHighlightIntersects(e),
      getBoxIdByMesh: (mesh) => this.getBoxIdByMesh(mesh),
      setSelectedBox: (id) => this.setSelectedBox(id),
      setHoveredBox: (id) => this.setHoveredBox(id),
      setHoveredRemate: (id) => this.setHoveredRemate(id),
      getOnRoomElementSelected: () => this.onRoomElementSelected,
      getOnRoomUtilitySelected: () => this.onRoomUtilitySelected,
      getOnWallSelected: () => this.onWallSelected,
      getOnBoxSelected: () => this.onBoxSelected,
      getOnMultiSelectToggle: () => this.onMultiSelectToggle,
      getOnRemateSelected: () => this.onRemateSelected,
      getPlacementMode: () => this.viewerState.getPlacementMode(),
      getOnRoomElementPlaced: () => this.onRoomElementPlaced,
      getWallHitAtPointer: (e) => this.getWallHitAtPointer(e),
      getRoomBuilder: () => this.roomBuilder,
      setPlacementMode: (mode) => this.viewerState.setPlacementMode(mode),
      getBoxIdAtPointer: (e) => this.getBoxIdAtPointer(e),
      getHematiIdAtPointer: (e) => this.getHematiIdAtPointer(e),
      getRodapeIdAtPointer: (e) => this.getRodapeIdAtPointer(e),
      getRemateIdAtPointer: (e) => this.getRemateIdAtPointer(e),
      selectHemati: (id) => this.selectHemati(id),
      selectRodape: (id) => this.selectRodape(id),
      selectRemate: (id) => this.selectRemate(id),
      getSelectedBoxId: () => this.viewerState.getSelectedBox(),
      getSelectedRemateId: () => this.viewerState.getSelectedRemate(),
      getRoomElementAtPointer: (e) => this.getRoomElementAtPointer(e),
      getSelectedWallIndex: () => this.viewerState.getSelectedWallIndex(),
      setSelectedWallIndex: (v) => { this.viewerState.setSelectedWallIndex(v); },
      getSelectedRoomElementId: () => this.viewerState.getSelectedRoomElementId(),
      setSelectedRoomElementId: (v) => { this.viewerState.setSelectedRoomElementId(v); },
      getSelectedRoomUtilityId: () => this.viewerState.getSelectedRoomUtilityId(),
      setSelectedRoomUtilityId: (v) => { this.viewerState.setSelectedRoomUtilityId(v); },
      getRoomUtilityAtPointer: (e) => this.getRoomUtilityAtPointer(e),
      refreshTransformControlsAttachment: () => this.refreshTransformControlsAttachment(),
      setTransformAttachmentRefreshSuspended: (v) => this.setTransformAttachmentRefreshSuspended(v),
      refreshOutlineTarget: () => this.refreshOutlineTarget(),
      getRoomBoxWalls: () => this.roomBoxWalls,
      getWallGizmo: () => this.wallGizmo,
      getWallEditMode: () => this.viewerState.getWallEditMode(),
      getWallIdAtPointer: (e) => this.getWallIdAtPointer(e),
      logTransformDiagnostic: (name, data) => this.logTransformDiagnostic(name, data),
      getTransformGizmoIntersections: (e) => this.getTransformGizmoIntersections(e),
      getWallGizmoDragging: () => this.viewerState.getWallGizmoDragging(),
      setWallGizmoDragging: (v) => { this.viewerState.setWallGizmoDragging(v); },
      getDoorHitAtPointer: (e) => this.getDoorHitAtPointer(e),
      getDrawerHitAtPointer: (e) => this.getDrawerHitAtPointer(e),
      getBoxBodyHitAtPointer: (e) => this.getBoxBodyHitAtPointer(e),
      getLayerSelectionHitAtPointer: (e) => this.getContextMenuLayerHit(e),
      encodeLayerHitToSelectionId: (hit) => encodeSelectionIdFromLayerHit(hit),
      getPointerSelectionEncodedId: (e) => this.getPointerSelectionEncodedId(e),
      getOnDoorLayerDoubleClick: () => this.onDoorLayerDoubleClick,
      getOnDrawerLayerDoubleClick: () => this.onDrawerLayerDoubleClick,
      getOnDrawerLayerClick: () => this.onDrawerLayerClick,
      getOnBoxDoubleClick: () => this.onBoxDoubleClick,
      getPointerActionForButton: (button) => {
        const mapping = getMouseInputMapping(this.mouseInputPreset);
        return getPointerActionForButton(mapping, button);
      },
      shouldBlockPointerDownForSelection: (button) => {
        const mapping = getMouseInputMapping(this.mouseInputPreset);
        return shouldBlockPointerDownForSelection(mapping, button);
      },
      setCameraControlsEnabled: (enabled) => {
        if (this.controls?.controls) this.controls.controls.enabled = enabled;
      },
      getInternalSelectionEnabled: () => this.viewerState.getInternalSelectionEnabled(),
      getInternalSelectionHit: (e) => this.getInternalSelectionHit(e),
      setInternalSelection: (selection) => this.setInternalSelection(selection),
      getPointerWorldHit: (event) => {
        const hit = this.raycastSystem.getPointerWorldHit(event);
        return hit ? { x: hit.x, y: hit.y, z: hit.z } : null;
      },
      setTransformGizmoAnchor: (point) => this.viewerState.setTransformGizmoAnchor(point),
    };
  }

  /** API mínima para o ViewerTools (attachment, outline, clamp). */
  private getToolsEngineApi(): IViewerToolsEngine {
    return {
      getTransformControls: () => this.transformControls,
      getTransformControlsHelper: () => this.transformControlsHelper,
      getCurrentTool: () => this.viewerState.getCurrentTool(),
      getSelectedBoxId: () => this.viewerState.getSelectedBox(),
      getSelectedHematiId: () => this.viewerState.getSelectedHemati(),
      getSelectedRodapeId: () => this.viewerState.getSelectedRodape(),
      getSelectedRemateId: () => this.viewerState.getSelectedRemate(),
      getHematiMesh: (hematiId) => this.getHematiMesh(hematiId),
      getRodapeMesh: (rodapeId) => this.getRodapeMesh(rodapeId),
      getRemateMesh: (remateId) => this.getRemateMesh(remateId),
      getBoxEntry: (id) => this.boxes.get(id),
      getSelectedWallIndex: () => this.viewerState.getSelectedWallIndex(),
      getRoomBoxWalls: () => this.roomBoxWalls,
      getSelectedRoomElementId: () => this.viewerState.getSelectedRoomElementId(),
      getRoomElementById: (id) => this.roomBuilder.getElementById(id),
      getSelectedRoomUtilityId: () => this.viewerState.getSelectedRoomUtilityId(),
      getRoomUtilityById: (id) => this.getRoomUtilityById(id),
      getTransformGizmoSizeForBox: (entry) => this.getTransformGizmoSizeForBox(entry),
      setTransformHelperVisible: (visible) => {
        if (this.transformControlsHelper) this.transformControlsHelper.visible = visible;
      },
      applyTransformControlsMouseGuard: () => this.applyTransformControlsMouseGuard(),
      logTransformDiagnostic: (name, data) => this.logTransformDiagnostic(name, data),
      getSelectionOutline: () => this.selectionOutline,
      getSelectionOutlineMaterial: () => this.selectionOutlineMaterial,
      getHoveredBoxId: () => this.viewerState.getHoveredBox(),
      getHoveredRemateId: () => this.viewerState.getHoveredRemate(),
      getBoxesIntersectingWalls: () => this.boxesIntersectingWalls,
      setOutlineTarget: (mesh, opacity, colorHex) => this.setOutlineTarget(mesh, opacity, colorHex),
      clampTransform: () => this.clampTransform(),
      getGroupGizmo: () => {
        if (!this.groupGizmo) throw new Error("GroupGizmo not initialized");
        return this.groupGizmo;
      },
      getGroupTransformMemberIds: () => this.viewerState.getGroupTransformMemberIds(),
      resolveMemberMesh: (encoded) => this.resolveMemberMesh(encoded),
      applyGroupPivotTransform: () => this.applyGroupPivotTransform(),
      notifyGroupTransform: () => this.notifyGroupTransform(),
      clampGroupTransform: () => this.clampGroupTransform(),
    };
  }

  private hasVisibleAncestorsForOutline(node: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = node;
    while (current) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  }

  private clearSelectionOutlineHelpers(): void {
    const g = this.selectionOutline;
    if (!g) return;
    while (g.children.length > 0) {
      const ch = g.children[0];
      g.remove(ch);
      if (ch instanceof THREE.LineSegments) {
        ch.geometry.dispose();
        if (ch.material && ch.material !== this.selectionOutlineMaterial) {
          (ch.material as THREE.Material).dispose();
        }
      }
    }
  }

  /** Assinatura layout (L×A×P externo) para reconstruir geometria do contorno azul quando as dimensões mudam. */
  private isRemateOutlineTarget(target: THREE.Object3D): boolean {
    return (
      target.userData?.isRematePiece === true ||
      (typeof target.userData?.remateId === "string" && target.userData.remateId.length > 0)
    );
  }

  private getRemateOutlineDimensions(target: THREE.Object3D): { w: number; h: number; d: number } | null {
    if (!(target instanceof THREE.Mesh)) return null;
    const geo = target.geometry;
    if (!(geo instanceof THREE.BufferGeometry)) return null;
    geo.computeBoundingBox();
    const size = new THREE.Vector3();
    geo.boundingBox?.getSize(size);
    return {
      w: Math.max(0.001, size.x * target.scale.x),
      h: Math.max(0.001, size.y * target.scale.y),
      d: Math.max(0.001, size.z * target.scale.z),
    };
  }

  private getSelectionOutlinePiecesSignature(target: THREE.Object3D): string {
    if (this.isRemateOutlineTarget(target)) {
      const remateId = String(target.userData?.remateId ?? target.uuid);
      const dims = this.getRemateOutlineDimensions(target);
      return `remate:${remateId}:${dims?.w ?? 0}:${dims?.h ?? 0}:${dims?.d ?? 0}`;
    }
    const boxId =
      typeof target.userData?.boxId === "string" && target.userData.boxId.trim().length > 0
        ? target.userData.boxId.trim()
        : "";
    if (!boxId) return `${target.uuid}:no-boxId`;
    const entry = this.boxes.get(boxId);
    if (!entry) return `${target.uuid}:no-entry`;
    return `${boxId}:${entry.width}:${entry.height}:${entry.depth}:${entry.carcassDepth ?? "u"}:${entry.cadOnly ? 1 : 0}`;
  }

  /** Um único wireframe L×A×P de layout (`ViewerBoxEntry`), alinhado ao grupo da caixa em mundo. */
  private rebuildSelectionOutlinePieceHelpers(target: THREE.Object3D): void {
    if (!this.selectionOutline || !this.selectionOutlineMaterial) return;
    this.clearSelectionOutlineHelpers();
    const group = this.selectionOutline;

    if (this.isRemateOutlineTarget(target)) {
      const dims = this.getRemateOutlineDimensions(target);
      if (!dims) return;
      const boxGeo = new THREE.BoxGeometry(dims.w, dims.h, dims.d);
      const edges = new THREE.EdgesGeometry(boxGeo);
      boxGeo.dispose();
      const wireframe = new THREE.LineSegments(edges, this.selectionOutlineMaterial);
      wireframe.name = "selection-outline-layout";
      wireframe.raycast = () => null;
      wireframe.frustumCulled = false;
      wireframe.renderOrder =
        typeof target.userData?.remateOutlineRenderOrder === "number"
          ? target.userData.remateOutlineRenderOrder
          : 2001;
      wireframe.matrixAutoUpdate = false;
      group.add(wireframe);
      return;
    }

    const boxId =
      typeof target.userData?.boxId === "string" && target.userData.boxId.trim().length > 0
        ? target.userData.boxId.trim()
        : "";
    const entry = boxId ? this.boxes.get(boxId) : undefined;
    if (!entry) return;

    const w = Math.max(0.001, entry.width);
    const h = Math.max(0.001, entry.height);
    const d = Math.max(0.001, entry.carcassDepth ?? entry.depth);
    const boxGeo = new THREE.BoxGeometry(w, h, d);
    const edges = new THREE.EdgesGeometry(boxGeo);
    boxGeo.dispose();

    const wireframe = new THREE.LineSegments(edges, this.selectionOutlineMaterial);
    wireframe.name = "selection-outline-layout";
    wireframe.raycast = () => null;
    wireframe.frustumCulled = false;
    wireframe.renderOrder = 2001;
    wireframe.matrixAutoUpdate = false;
    group.add(wireframe);
  }

  private updateSelectionOutlineGeometry(target: THREE.Object3D): void {
    if (!this.selectionOutline) return;
    const sig = this.getSelectionOutlinePiecesSignature(target);
    if (this.selectionOutlinePiecesSig !== sig) {
      this.selectionOutlinePiecesSig = sig;
      this.rebuildSelectionOutlinePieceHelpers(target);
    }
    target.updateMatrixWorld(true);
    const show = this.hasVisibleAncestorsForOutline(target);
    for (const child of this.selectionOutline.children) {
      if (child instanceof THREE.LineSegments && child.name === "selection-outline-layout") {
        child.visible = show;
        if (show) {
          child.matrix.copy(target.matrixWorld);
        }
      }
    }
  }

  private setOutlineTarget(mesh: THREE.Object3D | null, opacity: number, colorHex: number): void {
    this.selectionOutlineTarget = mesh;
    this.outlineTargetOpacity = opacity;
    if (!this.selectionOutline || !this.selectionOutlineMaterial) return;
    if (!mesh) {
      this.clearSelectionOutlineHelpers();
      this.selectionOutlinePiecesSig = null;
      this.selectionOutline.visible = false;
      return;
    }
    this.selectionOutlineMaterial.color.setHex(colorHex);
    this.selectionOutlineMaterial.needsUpdate = true;
    this.selectionOutline.visible = true;
    this.updateSelectionOutlineGeometry(mesh);
  }

  /** Obtém boxId a partir de um mesh (grupo ou filho/GLB); sobe na hierarquia até encontrar userData.boxId ou o grupo da caixa. */
  private getBoxIdByMesh(mesh: THREE.Object3D): string | null {
    return this.raycastSystem.getBoxIdByMesh(mesh);
  }

  private setSelectedBox(id: string | null) {
    if (import.meta.env.DEV) {
      devLogger.debug("[SELECTION][ViewerCore] setSelectedBox:entrada", {
        nextBoxId: id,
        currentSelectionBefore: this.viewerState.getSelectedBox(),
        callerStack:
          id == null
            ? new Error("[SELECTION] setSelectedBox(null) trace").stack
            : undefined,
      });
    }
    if (this.viewerState.getSelectedBox() === id) {
      if (import.meta.env.DEV) {
        devLogger.debug("[SELECTION][ViewerCore] setSelectedBox:sem-mudanca", {
          sameBoxId: id,
        });
      }
      if (import.meta.env.DEV) {
        devLogger.debug("[SELECTION][ViewerCore] onBoxSelected:emit", {
          boxId: id,
          reason: "same-selection-short-circuit",
        });
      }
      this.onBoxSelected?.(id);
      return;
    }
    this.viewerState.setSelectedBox(id);
    this.viewerState.setSelectedRemate(null);
    this.viewerState.setSelectedWallIndex(null);
    this.viewerState.setSelectedRoomElementId(null);
    this.viewerState.clearGroupTransformMemberIds();
    this.refreshTransformControlsAttachment();
    this.refreshOutlineTarget();
    if (import.meta.env.DEV) {
      devLogger.debug("[SELECTION][ViewerCore] setSelectedBox:apos-update-state", {
        nextBoxId: id,
        currentSelectionAfter: this.viewerState.getSelectedBox(),
      });
      devLogger.debug("[SELECTION][ViewerCore] onBoxSelected:emit", {
        boxId: id,
      });
    }
    this.onBoxSelected?.(id);
    this.selectedBoxChangeListeners.forEach((cb) => {
      try {
        cb(id);
      } catch {
        /* ignore */
      }
    });
    if (id == null) {
      this.measurementOverlay.onSelectionChanged(null);
      this.internalRulerEngine.onSelectionChanged(null);
      this.setInternalSelection(null);
      return;
    }
    this.measurementOverlay.onSelectionChanged(id);
    this.internalRulerEngine.onSelectionChanged(id);
  }

  /** Fim de drag unificado — evita duplicação mouseUp + dragging-changed. */
  private finishTransformDrag(_source: "mouseUp" | "dragging-changed"): void {
    const stamp = performance.now();
    if (stamp - this.transformDragEndStamp < 8) return;
    this.transformDragEndStamp = stamp;
    this.dragStartZForShiftLock = undefined;
    this.viewerState.setTransformControlsDragging(false);
    this.overlayCoordinator.clearTransientOverlays();
    this.smartSnappingEngine.onDragEnd();
    this.remateSmartSnapping.onDragEnd();
    this.viewerState.setSuppressNextCanvasClick(true);
    if (this.groupGizmo?.isActive()) {
      this.notifyGroupTransform();
    }
    this.viewerTools.restoreTransformGizmoPivot();
    this.viewerTools.applyCurrentTool();
    this.notifyBoxTransform();
    this.notifyRemateTransform();
    this.notifyHematiTransform();
    this.notifyRodapeTransform();
    this.notifyWallTransform();
    this.notifyRoomElementTransform();
    this.notifyRoomUtilityTransform();
    historyManager.endDragSession();
    this.onTransformDragEnd?.();
    this.flushDeferredBoxStructureUpdates();
    this.flushDeferredViewerVisualSyncs();
    this.refreshViewerAttachmentsAfterMeshMutation();
  }

  private notifyRemateTransform(): void {
    const remateId = this.viewerState.getSelectedRemate();
    if (!remateId) return;
    const mesh = this.remateVisualizer.getMeshByRemateId(remateId);
    if (!mesh) return;
    const p = mesh.position;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      console.warn("[sanity] posição inválida em notifyRemateTransform — ignorado");
      return;
    }
    const boxId = mesh.userData.boxId as string | undefined;
    const entry = boxId ? this.boxes.get(boxId) : undefined;

    const tool = this.viewerState.getCurrentTool();
    if (tool === "scale") {
      mesh.geometry.computeBoundingBox();
      const size = new THREE.Vector3();
      mesh.geometry.boundingBox?.getSize(size);
      const widthMm = Math.max(1, size.x * mesh.scale.x * 1000);
      const heightMm = Math.max(1, size.y * mesh.scale.y * 1000);
      const depthMm = Math.max(1, size.z * mesh.scale.z * 1000);
      mesh.scale.set(1, 1, 1);
      this.onRemateTransform?.(remateId, {
        width: widthMm,
        height: heightMm,
        depth: depthMm,
        placementMode: "FREE",
      });
      return;
    }

    if (entry?.mesh && boxId) {
      entry.mesh.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(entry.mesh.matrixWorld).invert();
      const local = mesh.position.clone().applyMatrix4(inv);
      const localQuat = new THREE.Quaternion().copy(mesh.quaternion);
      const boxQuat = new THREE.Quaternion().setFromRotationMatrix(entry.mesh.matrixWorld);
      const invBoxQuat = boxQuat.clone().invert();
      localQuat.premultiply(invBoxQuat);
      const euler = new THREE.Euler().setFromQuaternion(localQuat);

      const position = {
        xMm: local.x * 1000,
        yMm: local.y * 1000,
        zMm: local.z * 1000,
      };
      const rotation = { xRad: euler.x, yRad: euler.y, zRad: euler.z };

      const piece = this.remateVisualBridge?.listRematePieces().find((r) => r.id === remateId);
      let faceOffsets = piece?.faceOffsets;
      if (piece?.parentBoxId) {
        const cfg = this.remateVisualBridge?.getBoxConfig(boxId);
        if (cfg) {
          const bounds = getRemateEnvelopeBoundsM(cfg.widthM, cfg.heightM, cfg.depthM, cfg.box ?? null);
          const slot = piece.mountSlot ?? resolveMountSlot(piece);
          const frame = computeMountFrameM(bounds, slot);
          const snapIdx =
            tool === "rotate"
              ? rotationSnapIndexFromLocalY(rotation.yRad)
              : piece?.faceOffsets?.rotationSnapIndex;
          faceOffsets = faceOffsetsFromPositionM(frame, position, snapIdx);
        }
      }

      this.onRemateTransform?.(remateId, {
        position,
        rotation,
        placementMode: "FREE",
        ...(faceOffsets ? { faceOffsets } : {}),
      });
      return;
    }

    this.onRemateTransform?.(remateId, {
      position: {
        xMm: mesh.position.x * 1000,
        yMm: mesh.position.y * 1000,
        zMm: mesh.position.z * 1000,
      },
      rotation: {
        xRad: mesh.rotation.x,
        yRad: mesh.rotation.y,
        zRad: mesh.rotation.z,
      },
      placementMode: "FREE",
    });
  }

  private notifyHematiTransform(): void {
    const hematiId = this.viewerState.getSelectedHemati();
    if (!hematiId) return;
    const mesh = this.hematiVisualizer.getMeshByHematiId(hematiId);
    if (!mesh) return;
    const boxId = mesh.userData.boxId as string | undefined;
    if (!boxId) return;
    const entry = this.boxes.get(boxId);
    if (!entry) return;
    entry.mesh.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(entry.mesh.matrixWorld).invert();
    const local = mesh.position.clone().applyMatrix4(inv);
    this.onHematiTransform?.(hematiId, {
      transform: {
        xMm: local.x * 1000,
        yMm: local.y * 1000,
        zMm: local.z * 1000,
        rotacaoXRad: mesh.rotation.x,
        rotacaoYRad: mesh.rotation.y,
        rotacaoZRad: mesh.rotation.z,
      },
      placementFree: true,
    });
  }

  private notifyRodapeTransform(): void {
    const rodapeId = this.viewerState.getSelectedRodape();
    if (!rodapeId) return;
    const mesh = this.rodapeVisualizer.getMeshByRodapeId(rodapeId);
    if (!mesh) return;
    const boxId = mesh.userData.boxId as string | undefined;
    if (!boxId) return;
    const entry = this.boxes.get(boxId);
    if (!entry) return;
    entry.mesh.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(entry.mesh.matrixWorld).invert();
    const local = mesh.position.clone().applyMatrix4(inv);
    this.onRodapeTransform?.(rodapeId, {
      transform: {
        xMm: local.x * 1000,
        yMm: local.y * 1000,
        zMm: local.z * 1000,
        rotacaoXRad: mesh.rotation.x,
        rotacaoYRad: mesh.rotation.y,
        rotacaoZRad: mesh.rotation.z,
      },
      placementFree: true,
    });
  }

  /**
   * Após sync visual (painel/teclado), reaplica colisão e propaga posição corrigida ao estado.
   */
  resolveFinishCollisionAfterSync(params: { remateId?: string; rodapeId?: string }): void {
    const { remateId, rodapeId } = params;
    if (remateId) {
      const mesh = this.remateVisualizer.getMeshByRemateId(remateId);
      if (!mesh) return;
      const piece = this.remateVisualBridge?.listRematePieces().find((r) => r.id === remateId);
      const boxId = piece?.parentBoxId ?? (mesh.userData.boxId as string | undefined);
      this.applyFinishCollisionConstraint(mesh, boxId, remateId);
      const prev = this.viewerState.getSelectedRemate();
      if (prev !== remateId) this.viewerState.setSelectedRemate(remateId);
      this.notifyRemateTransform();
      if (prev !== remateId) this.viewerState.setSelectedRemate(prev);
      return;
    }
    if (rodapeId) {
      const mesh = this.rodapeVisualizer.getMeshByRodapeId(rodapeId);
      if (!mesh) return;
      const boxId = mesh.userData.boxId as string | undefined;
      this.applyFinishCollisionConstraint(mesh, boxId, undefined, rodapeId);
      const prev = this.viewerState.getSelectedRodape();
      if (prev !== rodapeId) this.viewerState.setSelectedRodape(rodapeId);
      this.notifyRodapeTransform();
      if (prev !== rodapeId) this.viewerState.setSelectedRodape(prev);
    }
  }

  private applyFinishCollisionConstraint(
    movingMesh: THREE.Object3D,
    excludeBoxId: string | undefined,
    excludeRemateId?: string,
    excludeRodapeId?: string
  ): void {
    if (!this.lockEnabled) return;

    const otherMeshes: THREE.Object3D[] = [];
    for (const piece of this.remateVisualBridge?.listRematePieces() ?? []) {
      if (piece.id === excludeRemateId) continue;
      const mesh = this.remateVisualizer.getMeshByRemateId(piece.id);
      if (mesh) otherMeshes.push(mesh);
    }
    for (const cfg of this.rodapeVisualBridge?.listBoxRodapeConfigs() ?? []) {
      for (const rodape of cfg.rodapes) {
        if (rodape.id === excludeRodapeId) continue;
        const mesh = this.rodapeVisualizer.getMeshByRodapeId(rodape.id);
        if (mesh) otherMeshes.push(mesh);
      }
    }

    applyFinishMovementConstraints({
      movingMesh,
      boxes: this.boxes,
      excludeBoxIds: excludeBoxId ? new Set([excludeBoxId]) : undefined,
      otherMeshes,
      applyFloorConstraint: (mesh) => this.applyFloorConstraint(mesh),
      roomBounds: this.roomBounds,
      roomWallMeshes: this.roomBoxWalls.map((w) => w.mesh),
      isInsideRoom: (mesh) => this.isMeshInsideOrTouchingRoom(mesh),
    });
  }

  private buildDisabledSmartSnapContext(): SmartAlignSnapContext {
    return {
      boxes: this.boxes,
      captureRadiusM: 0,
      magnetStrength: 0,
      rematePieces: [],
      rodapes: [],
      getBoxConfig: () => null,
      getWorldAabb: (mesh) => {
        mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(mesh);
        return { min: box.min.clone(), max: box.max.clone(), center: box.getCenter(new THREE.Vector3()) };
      },
      roomBounds: null,
      roomBoundsFull: this.roomBounds,
      roomOpenings: [],
      wallOffsetMm: this.smartSnappingEngine.getWallOffset(),
      explicitModeActive: false,
      allEntities: [],
    };
  }

  private refineLayoutPlan(_plan: import("./autoLayout/autoLayoutTypes").AutoLayoutPlan): void {}

  private generateIntelligentDesigns(seedBoxId: string): boolean {
    const designs = this.intelligentDesignerEngine.buildDesigns(seedBoxId);
    if (!designs.length) return false;
    const overlays = this.predictiveLayoutEngine.previewDesigns(
      designs.map((d) => ({ id: d.id, plan: d.plan, label: d.label }))
    );
    if (overlays[0]) {
      this.smartAlignSnapOverlay.setState(
        this.predictiveLayoutEngine.showDesignPreview(0) ?? { visible: false, mode: "predictive", guides: [] }
      );
    }
    return true;
  }

  private previewIntelligentDesign(id: DesignVariantId): boolean {
    const state = this.predictiveLayoutEngine.showDesignById(id);
    if (!state) return false;
    this.smartAlignSnapOverlay.setState(state);
    return true;
  }

  private applyIntelligentDesign(id: DesignVariantId): boolean {
    const ok = this.intelligentDesignerEngine.applyDesign(id);
    if (ok) this.clearSmartAlignSnapOverlay();
    return ok;
  }

  private acceptPredictiveLayoutPending(): boolean {
    const pending = this.predictiveLayoutEngine.getPending();
    if (!pending) return false;
    const previews = this.predictiveLayoutEngine.getDesignPreviews();
    const activeEntry = previews[this.predictiveLayoutEngine.getActiveDesignIndex()];
    const ok = this.predictiveLayoutEngine.applyPending();
    if (ok) {
      if (activeEntry && isEnvironmentStyleId(activeEntry.id)) {
        this.intelligentDesignerEngine.getBehaviorStore().learnStylePreference(activeEntry.id);
      }
      this.refineLayoutPlan(pending.plan);
      this.clearSmartAlignSnapOverlay();
    }
    return ok;
  }

  private acceptConversationalPending(): boolean {
    const pending = this.predictiveLayoutEngine.getPending();
    if (!pending) return false;
    const ok = this.acceptPredictiveLayoutPending();
    if (ok) {
      this.designConversationState.recordApplied({
        plan: pending.plan,
        label: pending.label,
      });
    }
    return ok;
  }

  private previewIntelligentStyle(styleId: EnvironmentStyleId, seedBoxId: string): boolean {
    const result = this.intelligentDesignerEngine.buildStyleDesign(styleId, seedBoxId);
    if (!result) return false;
    const { overlay } = buildPredictiveLayoutResult(this.predictiveLayoutEngine, result.plan, result.label);
    this.predictiveLayoutEngine.previewDesigns([{ id: styleId, plan: result.plan, label: result.label }]);
    this.smartAlignSnapOverlay.setState(overlay);
    return true;
  }

  private applyIntelligentStyle(styleId: EnvironmentStyleId, seedBoxId: string): boolean {
    const ok = this.intelligentDesignerEngine.applyStyle(styleId, seedBoxId);
    if (ok) this.clearSmartAlignSnapOverlay();
    return ok;
  }

  private applyAdminRulesSettings(): void {
    const snap = getSnapRules();
    const room = getRoomRules();
    this.smartSnappingEngine.setCaptureRadius(snap.captureRadiusMm);
    this.smartSnappingEngine.setMagnetStrength(snap.magnetStrength);
    this.smartSnappingEngine.setGridSize(snap.gridSizeMm);
    this.smartSnappingEngine.setWallOffset(room.wallOffsetMm);
  }

  private resolveCostSeedBoxId(): string {
    return (
      this.designConversationState.getSeedBoxId() ??
      this.smartLayoutBridge?.getWorkspaceBoxes().find((b) => !b.locked)?.id ??
      ""
    );
  }

  private buildCostScanContext(): import("./snapping/costTypes").CostScanContext {
    const ctx = this.buildManufacturingScanContext();
    return {
      boxes: ctx.boxes,
      remates: ctx.remates,
      rodapes: ctx.rodapes,
      bounds: ctx.bounds,
      openings: ctx.openings,
      wallOffsetMm: ctx.wallOffsetMm,
    };
  }

  private previewCostSuggestion(suggestion: CostSuggestion): void {
    const { overlay } = buildPredictiveLayoutResult(
      this.predictiveLayoutEngine,
      suggestion.plan,
      suggestion.label
    );
    this.predictiveLayoutEngine.previewDesigns([
      { id: `cost-${suggestion.kind}`, plan: suggestion.plan, label: suggestion.label },
    ]);
    this.smartAlignSnapOverlay.setState(overlay);
  }

  private previewCostSuggestionByTier(
    seedBoxId: string,
    tier: "cheaper" | "premium" | "balanced"
  ): boolean {
    this.designConversationState.setSeedBoxId(seedBoxId);
    this.costReportEngine.scanProject();
    const suggestion =
      tier === "cheaper"
        ? this.costReportEngine.suggestCheaperAlternative()
        : tier === "premium"
          ? this.costReportEngine.suggestPremiumAlternative()
          : this.costReportEngine.suggestBalancedAlternative();
    if (!suggestion) return false;
    this.previewCostSuggestion(suggestion);
    return true;
  }

  private buildManufacturingScanContext(): import("./snapping/manufacturingTypes").ManufacturingScanContext {
    const bridge = this.smartLayoutBridge;
    const rodapeConfigs = this.rodapeVisualBridge?.listBoxRodapeConfigs() ?? [];
    const rodapes = rodapeConfigs.flatMap((cfg) => cfg.rodapes);
    return {
      boxes: bridge?.getWorkspaceBoxes() ?? [],
      remates: this.remateVisualBridge?.listRematePieces() ?? [],
      rodapes,
      bounds: bridge?.getRoomBoundsMm() ?? null,
      openings: bridge?.getOpeningsMm() ?? [],
      wallOffsetMm: bridge?.getWallOffsetMm() ?? this.smartSnappingEngine.getWallOffset(),
    };
  }

  private previewManufacturingFixes(): boolean {
    const fixPlan = this.manufacturingReportEngine.buildFixPreview();
    if (!fixPlan || !fixPlan.plan.moveBoxes.length) return false;
    const { overlay } = buildPredictiveLayoutResult(
      this.predictiveLayoutEngine,
      fixPlan.plan,
      fixPlan.label
    );
    this.predictiveLayoutEngine.previewDesigns([
      { id: "manufacturing-fix", plan: fixPlan.plan, label: fixPlan.label },
    ]);
    this.smartAlignSnapOverlay.setState(overlay);
    return true;
  }

  private applyManufacturingSuggestedFixes(): boolean {
    const pending = this.predictiveLayoutEngine.getPending();
    if (pending?.label.includes("Auto-Manufacturing")) {
      return this.acceptPredictiveLayoutPending();
    }
    const result = this.manufacturingReportEngine.autoFix();
    return result.ok;
  }

  private generateIntelligentVariations(): boolean {
    const variations = this.intelligentDesignerEngine.generateVariations();
    if (!variations.length) return false;
    const overlays = this.predictiveLayoutEngine.previewDesigns(
      variations.map((v, i) => ({
        id: `V${i + 1}`,
        plan: v.plan,
        label: v.label,
      }))
    );
    if (overlays[0]) {
      this.smartAlignSnapOverlay.setState(
        this.predictiveLayoutEngine.showDesignPreview(0) ?? { visible: false, mode: "predictive", guides: [] }
      );
    }
    return true;
  }

  private clearSmartAlignSnapOverlay(): void {
    this.smartAlignSnapOverlay.clear();
  }

  private previewSmartWallFill(wallId: string | number, moduleBoxId: string): boolean {
    const plan = this.autoWallFillEngine.buildPlan({
      wallId,
      moduleBoxId,
      alignTop: true,
      alignFront: true,
    });
    if (!plan) return false;
    const { overlay } = buildPredictiveLayoutResult(
      this.predictiveLayoutEngine,
      plan,
      "Auto-Wall-Fill sugerido"
    );
    this.smartAlignSnapOverlay.setState(overlay);
    return true;
  }

  /** Só chamado em objectChange (arraste do utilizador). Nunca na criação da caixa. */
  private clampTransform() {
    if (this.groupGizmo?.isActive()) {
      this.clampGroupTransform();
      return;
    }
    if (this.viewerState.getSelectedRoomElementId() || this.viewerState.getSelectedRoomUtilityId()) {
      this.clampSelectedWallChildTransform();
      return;
    }

    const selectedRemateId = this.viewerState.getSelectedRemate();
    const isDragging = this.viewerState.getTransformControlsDragging();
    const currentTool = this.viewerState.getCurrentTool();

    if (selectedRemateId) {
      const mesh = this.remateVisualizer.getMeshByRemateId(selectedRemateId);
      const obj = this.transformControls?.object;
      if (isDragging && mesh && obj === mesh) {
        const piece = this.remateVisualBridge?.listRematePieces().find((r) => r.id === selectedRemateId);
        const boxId = piece?.parentBoxId ?? (mesh.userData.boxId as string | undefined);
        const entry = boxId ? this.boxes.get(boxId) : undefined;

        if (currentTool === "translate" && entry && piece && boxId) {
          const cfg = this.remateVisualBridge?.getBoxConfig(boxId);
          if (cfg) {
            this.remateSmartSnapping.applyDuringTranslate({
              mesh,
              boxEntry: entry,
              boxConfig: cfg,
            });
          }
        } else if (currentTool === "translate" && piece && !boxId) {
          this.remateSmartSnapping.applyStandaloneGridSnap(mesh);
        } else if (currentTool === "rotate") {
          applyRemateRotationSnapToMesh(mesh, entry?.mesh ?? null);
        }

        if (currentTool === "translate" && mesh && obj === mesh) {
          const boxId = piece?.parentBoxId ?? (mesh.userData.boxId as string | undefined);
          this.applyFinishCollisionConstraint(mesh, boxId, selectedRemateId);
        }
      }
      return;
    }

    if (this.viewerState.getSelectedHemati()) {
      return;
    }

    const selectedRodapeId = this.viewerState.getSelectedRodape();
    if (selectedRodapeId) {
      const mesh = this.rodapeVisualizer.getMeshByRodapeId(selectedRodapeId);
      const obj = this.transformControls?.object;
      if (isDragging && mesh && obj === mesh && currentTool === "translate") {
        const boxId = mesh.userData.boxId as string | undefined;
        this.applyFinishCollisionConstraint(mesh, boxId, undefined, selectedRodapeId);
      }
      return;
    }

    const selectedBoxId = this.viewerState.getSelectedBox();
    if (selectedBoxId && isDragging && currentTool === "translate") {
      const entry = this.boxes.get(selectedBoxId);
      const obj = this.transformControls?.object;
      if (entry && obj === entry.mesh) {
        this.smartSnappingEngine.applyDuringTranslate({
          mesh: entry.mesh,
          selectedBoxId,
          boxes: this.boxes,
          isDragging,
          currentTool,
          roomBounds: this.roomBounds,
        });
      }
    }

    this.constraints.clampTransform({
      transformControls: this.transformControls,
      selectedBoxId: this.viewerState.getSelectedBox(),
      selectedWallIndex: this.viewerState.getSelectedWallIndex(),
      boxes: this.boxes,
      currentTool: this.viewerState.getCurrentTool(),
      lockEnabled: this.lockEnabled,
      roomBounds: this.roomBounds,
      roomBoxWalls: this.roomBoxWalls,
      applyFloorConstraint: (obj) => this.applyFloorConstraint(obj),
      applyRoomConstraint: (obj, options) => this.applyRoomConstraint(obj, options),
      isMeshInsideOrTouchingRoom: (obj) => this.isMeshInsideOrTouchingRoom(obj),
      clearSnapState: (obj) => this.clearSnapState(obj),
      shouldUseFeetLock: (entry) => this.shouldUseFeetLock(entry),
      getFixedYForCabinet: (entry) => this.getFixedYForCabinet(entry),
      updateBoxesIntersectingWalls: () => this.updateBoxesIntersectingWalls(),
      setLastSnapDebugData: (data) => {
        this.lastSnapDebugData = data;
      },
    });
  }

  private clampSelectedWallChildTransform(): void {
    const selectedId = this.viewerState.getSelectedRoomElementId() ?? this.viewerState.getSelectedRoomUtilityId();
    if (!selectedId) return;
    const object =
      this.viewerState.getSelectedRoomElementId()
        ? this.roomBuilder.getElementById(selectedId)
        : this.getRoomUtilityById(selectedId);
    if (!object || !(object.parent instanceof THREE.Mesh)) return;
    const wall = object.parent as THREE.Mesh;
    const wallLenMm = (wall.userData.wallLengthMm as number | undefined) ?? 1000;
    const wallHeightMm = (wall.userData.wallHeightMm as number | undefined) ?? 2600;
    const wallLenM = wallLenMm / 1000;
    const wallHeightM = wallHeightMm / 1000;
    object.position.z = ((wall.userData.wallThicknessM as number | undefined) ?? 0.12) / 2 + 0.04;
    const widthMm =
      this.viewerState.getSelectedRoomElementId()
        ? ((object.userData.config as DoorWindowConfig | undefined)?.widthMm ?? 0)
        : 0;
    const heightMm =
      this.viewerState.getSelectedRoomElementId()
        ? ((object.userData.config as DoorWindowConfig | undefined)?.heightMm ?? 0)
        : 0;
    const minX = -wallLenM / 2 + widthMm / 2000;
    const maxX = wallLenM / 2 - widthMm / 2000;
    const minY = -wallHeightM / 2 + heightMm / 2000;
    const maxY = wallHeightM / 2 - heightMm / 2000;
    object.position.x = THREE.MathUtils.clamp(object.position.x, minX, maxX);
    object.position.y = THREE.MathUtils.clamp(object.position.y, minY, maxY);
  }

  private computeDistanceToNearestBox(): RulerMeasurementHit | null {
    const selectedBoxId = this.viewerState.getSelectedBox();
    if (!selectedBoxId) return null;
    const selectedEntry = this.boxes.get(selectedBoxId);
    if (!selectedEntry) return null;

    selectedEntry.mesh.updateMatrixWorld(true);
    const selectedThree = new THREE.Box3();
    setBox3FromObjectExcludingLayoutProxy(selectedThree, selectedEntry.mesh);
    const selectedAabb = aabb3FromThreeBox3(selectedThree);

    let best: ParametricRulerHit | null = null;
    this.boxes.forEach((entry, id) => {
      if (id === selectedBoxId) return;
      entry.mesh.updateMatrixWorld(true);
      const otherBox = new THREE.Box3();
      setBox3FromObjectExcludingLayoutProxy(otherBox, entry.mesh);
      const otherAabb = aabb3FromThreeBox3(otherBox);
      const hit = nearestBoxGapBetweenPair(selectedAabb, otherAabb);
      if (hit && (!best || hit.distanceM < best.distanceM)) best = hit;
    });
    return best ? parametricRulerHitToThree(best) : null;
  }

  private computeDistanceToNearestWall(): RulerMeasurementHit | null {
    const selectedBoxId = this.viewerState.getSelectedBox();
    if (!selectedBoxId) return null;
    const selectedEntry = this.boxes.get(selectedBoxId);
    if (!selectedEntry || !this.roomBounds) return null;

    selectedEntry.mesh.updateMatrixWorld(true);
    const wallSelBox = new THREE.Box3();
    setBox3FromObjectExcludingLayoutProxy(wallSelBox, selectedEntry.mesh);
    const boxAabb = aabb3FromThreeBox3(wallSelBox);
    const hit = nearestWallMeasurement(boxAabb, {
      minX: this.roomBounds.minX,
      maxX: this.roomBounds.maxX,
      minZ: this.roomBounds.minZ,
      maxZ: this.roomBounds.maxZ,
    });
    return hit ? parametricRulerHitToThree(hit) : null;
  }

  private computeDistanceToFloor(): RulerMeasurementHit | null {
    const selectedBoxId = this.viewerState.getSelectedBox();
    if (!selectedBoxId) return null;
    const selectedEntry = this.boxes.get(selectedBoxId);
    if (!selectedEntry) return null;

    selectedEntry.mesh.updateMatrixWorld(true);
    const floorSelBox = new THREE.Box3();
    setBox3FromObjectExcludingLayoutProxy(floorSelBox, selectedEntry.mesh);
    const boxAabb = aabb3FromThreeBox3(floorSelBox);
    const floorY = this.roomBounds?.minY ?? 0;
    const hit = floorClearanceMeasurement(boxAabb, floorY);
    return hit ? parametricRulerHitToThree(hit) : null;
  }

  /** Atualiza o conjunto de caixas que intersectam paredes (para destaque quando lock desativado). */
  private updateBoxesIntersectingWalls(): void {
    this.boxesIntersectingWalls.clear();
    if (this.lockEnabled) return;
    const roomWalls = this.roomBoxWalls.map((w) => w.mesh);
    if (!roomWalls.length) return;
    const wallBox = new THREE.Box3();
    roomWalls.forEach((wall) => {
      wall.updateMatrixWorld(true);
      wallBox.union(new THREE.Box3().setFromObject(wall));
    });
    this.boxes.forEach((entry, boxId) => {
      entry.mesh.updateMatrixWorld(true);
      const box = new THREE.Box3();
      setBox3FromObjectExcludingLayoutProxy(box, entry.mesh);
      if (box.intersectsBox(wallBox)) this.boxesIntersectingWalls.add(boxId);
    });
  }

  /** Esconde a parede que está entre a câmera e o centro da sala. */
  private updateWallVisibilityBasedOnCamera(): void {
    if (!this.roomBounds) return;
    const cam = this.cameraManager.camera;
    const wallsMain = this.roomBoxWalls
      .map((w) => w.mesh)
      .filter((m) => m.userData?.isMainWall === true);

    updateWallCulling(cam, this.roomBounds, wallsMain);
    this.applyRoomWallVisibility();
  }

  private applyRoomWallVisibility(): void {
    this.roomBoxWalls.forEach((entry) => {
      if (!this.hiddenRoomWallIds.has(entry.id)) return;
      entry.mesh.visible = false;
      entry.mesh.children.forEach((child) => {
        if (child.userData?.elementId || child.userData?.roomUtilityId) child.visible = false;
      });
    });

    // Override manual continua com prioridade.
    if (this.manualHiddenWallId !== null) {
      this.roomBoxWalls.forEach((entry) => {
        if (entry.id === this.manualHiddenWallId) {
          entry.mesh.visible = false;
        }
      });
    }
  }

  private getWallIdInFrontOfCamera(): number | null {
    return this.raycastSystem.getWallIdInFrontOfCamera();
  }

  /** Esconde/mostra uma parede manualmente. Auto-hide continua ativo. */
  setManualWallHidden(active: boolean): void {
    if (!active) {
      this.manualHiddenWallId = null;
      this.roomBoxWalls.forEach((w) => {
        w.mesh.visible = true;
      });
      return;
    }
    const wallId = this.viewerState.getSelectedWallIndex() ?? this.getWallIdInFrontOfCamera();
    if (wallId === null) return;
    this.manualHiddenWallId = wallId;
    this.roomBoxWalls.forEach((w) => {
      if (w.id === wallId) w.mesh.visible = false;
    });
  }

  getManualWallHidden(): boolean {
    return this.manualHiddenWallId !== null;
  }

  /**
   * Restringe a caixa aos limites da sala.
   * Sempre: nunca sair de [0→width]×[0→depth]. Com lock ON: usar limites internos (inset) para não entrar no muro.
   */
  private applyRoomConstraint(movingMesh: THREE.Object3D, options: { ignoreY?: boolean } = {}): void {
    if (!this.roomBounds) return;
    movingMesh.updateMatrixWorld(true);
    const movingBox = new THREE.Box3();
    setBox3FromObjectExcludingLayoutProxy(movingBox, movingMesh);
    const inset = this.lockEnabled ? ViewerCore.WALL_INNER_INSET_M : 0;
    const off = this.lockEnabled ? ViewerCore.SNAP_WALL_OFFSET_M : 0;
    const minX = this.roomBounds.minX + inset + off;
    const maxX = this.roomBounds.maxX - inset - off;
    const minZ = this.roomBounds.minZ + inset + off;
    const maxZ = this.roomBounds.maxZ - inset - off;
    const minY = this.roomBounds.minY;
    const maxY = this.roomBounds.maxY;
    let dx = 0;
    let dy = 0;
    let dz = 0;
    if (movingBox.min.x < minX) dx += minX - movingBox.min.x;
    if (movingBox.max.x > maxX) dx -= movingBox.max.x - maxX;
    if (movingBox.min.z < minZ) dz += minZ - movingBox.min.z;
    if (movingBox.max.z > maxZ) dz -= movingBox.max.z - maxZ;
    if (!options.ignoreY) {
      if (movingBox.min.y < minY) dy += minY - movingBox.min.y;
      if (movingBox.max.y > maxY) dy -= movingBox.max.y - maxY;
    }
    if (dx !== 0 || dy !== 0 || dz !== 0) {
      movingMesh.position.x += dx;
      movingMesh.position.y += dy;
      movingMesh.position.z += dz;
    }
  }

  /** Espessura das paredes (m) do Room Box. */
  private static readonly ROOM_WALL_THICKNESS_M = 0.12;
  /** Recuo (m) do limite interno da parede; com lock ON a caixa não entra no muro. */
  private static readonly WALL_INNER_INSET_M = 0.06;
  /** Offset (m) da caixa em relação ao plano da parede para evitar Z-fighting (0.5 cm). */
  private static readonly SNAP_WALL_OFFSET_M = 0.005;
  /** Altura da base do armário inferior (PE) em cm; base da caixa fica a esta altura do piso. */
  private static readonly HEIGHT_BASE_CM = 10;
  /** Altura em cm do piso à base da caixa superior (wall cabinet). */
  private static readonly HEIGHT_UPPER_CM = 150;
  /** Recuo frontal dos pés (m): 100 mm. */
  private static readonly FEET_FRONT_INSET_M = 0.1;
  /** Recuo traseiro dos pés (m). */
  private static readonly FEET_BACK_INSET_M = 0.06;
  /** Recuo lateral dos pés (m). */
  private static readonly FEET_SIDE_INSET_M = 0.06;

  /** Filho do grupo da caixa: volume L×A×P de layout para AABB de câmara (layer dedicada; não entra em raycast/reflow/colisão). */
  private static readonly VIEWER_LAYOUT_BOUNDS_NAME = "viewer-layout-bounds";

  private getEdgeOutlineBoxesMap(): ReadonlyMap<string, EdgeOutlineBoxEntry> {
    const map = new Map<string, EdgeOutlineBoxEntry>();
    this.boxes.forEach((entry, id) => {
      map.set(id, {
        mesh: entry.mesh,
        width: entry.width,
        height: entry.height,
        carcassDepth: entry.carcassDepth,
        depth: entry.depth,
        cadOnly: entry.cadOnly,
      });
    });
    return map;
  }

  /**
   * Proxy L×A×P de layout: `visible: false` no render; só `visible: true` temporariamente em
   * `runWithLayoutBoundsProxiesVisible` para bbox de câmara. Material não escreve cor/depth.
   */
  private attachLayoutBoundsMesh(entry: ViewerBoxEntry): void {
    const name = ViewerCore.VIEWER_LAYOUT_BOUNDS_NAME;
    const existing = entry.mesh.getObjectByName(name);
    if (existing) {
      entry.mesh.remove(existing);
      if (existing instanceof THREE.Mesh) {
        existing.geometry.dispose();
        const mat = existing.material;
        if (!Array.isArray(mat) && mat instanceof THREE.Material) mat.dispose();
      }
    }
    entry.layoutBoundsMesh = undefined;
    if (entry.cadOnly) return;

    const w = Math.max(0.001, entry.width);
    const h = Math.max(0.001, entry.height);
    const d = Math.max(0.001, entry.depth);
    const geom = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      colorWrite: false,
    });
    const m = new THREE.Mesh(geom, mat);
    m.name = name;
    m.renderOrder = -999999;
    m.frustumCulled = false;
    m.raycast = () => null;
    m.userData.viewerLayoutBounds = true;
    m.layers.set(VIEWER_LAYOUT_PROXY_LAYER);
    entry.mesh.add(m);
    m.visible = false;
    entry.layoutBoundsMesh = m;
  }

  /**
   * Caixa segue lógica da sala apenas quando está dentro ou encostada ao perímetro em X/Z.
   * Caixas totalmente fora da sala ficam livres (sem auto-rotate/snap da sala).
   */
  private isMeshInsideOrTouchingRoom(movingMesh: THREE.Object3D, tolerance = 0.02): boolean {
    if (!this.roomBounds) return false;
    movingMesh.updateMatrixWorld(true);
    const box = new THREE.Box3();
    setBox3FromObjectExcludingLayoutProxy(box, movingMesh);
    const { minX, maxX, minZ, maxZ } = this.roomBounds;
    return !(
      box.max.x < minX - tolerance ||
      box.min.x > maxX + tolerance ||
      box.max.z < minZ - tolerance ||
      box.min.z > maxZ + tolerance
    );
  }

  private getRoomOpeningsForSnapping(): import("./snapping/smartSnappingTypes").RoomOpeningLike[] {
    const gen = this.boundsCache.getRoomGeneration();
    return this.boundsCache.getRoomOpenings(gen, () => {
      const out: import("./snapping/smartSnappingTypes").RoomOpeningLike[] = [];
      const box = this._boundingBox;
      for (const el of this.roomBuilder.getElements()) {
        const group = this.roomBuilder.getElementById(el.elementId);
        if (!group) continue;
        group.updateMatrixWorld(true);
        box.setFromObject(group);
        if (box.isEmpty()) continue;
        out.push({
          elementId: el.elementId,
          type: el.type,
          min: box.min.clone(),
          max: box.max.clone(),
        });
      }
      return out;
    });
  }

  private notifyBoxTransform() {
    if (!this.viewerState.getSelectedBox()) return;
    const entry = this.boxes.get(this.viewerState.getSelectedBox());
    if (!entry) return;
    const p = entry.mesh.position;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      console.warn("[sanity] posição inválida em notifyBoxTransform — ignorado");
      return;
    }
    const { x, y, z } = p;
    const r = entry.mesh.rotation;
    this.onBoxTransform?.(this.viewerState.getSelectedBox(), { x, y, z }, { x: r.x, y: r.y, z: r.z });
  }

  private clearSnapState(object: THREE.Object3D): void {
    const snapData = object.userData as Record<string, unknown>;
    delete snapData.currentWallId;
    delete snapData.lastWallId;
    delete snapData.movementDirection;
    delete snapData.lastSnapPosition;
  }

  private getTransformGizmoSizeForBox(entry: { width: number; height: number; depth: number }): number {
    const maxDimension = Math.max(entry.width, entry.height, entry.depth);
    return THREE.MathUtils.clamp(maxDimension * 0.45, 0.22, 0.5);
  }

  private notifyWallTransform() {
    if (this.viewerState.getSelectedWallIndex() === null) return;
    const wall = this.roomBoxWalls.find((w) => w.id === this.viewerState.getSelectedWallIndex())?.mesh;
    if (!wall) return;
    const rotationDeg = (wall.rotation.y * 180) / Math.PI;
    if (
      this.roomManager?.room &&
      this.roomManager.locked &&
      this.viewerState.getSelectedWallIndex() >= 0 &&
      this.viewerState.getSelectedWallIndex() <= 3
    ) {
      this.roomManager.onMainWallTransformed(
        this.viewerState.getSelectedWallIndex(),
        { x: wall.position.x, z: wall.position.z },
        rotationDeg
      );
    }
    const wallAfter = this.roomBoxWalls.find((w) => w.id === this.viewerState.getSelectedWallIndex())?.mesh;
    if (wallAfter && this.onWallTransform) {
      const { x, z } = wallAfter.position;
      const rotDeg = (wallAfter.rotation.y * 180) / Math.PI;
      this.onWallTransform(this.viewerState.getSelectedWallIndex(), { x, z }, rotDeg);
    }
    this.roomManager?.refreshDynamicBounds();
  }

  private notifyRoomElementTransform() {
    if (!this.viewerState.getSelectedRoomElementId() || !this.onRoomElementTransform) return;
    const element = this.roomBuilder.getElementById(this.viewerState.getSelectedRoomElementId());
    if (!element || !element.parent) return;
    const wall = element.parent as THREE.Mesh;
    const wallLenMm = (wall.userData.wallLengthMm as number) ?? 4000;
    const wallHeightMm = (wall.userData.wallHeightMm as number) ?? 2800;
    const wallLenM = wallLenMm * 0.001;
    element.updateMatrixWorld(true);
    wall.updateMatrixWorld(true);
    const localPos = new THREE.Vector3();
    element.getWorldPosition(localPos);
    wall.worldToLocal(localPos);
    const cur = element.userData.config as DoorWindowConfig;
    let horizontalOffsetMm = (localPos.x + wallLenM / 2) * 1000 - cur.widthMm / 2;
    let floorOffsetMm = localPos.y * 1000 - cur.heightMm / 2;
    horizontalOffsetMm = Math.max(0, Math.min(wallLenMm - cur.widthMm, horizontalOffsetMm));
    floorOffsetMm = Math.max(0, Math.min(wallHeightMm - cur.heightMm, floorOffsetMm));
    horizontalOffsetMm = snapHorizontalOffset(horizontalOffsetMm, cur.widthMm, wallLenMm, true);
    const config: DoorWindowConfig = {
      ...cur,
      horizontalOffsetMm,
      floorOffsetMm,
    };
    this.onRoomElementTransform(this.viewerState.getSelectedRoomElementId(), config);
  }

  private notifyRoomUtilityTransform() {
    const utilityId = this.viewerState.getSelectedRoomUtilityId();
    if (!utilityId || !this.onRoomUtilityTransform) return;
    const utility = this.getRoomUtilityById(utilityId);
    if (!utility || !(utility.parent instanceof THREE.Mesh)) return;
    const wall = utility.parent as THREE.Mesh;
    const wallLenMm = (wall.userData.wallLengthMm as number | undefined) ?? 1000;
    const wallHeightMm = (wall.userData.wallHeightMm as number | undefined) ?? 2600;
    const wallLenM = wallLenMm / 1000;
    let positionAlongWall = (utility.position.x + wallLenM / 2) * 1000;
    let heightMm = (utility.position.y + wallHeightMm / 2000) * 1000;
    positionAlongWall = Math.max(0, Math.min(wallLenMm, positionAlongWall));
    heightMm = Math.max(0, Math.min(wallHeightMm, heightMm));
    this.onRoomUtilityTransform(utilityId, { positionAlongWall, heightMm });
  }

  private loadMaterial(materialName: string): LoadedWoodMaterial | null {
    const result = materialEngineLoadMaterial(materialName, getMaterialMode(), {
      useLacqueredClearcoat: this.materialQuality === "lacquered",
    });
    return result as LoadedWoodMaterial | null;
  }

  /** Delega ao ViewerTools. */
  private refreshOutlineTarget(): void {
    this.viewerTools.updateOutline();
  }

  private setHoveredBox(id: string | null) {
    if (this.viewerState.getHoveredBox() === id) return;
    this.viewerState.setHoveredBox(id);
    if (id != null) this.viewerState.setHoveredRemate(null);
    this.refreshOutlineTarget();
  }

  private setHoveredRemate(id: string | null) {
    if (this.viewerState.getHoveredRemate() === id) return;
    this.viewerState.setHoveredRemate(id);
    if (id != null) this.viewerState.setHoveredBox(null);
    this.refreshOutlineTarget();
  }

  private getHighlightIntersects(event: { clientX: number; clientY: number }): THREE.Intersection[] {
    return this.raycastSystem.getHighlightIntersects(event);
  }

  private getBoxIdAtPointer(event: { clientX: number; clientY: number }) {
    return this.raycastSystem.getBoxIdAtPointer(event);
  }

  /**
   * Obtém boxId a partir de um mesh (para uso externo, ex.: régua).
   */
  getBoxIdByMeshPublic(mesh: THREE.Object3D): string | null {
    return this.getBoxIdByMesh(mesh);
  }

  private getDoorHitAtPointer(event: { clientX: number; clientY: number }): { boxId: string; doorLayerId: string } | null {
    return this.raycastSystem.getDoorHitAtPointer(event);
  }

  private getDrawerHitAtPointer(event: { clientX: number; clientY: number }): { boxId: string; drawerLayerId: string } | null {
    return this.raycastSystem.getDrawerHitAtPointer(event);
  }

  private getBoxBodyHitAtPointer(event: { clientX: number; clientY: number }): { boxId: string } | null {
    return this.raycastSystem.getBoxBodyHitAtPointer(event);
  }

  /**
   * Retorna o alvo do ponteiro para o menu de contexto: porta, gaveta ou null (módulo/canvas).
   * Raycast nos boxes; para o primeiro hit que tenha getDoorLayerIdByMesh ou getDrawerLayerIdByMesh, devolve boxId + type + doorLayerId/drawerLayerId.
   * Depende de userData.doorLayerId propagado em createDoorObject e de userData.boxId em applyPanelIdsToBox.
   */
  getContextMenuLayerHit(event: { clientX: number; clientY: number }): MouseMenuTarget | null {
    return this.raycastSystem.getContextMenuLayerHit(event);
  }

  private getWallIdAtPointer(event: { clientX: number; clientY: number }): number | null {
    return this.raycastSystem.getWallIdAtPointer(event);
  }

  private getWallHitAtPointer(event: { clientX: number; clientY: number }): {
    wallId: number;
    config: DoorWindowConfig;
    type: "door" | "window";
  } | null {
    const mode = this.viewerState.getPlacementMode();
    if (!mode || !this.onRoomElementPlaced) return null;
    return this.raycastSystem.getWallPlacementHit(event, mode);
  }

  private getRoomElementAtPointer(event: { clientX: number; clientY: number }): {
    elementId: string;
    wallId: number;
    type: "door" | "window";
    config: DoorWindowConfig;
  } | null {
    return this.raycastSystem.getRoomElementAtPointer(event);
  }

  private getRoomUtilityAtPointer(event: { clientX: number; clientY: number }): {
    utilityId: string;
    wallId: number;
    config: ProjectRoomUtility;
  } | null {
    const rect = this.rendererManager.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.cameraManager.camera);
    const roots: THREE.Object3D[] = [];
    this.roomBoxWalls.forEach((entry) => {
      entry.mesh.children.forEach((child) => {
        if (child.userData?.roomUtilityId) roots.push(child);
      });
    });
    const hit = this.raycaster.intersectObjects(roots, true)[0];
    if (!hit) return null;
    let node: THREE.Object3D | null = hit.object;
    while (node && !node.userData?.roomUtilityId) node = node.parent;
    if (!node) return null;
    const wall = node.parent instanceof THREE.Mesh ? node.parent : null;
    const wallEntry = wall ? this.roomBoxWalls.find((entry) => entry.mesh === wall) : null;
    const config = node.userData.roomUtility as ProjectRoomUtility | undefined;
    if (!wallEntry || !config) return null;
    return { utilityId: config.id, wallId: wallEntry.id, config };
  }

  private updateCanvasSize = () => {
    this.runtimeLoop.onResize();
    this.measurementOverlay.resize();
    this.internalRulerEngine.resize();
    this.internalRulerOverlay?.resize();
    this.smartSnappingEngine.resize();
  };

  private start() {
    this.runtimeLoop.start();
  }

  private onBeforeRenderTick(): void {
    if (!this._diagnosticsLogged) {
      this._diagnosticsLogged = true;
      const exp = this.rendererManager.renderer.toneMappingExposure;
      if (exp <= 0) {
        this.rendererManager.renderer.toneMappingExposure = 1.05;
      }
      const { keyLight, fillLight, ambient, hemisphere } = this.lights;
      if (keyLight.intensity <= 0) keyLight.intensity = 0.55;
      if (fillLight.intensity <= 0) fillLight.intensity = 0.15;
      if (ambient.intensity <= 0) ambient.intensity = 0.4;
      if (hemisphere.intensity <= 0) hemisphere.intensity = 0.35;
    }
    if (this.cameraManager.camera.position.y < 0.3) {
      this.cameraManager.camera.position.y = 0.3;
    }
    this.controls?.update();
    if (!this.ultraPerformanceMode) {
      const r = this.rendererManager.renderer;
      r.shadowMap.enabled = true;
      if (r.shadowMap.type !== THREE.PCFSoftShadowMap) r.shadowMap.type = THREE.PCFSoftShadowMap;
      this.lights.keyLight.castShadow = true;
    }
    this.lerpLightsToTarget();
    this.updateDimensionsOverlay();
    this.updateWallVisibilityBasedOnCamera();
    this.wallGizmo?.update();
    if (this.snapDebugOverlay && this.lastSnapDebugData) {
      this.snapDebugOverlay.update(this.lastSnapDebugData);
    }
    if (this.selectionOutline && this.selectionOutlineMaterial) {
      this.outlineCurrentOpacity += (this.outlineTargetOpacity - this.outlineCurrentOpacity) * 0.25;
      const shouldShow = this.outlineCurrentOpacity > 0.02 && this.selectionOutlineTarget;
      if (shouldShow && this.selectionOutlineTarget) {
        this.selectionOutline.visible = true;
        this.updateSelectionOutlineGeometry(this.selectionOutlineTarget);
      } else if (!shouldShow) {
        this.selectionOutline.visible = false;
      }
      this.selectionOutlineMaterial.opacity = Math.max(0, Math.min(1, this.outlineCurrentOpacity));
      this.selectionOutlineMaterial.needsUpdate = true;
    }
    this.multiSelectionOutline?.updateMatrices();

    this.highlightManager?.update();
    this.edgeOutlineSystem?.update();
    this.overlayCoordinator.refreshFrame(performance.now());

    if (this.reflectionsEnabled) {
      this.reflectionFrameCounter += 1;
      if (this.reflectionFrameCounter >= this.reflectionUpdateIntervalFrames) {
        this.reflectionFrameCounter = 0;
        this.updateReflectionProbe(false);
      }
    }

    if (this.wallSelectionOutline && this.wallSelectionOutlineMaterial) {
      const wallEntry = this.viewerState.getSelectedWallIndex() !== null
        ? this.roomBoxWalls.find((w) => w.id === this.viewerState.getSelectedWallIndex())
        : null;
      if (wallEntry) {
        this.wallSelectionOutline.visible = true;
        this.wallSelectionOutline.update(wallEntry.mesh);
      } else {
        this.wallSelectionOutline.visible = false;
      }
    }
  }

  private onAfterRenderTick(): void {
    // Hook reservado para pós-frame.
  }

  saveSnapshot(): import("../../context/projectTypes").ViewerSnapshot | null {
    return this.snapshotRenderer?.saveSnapshot() ?? null;
  }

  restoreSnapshot(snapshot: import("../../context/projectTypes").ViewerSnapshot | null): void {
    this.snapshotRenderer?.restoreSnapshot(snapshot);
  }


  async renderScene(options: ViewerRenderOptions): Promise<ViewerRenderResult | null> {
    return this.renderExporter.renderScene(options);
  }

  dispose() {
    this.runtimeLoop.stop();
    window.removeEventListener("resize", this.updateCanvasSize);
    window.removeEventListener("keydown", this.boundShiftKeyDown);
    window.removeEventListener("keyup", this.boundShiftKeyUp);
    this.disposeComposer();
    this.disposeMainComposer();
    this.controls?.dispose();
    if (this.transformControls) {
      this.transformControls.detach();
      if (this.transformControlsHelper) {
        this.sceneManager.scene.remove(this.transformControlsHelper);
        this.transformControlsHelper = null;
      }
      this.transformControls.dispose();
      this.transformControls = null;
    }
    this.autoLayoutEngine?.bindBridge(null);
    this.orlaVisualizer.bindBridge(null);
    this.orlaVisualizer.dispose();
    this.remateVisualBridge = null;
    this.remateVisualizer.bindBridge(null);
    this.remateVisualizer.dispose();
    this.hematiVisualizer.bindBridge(null);
    this.hematiVisualizer.dispose();
    this.rodapeVisualBridge = null;
    this.rodapeVisualizer.bindBridge(null);
    this.rodapeVisualizer.dispose();
    this.overlayCoordinator.dispose();
    this.onBoxTransform = null;
    this.onBoxSelected = null;
    this.onMultiSelectToggle = null;
    this.onInternalSurfaceSelected = null;
    this.onInternalEdgeSelected = null;
    this.onInternalPointSelected = null;
    this.onDoorLayerDoubleClick = null;
    this.onDrawerLayerDoubleClick = null;
    this.onDrawerLayerClick = null;
    this.onBoxDoubleClick = null;
    this.onModelLoaded = null;
    this.eventsManager?.unregister();
    this.eventsManager = null;
    if (this.wallGizmo) {
      this.wallGizmo.dispose();
      this.sceneManager.scene.remove(this.wallGizmo.group);
      this.wallGizmo = null;
    }
    if (this.snapDebugOverlay) {
      this.snapDebugOverlay.dispose();
      this.snapDebugOverlay = null;
    }
    if (this.roomManager) {
      this.roomManager.removeRoom();
      this.roomManager = null;
    }
    this.snapshotRenderer = null;
    this.selectedBoxChangeListeners.clear();
    if (this.selectionOutline) {
      this.clearSelectionOutlineHelpers();
      this.sceneManager.scene.remove(this.selectionOutline);
      if (this.selectionOutlineMaterial) {
        this.selectionOutlineMaterial.dispose();
      }
      this.selectionOutline = null;
      this.selectionOutlineMaterial = null;
      this.selectionOutlineTarget = null;
      this.selectionOutlinePiecesSig = null;
    }
    this.multiSelectionOutline?.dispose(this.sceneManager.scene);
    this.multiSelectionOutline = null;
    if (this.wallSelectionOutline) {
      this.sceneManager.scene.remove(this.wallSelectionOutline);
      this.wallSelectionOutline.geometry.dispose();
      if (this.wallSelectionOutlineMaterial) {
        this.wallSelectionOutlineMaterial.dispose();
      }
      this.wallSelectionOutline = null;
      this.wallSelectionOutlineMaterial = null;
    }
    if (this.highlightManager) {
      this.highlightManager.dispose();
      this.highlightManager = null;
    }
    if (this.edgeOutlineSystem) {
      this.edgeOutlineSystem.dispose();
      this.edgeOutlineSystem = null;
    }
    if (this.internalSelectionOutline) {
      this.internalSelectionOutline.dispose();
      this.internalSelectionOutline = null;
    }
    if (this.internalRulerOverlay) {
      this.internalRulerOverlay.dispose();
      this.internalRulerOverlay = null;
    }
    if (this.dimensionsOverlayHandle) {
      disposeDimensionsOverlay(this.dimensionsOverlayHandle, this.sceneManager.scene);
      this.dimensionsOverlayHandle = null;
    }
    this.measurementOverlay.dispose();
    this.internalRulerEngine.dispose();
    this.smartSnappingEngine.dispose();
    this.remateSmartSnapping.dispose();
    // Limpar todos os caixotes corretamente
    this.clearBoxes();
    this.roomBuilder.clearRoom();
    this.displayMaterialBaseByUuid.clear();
    if (this.premiumTexture) {
      this.premiumTexture.dispose();
      this.premiumTexture = null;
    }
    disposeSharedPanelEdgeMaterial();

    this.sceneManager.dispose();
    this.rendererManager.dispose();
  }
}
