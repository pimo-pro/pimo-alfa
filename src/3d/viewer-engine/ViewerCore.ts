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
import { ViewerBoxManager } from "./box";
import { SnapshotRenderer } from "./snapshot";
import { HighlightManager } from "./highlight";
import { EdgeOutlineSystem } from "../outline";
import { ViewerRaycastSystem } from "./raycast/ViewerRaycastSystem";
import type { EnvironmentOptions } from "./environment";
import { ViewerState } from "./state";
import { EventsManager } from "./events";
import type { IViewerEventEngine } from "./events/EventEngineTypes";
import { ViewerTools } from "./tools";
import type { IViewerToolsEngine } from "./tools/ToolsEngineTypes";

import type { LoadedWoodMaterial } from "../materials/WoodMaterial";
import { defaultMaterialSet, mergeMaterialSet } from "../materials/MaterialLibrary";
import type { MaterialSet } from "../materials/MaterialLibrary";
import {
  loadMaterial as materialEngineLoadMaterial,
  getMaterialMode,
  setMaterialMode as materialEngineSetMaterialMode,
  getSceneMaterialConfig,
  getSharedPanelEdgeMaterial,
  disposeSharedPanelEdgeMaterial,
} from "./materials";
import type { MaterialMode } from "./materials";
import type { ViewerBoxEntry } from "./types";
import { buildBoxLegacy, createDoorObject, getDoorSpecFromGroup } from "../objects/BoxBuilder";
import type { BoxOptions } from "../objects/BoxBuilder";
import type { BoxPanelIds, TechnicalDrillHole, ViewerDrillMarkersByPanel } from "../../core/types";
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
import { devLogger } from "../../utils/devLogger";
import { WallGizmo } from "../gizmos/WallGizmo";
import { updateWallCulling } from "../visibility/WallRaycastCulling";
import type { SnapDebugData } from "../snapping/ModelWallSnap";
import { SnapDebugOverlay } from "../../debug/SnapDebugOverlay";
import { ViewerRenderExporter } from "./export/ViewerRenderExporter";
import { TransformConstraints } from "./constraints/TransformConstraints";
import { ViewerMeasurementOverlay, type RulerMeasurementHit } from "./measurement/ViewerMeasurementOverlay";
import { ViewerPanelVisibility } from "./panels/ViewerPanelVisibility";
import { ViewerRuntimeLoop } from "./runtime/ViewerRuntimeLoop";

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
  private roomBoxCeiling: THREE.Mesh | null = null;
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
  private readonly selectedBoxChangeListeners = new Set<(_id: string | null) => void>();
  private onDoorLayerDoubleClick: ((_boxId: string, _doorLayerId: string) => void) | null = null;
  private onModelLoaded: ((_boxId: string, _modelId: string, _object: THREE.Object3D) => void) | null = null;
  private onBoxTransform: ((_boxId: string, _position: { x: number; y: number; z: number }, _rotation: { x: number; y: number; z: number }) => void) | null = null;
  private transformControls: TransformControls | null = null;
  /** Helper (Object3D) retornado por getHelper(); é o que é adicionado à cena e tem .visible. */
  private transformControlsHelper: THREE.Object3D | null = null;
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
  private roomCeilingVisible = true;
  private mousePreset: ViewerMousePreset = "cad";
  private backgroundMode: ViewerBackgroundMode = "studio";
  private materialQuality: ViewerMaterialQuality = "standard";
  private reflectionsEnabled = false;
  private reflectionFrameCounter = 0;
  private photoModeEnabled = false;
  private readonly baseToneMappingExposure: number;

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

  /** Overlay de dimensões da caixa selecionada (modo Selecionar). */
  private dimensionsOverlayVisible = false;
  private dimensionsOverlayGroup: THREE.Group | null = null;
  private dimensionsOverlayLines: THREE.LineSegments | null = null;

  private turntableEnabled = false;
  private turntableSpeed = 0.15;
  private lights: Lights;
  private selectionOutline: THREE.BoxHelper | null = null;
  private selectionOutlineTarget: THREE.Object3D | null = null;
  private selectionOutlineMaterial: THREE.LineBasicMaterial | null = null;
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
  private materialQualityState = new Map<
    string,
    {
      roughness: number;
      metalness: number;
      envMapIntensity: number;
      map: THREE.Texture | null;
    }
  >();
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
    this.defaultPixelRatio = this.rendererManager.renderer.getPixelRatio();
    this.baseToneMappingExposure = this.rendererManager.renderer.toneMappingExposure;
    this.selectionOutlineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#7dd3fc"),
      linewidth: 1,
      opacity: 0.6,
      transparent: true,
      depthTest: true,
    });
    this.selectionOutline = new THREE.BoxHelper(new THREE.Object3D(), 0x00aeef);
    if (this.selectionOutlineMaterial) {
      (this.selectionOutline.material as THREE.Material).dispose();
      this.selectionOutline.material = this.selectionOutlineMaterial;
    }
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

    this.roomBuilder = new RoomBuilder();
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
      if (this.viewerState.getSelectedBox()) {
        const obj = this.transformControls!.object;
        if (obj && "position" in obj) this.dragStartZForShiftLock = (obj as THREE.Object3D).position.z;
      }
      this.viewerState.setTransformControlsDragging(true);
      this.logTransformDiagnostic("dragStart(mouseDown)");
    });
    this.transformControls.addEventListener("mouseUp", () => {
      this.dragStartZForShiftLock = undefined;
      this.viewerState.setTransformControlsDragging(false);
      this.viewerState.setSuppressNextCanvasClick(true);
      this.viewerTools.applyCurrentTool();
      this.notifyBoxTransform();
      this.notifyWallTransform();
      this.notifyRoomElementTransform();
      this.logTransformDiagnostic("dragEnd(mouseUp)");
    });
    this.transformControls.addEventListener("dragging-changed", (event) => {
      if (!event.value) this.dragStartZForShiftLock = undefined;
      this.viewerState.setTransformControlsDragging(Boolean(event.value));
      this.logTransformDiagnostic("dragging-changed", {
        value: Boolean(event.value),
      });
      if (!event.value) {
        this.measurementOverlay.clearRulerOverlay();
        this.viewerState.setSuppressNextCanvasClick(true);
        this.viewerTools.applyCurrentTool();
        this.notifyBoxTransform();
        this.notifyWallTransform();
        this.notifyRoomElementTransform();
      }
    });
    this.transformControls.addEventListener("objectChange", () => {
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
      // Keep external listeners in sync during drag.
      this.notifyBoxTransform();
      this.logTransformDiagnostic("drag(objectChange)");
    });
    this.transformControls.addEventListener("change", () => {
      // no-op para régua antiga removida
    });
    this.transformControlsHelper = this.transformControls.getHelper();
    this.transformControlsHelper.visible = false;
    this.sceneManager.scene.add(this.transformControlsHelper);
    this.logTransformDiagnostic("transform-listeners-ready", {
      domTag: this.rendererManager.renderer.domElement.tagName,
      helperVisible: this.transformControlsHelper.visible,
    });

    this.wallGizmo = new WallGizmo(this.cameraManager.camera);
    this.wallGizmo.setOnTransform(() => this.notifyWallTransform());
    this.sceneManager.scene.add(this.wallGizmo.group);
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
      getDimensionsOverlayGroup: () => this.dimensionsOverlayGroup,
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

    this.start();
    window.addEventListener("resize", this.updateCanvasSize);
    window.addEventListener("keydown", this.boundShiftKeyDown);
    window.addEventListener("keyup", this.boundShiftKeyUp);
  }

  getCurrentMode(): "performance" | "showcase" {
    return this.viewerState.getCurrentMode();
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

  setUltraPerformanceMode(active: boolean): void {
    if (this.ultraPerformanceMode === active) return;
    this.ultraPerformanceMode = active;
    this.ultraPerformanceModeOptions = {
      ...this.ultraPerformanceModeOptions,
      enabled: active,
    };

    const mode = this.ultraPerformanceModeOptions.mode;
    const isAggressive = mode === "aggressive";
    const isFlat2 = mode === "flat2" || mode === "aggressive";

    if (active) {
      if (!this.ultraLightState) {
        this.ultraLightState = {
          key: this.lights.keyLight.intensity,
          fill: this.lights.fillLight.intensity,
          ambient: this.lights.ambient.intensity,
          rim: this.lights.rimLight.intensity,
          castShadow: this.lights.keyLight.castShadow,
          shadowRadius: this.lights.keyLight.shadow.radius,
        };
      }
      this.ultraLightTarget = {
        key: this.ultraLightState.key * (isAggressive ? 0.55 : 0.65),
        fill: this.ultraLightState.fill * (isAggressive ? 0.45 : 0.6),
        ambient: this.ultraLightState.ambient * (isAggressive ? 0.6 : 0.7),
        rim: this.ultraLightState.rim * (isAggressive ? 0.25 : 0.4),
        castShadow: isAggressive ? false : true,
        shadowRadius: isAggressive ? 0.3 : 4,
      };
      const performanceRatio = isAggressive
        ? (this.isMobile ? 0.75 : 0.9)
        : this.isMobile
          ? 0.9
          : 1.1;
      this.rendererManager.renderer.setPixelRatio(performanceRatio);
      this.applyUltraMaterialProfile(isFlat2, isAggressive);
    } else {
      if (this.ultraLightState) {
        this.ultraLightTarget = { ...this.ultraLightState };
      } else {
        this.ultraLightTarget = null;
      }
      this.ultraLightState = null;
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
    this._boundingBox.makeEmpty();
    this.boxes.forEach((entry) => this._boundingBox.expandByObject(entry.mesh));
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
   * Maior X (borda direita) das caixas em metros.
   * Usa bbox real quando disponível; quando bbox ainda não carregado (ex.: Group vazio) usa position + width/2.
   * Sem caixas retorna -0.1.
   */
  getRightmostX(): number {
    if (this.boxes.size === 0) return -0.1;
    let maxX = -Infinity;
    this.boxes.forEach((entry) => {
      entry.mesh.updateMatrixWorld(true);
      this._boundingBox.setFromObject(entry.mesh);
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
    if (visible && !this.dimensionsOverlayGroup) this.createDimensionsOverlay();
    if (this.dimensionsOverlayGroup) this.dimensionsOverlayGroup.visible = visible;
  }

  getDimensionsOverlayVisible(): boolean {
    return this.dimensionsOverlayVisible;
  }

  setInternalMeasurementMode(enabled: boolean): void {
    this.measurementOverlay.setInternalMeasurementMode(enabled);
  }

  getInternalMeasurementMode(): boolean {
    return this.measurementOverlay.getInternalMeasurementMode();
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
    this._boundingBox.setFromObject(entry.mesh);
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

  private createDimensionsOverlay(): void {
    if (this.dimensionsOverlayGroup) return;
    this.dimensionsOverlayGroup = new THREE.Group();
    this.dimensionsOverlayGroup.name = "dimensionsOverlay";
    this.sceneManager.scene.add(this.dimensionsOverlayGroup);
    const mat = new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 1 });
    const geo = new THREE.BufferGeometry();
    this.dimensionsOverlayLines = new THREE.LineSegments(geo, mat);
    this.dimensionsOverlayGroup.add(this.dimensionsOverlayLines);
    this.dimensionsOverlayGroup.visible = this.dimensionsOverlayVisible;
  }

  private updateDimensionsOverlay(): void {
    if (!this.dimensionsOverlayVisible || !this.dimensionsOverlayLines) return;
    if (!this.viewerState.getSelectedBox()) {
      this.dimensionsOverlayLines.visible = false;
      return;
    }
    const entry = this.boxes.get(this.viewerState.getSelectedBox());
    if (!entry) {
      this.dimensionsOverlayLines.visible = false;
      return;
    }
    entry.mesh.updateMatrixWorld(true);
    this._boundingBox.setFromObject(entry.mesh);
    const min = this._boundingBox.min.clone();
    const max = this._boundingBox.max.clone();
    this.dimensionsOverlayLines.visible = true;
    const vertices = new Float32Array([
      min.x, min.y, min.z, max.x, min.y, min.z,
      min.x, max.y, min.z, max.x, max.y, min.z,
      min.x, min.y, max.z, max.x, min.y, max.z,
      min.x, max.y, max.z, max.x, max.y, max.z,
      min.x, min.y, min.z, min.x, max.y, min.z,
      max.x, min.y, min.z, max.x, max.y, min.z,
      min.x, min.y, max.z, min.x, max.y, max.z,
      max.x, min.y, max.z, max.x, max.y, max.z,
      min.x, min.y, min.z, min.x, min.y, max.z,
      max.x, min.y, min.z, max.x, min.y, max.z,
      min.x, max.y, min.z, min.x, max.y, max.z,
      max.x, max.y, min.z, max.x, max.y, max.z,
    ]);
    this.dimensionsOverlayLines.geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    this.dimensionsOverlayLines.geometry.attributes.position.needsUpdate = true;
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
          const boxMaterial = nextMaterial.material.clone();
          child.material = boxMaterial;
        }
      });
    } else if (entry.mesh instanceof THREE.Mesh) {
      if (!this.isKitchenFeetNode(entry.mesh)) {
        entry.mesh.material = nextMaterial.material.clone();
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
    const newDoor = createDoorObject(spec, doorMat, doorHoles);
    boxGroup.add(newDoor);
    if (import.meta.env.DEV) {
      devLogger.debug("[DOOR-MAT] Material aplicado independentemente:", {
        id: doorLayerId,
        material: (doorMat as THREE.Material).uuid,
        textura: materialName,
      });
    }
    this.applyPanelIdsToBox(boxGroup, boxId);
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
   * Aplica material visual (MaterialLibrary v2) a um mesh: cor base, roughness, metallic, e opcionalmente textura/UV.
   * Não substitui updateBoxMaterial; uso opcional para integração com presets e texturas.
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
    if (this.mousePreset === "classic") {
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
      controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      return;
    }
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
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
    this.mousePreset = preset === "classic" ? "classic" : "cad";
    this.applyTransformControlsMouseGuard();
  }

  getMousePreset(): ViewerMousePreset {
    return this.mousePreset;
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

    const roomFloorColor = mode === "woodFloor"
      ? "#b08968"
      : mode === "dark"
        ? "#374151"
        : mode === "white"
          ? "#f3f4f6"
          : "#d1d5db";
    const roomFloorRoughness = mode === "woodFloor" ? 0.82 : 0.75;

    if (this.roomBoxFloor?.material instanceof THREE.MeshStandardMaterial) {
      this.roomBoxFloor.material.color.set(roomFloorColor);
      this.roomBoxFloor.material.roughness = roomFloorRoughness;
      this.roomBoxFloor.material.metalness = 0.05;
      this.roomBoxFloor.material.needsUpdate = true;
    }

    this.sceneManager.root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      if (node.userData?.isRoomFloor !== true) return;
      if (!(node.material instanceof THREE.MeshStandardMaterial)) return;
      node.material.color.set(roomFloorColor);
      node.material.roughness = roomFloorRoughness;
      node.material.metalness = 0.05;
      node.material.needsUpdate = true;
    });
    this.sceneManager.setMaterialQuality(this.materialQuality);
  }

  private getPremiumTexture(): THREE.CanvasTexture {
    if (this.premiumTexture) return this.premiumTexture;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      this.premiumTexture = new THREE.CanvasTexture(canvas);
      return this.premiumTexture;
    }
    const gradient = ctx.createLinearGradient(0, 0, 128, 128);
    gradient.addColorStop(0, "#f8fafc");
    gradient.addColorStop(1, "#dbe4ef");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 22; i += 1) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const len = 18 + Math.random() * 30;
      ctx.strokeStyle = `rgba(148,163,184,${0.05 + Math.random() * 0.08})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + Math.random() * 6 - 3);
      ctx.stroke();
    }
    this.premiumTexture = new THREE.CanvasTexture(canvas);
    this.premiumTexture.wrapS = THREE.RepeatWrapping;
    this.premiumTexture.wrapT = THREE.RepeatWrapping;
    this.premiumTexture.repeat.set(1.2, 1.2);
    this.premiumTexture.needsUpdate = true;
    return this.premiumTexture;
  }

  private applyMaterialQualityProfile(): void {
    const premiumMap = this.materialQuality === "premium" ? this.getPremiumTexture() : null;
    this.sceneManager.root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        if (!this.materialQualityState.has(material.uuid)) {
          this.materialQualityState.set(material.uuid, {
            roughness: material.roughness,
            metalness: material.metalness,
            envMapIntensity: material.envMapIntensity,
            map: material.map,
          });
        }
        const original = this.materialQualityState.get(material.uuid);
        if (!original) return;
        if (this.materialQuality === "standard") {
          material.roughness = original.roughness;
          material.metalness = original.metalness;
          material.envMapIntensity = original.envMapIntensity;
          material.map = original.map;
          material.needsUpdate = true;
          return;
        }
        if (this.materialQuality === "lacquered") {
          material.roughness = Math.min(original.roughness, 0.18);
          material.metalness = Math.max(original.metalness, 0.1);
          material.envMapIntensity = Math.max(original.envMapIntensity, 1.1);
          material.map = null;
          material.needsUpdate = true;
          return;
        }
        material.roughness = Math.max(0.24, original.roughness * 0.8);
        material.metalness = Math.max(0.04, original.metalness * 1.1);
        material.envMapIntensity = Math.max(original.envMapIntensity, 0.78);
        material.map = premiumMap;
        material.needsUpdate = true;
      });
    });
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
    this.sceneManager.setMaterialQuality(this.materialQuality);
    this.applyMaterialQualityProfile();
    const mode: MaterialMode =
      this.materialQuality === "premium"
        ? "showcase"
        : this.materialQuality === "lacquered"
          ? "realistic"
          : "performance";
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
      this._boundingBox.makeEmpty();
      this.boxes.forEach((entry) => {
        this._boundingBox.expandByObject(entry.mesh);
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
    this.rendererManager.renderer.domElement.style.cursor = Boolean(enabled) ? "crosshair" : "";
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

  private applyPanelIdsToBox(root: THREE.Object3D, boxId: string, panelIds?: Partial<BoxPanelIds> | null): void {
    this.panelVisibility.applyPanelIdsToBox(root, boxId, panelIds);
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
    const { width, height, depth } = this.getBoxDimensionsFromOptions(opts);
    const index = opts.index ?? this.getNextBoxIndex();
    const manualPosition = opts.manualPosition === true;

    let box: THREE.Object3D;
    let material: LoadedWoodMaterial | null = null;
    const materialName = opts.materialName ?? this.defaultMaterialName;

    if (cadOnly) {
      box = new THREE.Group();
      box.name = id;
    } else {
      material = this.loadMaterial(materialName) ?? this.loadMaterial("mdf_branco");
      const boxOptions: BoxOptions = {
        ...opts,
        width: opts.width ?? 1,
        height: opts.height ?? 1,
        depth: opts.depth ?? 1,
        thickness: opts.thickness ?? 0.019,
        index: opts.index,
        materialName,
      };
      if (material?.material != null) {
        boxOptions.material = material.material;
      }
      box = buildBoxLegacy(boxOptions);
    }

    box.frustumCulled = false;
    box.matrixAutoUpdate = true;
    box.visible = true;
    box.layers.set(0);
    box.userData.boxId = id;
    // Garantir que todos os descendentes estejam na layer 0 para o raycaster detectar clique.
    box.traverse((child) => {
      child.layers.set(0);
    });
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
      depth,
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
      this.syncFeetVisualForBox(createdEntry);
    }
    this.sceneManager.add(box);
    this.applyPanelIdsToBox(box, id, opts.panelIds);
    this.applyPanelVisibilityForObject(box);
    this.applyExplodedViewForObject(box);
    this.edgeOutlineSystem?.syncRoot(this.sceneManager.root);
    this.applyBackgroundMode();
    this.applyMaterialQualityProfile();
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
    const hasDimOpts = opts.width !== undefined || opts.height !== undefined || opts.depth !== undefined || opts.size !== undefined;
    if (import.meta.env.DEV && hasDimOpts) {
      devLogger.debug("[ViewerCore.updateBox] chamado com dimensões", { id, entry: !!entry, width: opts.width, height: opts.height, depth: opts.depth });
    }
    if (!entry) return false;
    if (
      (opts.size !== undefined && (!Number.isFinite(opts.size) || opts.size <= 0)) ||
      (opts.width !== undefined && (!Number.isFinite(opts.width) || opts.width <= 0)) ||
      (opts.height !== undefined && (!Number.isFinite(opts.height) || opts.height <= 0)) ||
      (opts.depth !== undefined && (!Number.isFinite(opts.depth) || opts.depth <= 0))
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
      this.edgeOutlineSystem?.syncRoot(this.sceneManager.root);
      return true;
    }

    let width = entry.width;
    let height = entry.height;
    let depth = entry.depth;
    let heightChanged = false;
    let indexChanged = false;
    const dimensionsChanged =
      opts.width !== undefined ||
      opts.height !== undefined ||
      opts.depth !== undefined ||
      opts.size !== undefined ||
      opts.thickness !== undefined;
    const structureChanged =
      dimensionsChanged ||
      opts.shelves !== undefined ||
      opts.doorLayerItems !== undefined ||
      opts.drawerLayerItems !== undefined ||
      opts.drillMarkersByPanel !== undefined;
    if (structureChanged) {
      width = Math.max(0.001, opts.width ?? opts.size ?? width);
      height = Math.max(0.001, opts.height ?? opts.size ?? height);
      depth = Math.max(0.001, opts.depth ?? opts.size ?? depth);
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
        // Reconstrução completa do mesh: remover o antigo, dispor, criar novo do zero.
        // drillMarkersByPanel deve vir em opts (sync); fallback para entry para não perder furações.
        // [CORRIGIDO 2026-03] Sempre usar drillMarkersByPanel explícito do options, ou vazio.
        // Nunca usar entry.drillMarkersByPanel como fallback: isso evita furos congelados ou desatualizados.
        // O mesh é sempre reconstruído com o estado mais recente vindo do sync.
        const emptyDrillMarkers: ViewerDrillMarkersByPanel = {
          cima: [],
          fundo: [],
          lateral_esquerda: [],
          lateral_direita: [],
          porta: [],
        };
        const drillMarkers: ViewerDrillMarkersByPanel =
          opts.drillMarkersByPanel ?? emptyDrillMarkers;
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
          const materialName = opts.materialName ?? entry.materialName ?? this.defaultMaterialName;
          const loadedMat = entry.material ?? this.loadMaterial(materialName) ?? this.loadMaterial("mdf_branco");
          const boxOptions: BoxOptions = {
            width,
            height,
            depth,
            thickness: opts.thickness ?? 0.019,
            shelves: opts.shelves,
            doorLayerItems: opts.doorLayerItems,
            drawerLayerItems: opts.drawerLayerItems,
            drillMarkersByPanel: drillMarkers,
            materialName,
          };
          if (loadedMat?.material != null) boxOptions.material = loadedMat.material;
          newBox = buildBoxLegacy(boxOptions);
          if (!entry.material && loadedMat) entry.material = loadedMat;
        }

        newBox.frustumCulled = false;
        newBox.matrixAutoUpdate = true;
        newBox.visible = true;
        newBox.layers.set(0);
        newBox.traverse((child) => child.layers.set(0));
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
          devLogger.debug("[ViewerCore.updateBox] mesh reconstruído (estrutura alterada)", { boxId: id, width, height, depth });
        }
        // [CORRIGIDO 2026-03] Forçar rebuild completo do Scene Graph após mesh rebuild (sem alterar transforms ou offsets)
        this.edgeOutlineSystem?.syncRoot(this.sceneManager.root);
        this.requestRender();
      }
    }
    if (opts.index !== undefined && opts.index !== entry.index) {
      entry.index = opts.index;
      indexChanged = true;
    }
    if (opts.materialName && !entry.cadOnly) {
      this.updateBoxMaterial(id, opts.materialName);
      this.applyMaterialQualityProfile();
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
    this.applyPanelIdsToBox(entry.mesh, id, opts.panelIds);
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
    entry.depth = depth;
    this.syncFeetVisualForBox(entry);
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
    this.edgeOutlineSystem?.syncRoot(this.sceneManager.root);

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
    this.edgeOutlineSystem?.syncRoot(this.sceneManager.root);
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

  createRoom(config: RoomConfig): void {
    void config;
    this.clearRoomBounds();
  }

  /** Cria a sala com o sistema RoomManager. numWalls: 4 = fechada, 3 = sala de estar (aberta, sem parede traseira). */
  createRoomWithDimensions(
    width: number,
    depth: number,
    height: number,
    numWalls?: 3 | 4
  ): void {
    this.roomManager?.createRoom(width, depth, height, numWalls ?? 4);
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
    this.roomBoxGroup = null;
    this.roomBoxWalls = [];
    this.roomBoxFloor = null;
    this.roomBoxCeiling = null;
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
    this.roomBoxCeiling = null;
    this.roomBounds = bounds;
    this.sceneManager.root.add(group);
    this.sceneManager.setGroundSize(
      Math.max(bounds.maxX - bounds.minX, 0.01),
      Math.max(bounds.maxZ - bounds.minZ, 0.01)
    );
    this.sceneManager.setGroundPosition(bounds.centerX, bounds.centerZ);
    this.setRoomCeilingVisible(this.roomCeilingVisible);
  }

  /** Chamado pelo RoomManager quando a sala é removida. Remove o grupo da cena e limpa estado. */
  clearRoomFromManager(): void {
    if (this.roomBoxGroup) {
      this.sceneManager.root.remove(this.roomBoxGroup);
    }
    this.roomBoxWalls = [];
    this.roomBoxGroup = null;
    this.roomBoxFloor = null;
    this.roomBoxCeiling = null;
    this.roomBounds = null;
    this.viewerState.setSelectedWallIndex(null);
    if (this.wallGizmo) this.wallGizmo.detach();
    this.refreshTransformControlsAttachment();
    this.refreshOutlineTarget();
    this.sceneManager.setGroundSize(this.defaultGroundSize, this.defaultGroundSize);
    this.sceneManager.setGroundPosition(0, 0);
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
    this.applyMaterialQualityProfile();
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
    this.sceneManager.setGroundSize(this.defaultGroundSize, this.defaultGroundSize);
    this.sceneManager.setGroundPosition(0, 0);
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
      this.controls.controls.target.set(cx, cy, cz);
      this.controls.update();
    }

    this.cameraViewPreset = preset;
  }

  /** Aplica apenas a vista frontal padrão e limpa o preset (permite que auto-follow volte a atuar). */
  resetCamera(): void {
    this.cameraViewPreset = null;
    this.setCameraView("front");
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

  updateRoomElementConfig(elementId: string, config: DoorWindowConfig): boolean {
    return this.roomBuilder.updateElementConfig(elementId, config);
  }

  addDoorToRoom(wallId: number, config: DoorWindowConfig): string {
    return this.roomBuilder.addDoorByIndex(wallId, config);
  }

  addWindowToRoom(wallId: number, config: DoorWindowConfig): string {
    return this.roomBuilder.addWindowByIndex(wallId, config);
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

  /** LEGACY / NO-OP: seleção de abertura por id descontinuada no fluxo atual. */
  selectRoomElementById(elementId: string | null): void {
    void elementId;
    this.viewerState.setSelectedRoomElementId(null);
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

  setOnModelLoaded(callback: ((_boxId: string, _modelId: string, _object: THREE.Object3D) => void) | null): void {
    this.onModelLoaded = callback;
  }

  setOnBoxTransform(callback: ((_boxId: string, _position: { x: number; y: number; z: number }, _rotation: { x: number; y: number; z: number }) => void) | null): void {
    this.onBoxTransform = callback;
  }

  setTransformMode(mode: "translate" | "rotate" | null): void {
    this.viewerState.setCurrentTool(mode);
    this.refreshTransformControlsAttachment();
    this.applyTransformControlsMouseGuard();
  }

  /** Delega ao ViewerTools. */
  private refreshTransformControlsAttachment(): void {
    this.viewerTools.updateTransformControlsAttachment();
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
        this.edgeOutlineSystem?.syncRoot(this.sceneManager.root);
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
    this.edgeOutlineSystem?.syncRoot(this.sceneManager.root);
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
    this.edgeOutlineSystem?.syncRoot(this.sceneManager.root);
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
    this._boundingBox.setFromObject(mesh);
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
    this.boxes.forEach((entry) => this._boundingBox.expandByObject(entry.mesh));
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

  private updateCameraTarget() {
    if (this.boxes.size === 0) {
      if (this.cameraViewPreset == null) {
        this.cameraManager.setTarget(0, 0, 0);
        if (this.controls) {
          this.controls.controls.target.set(0, 0, 0);
          this.cameraManager.camera.lookAt(0, 0, 0);
          this.controls.update();
        }
      }
      return;
    }
    this._boundingBox.makeEmpty();
    this.boxes.forEach((entry) => {
      this._boundingBox.expandByObject(entry.mesh);
    });
    this._boundingBox.getCenter(this._center);

    if (this.cameraViewPreset != null) {
      this.cameraManager.getTarget().copy(this._center);
      if (this.controls) {
        this.controls.controls.target.copy(this._center);
        this.controls.update();
      }
      return;
    }

    this.cameraManager.setTarget(this._center.x, this._center.y, this._center.z);
    if (this.controls) {
      this.controls.controls.target.copy(this._center);
      this.cameraManager.camera.lookAt(this._center);
      this.controls.update();
    }
  }

  /**
   * Centro do bounding box real do box em mundo (atualiza matriz antes).
   */
  private getBoxBoundingBoxCenter(boxId: string): THREE.Vector3 | null {
    const entry = this.boxes.get(boxId);
    if (!entry) return null;
    entry.mesh.updateMatrixWorld(true);
    this._boxSingle.setFromObject(entry.mesh);
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
    this._boxSingle.setFromObject(entry.mesh);
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
    this._boxSingle.setFromObject(entry.mesh);
    this._boxSingle.getCenter(this._center);
    this._boxSingle.getSize(this._size);
    const cam = this.cameraManager.camera;
    const dir = new THREE.Vector3().subVectors(cam.position, this._center).normalize();
    const maxDim = Math.max(this._size.x, this._size.y, this._size.z, 0.1);
    const fovRad = (cam.fov * Math.PI) / 180;
    const distance = Math.max(0.3, maxDim / (2 * Math.tan(fovRad * 0.5)) * 1.1);
    cam.position.copy(this._center).addScaledVector(dir, distance);
    this.cameraManager.setTarget(this._center.x, this._center.y, this._center.z);
    if (this.controls) {
      this.controls.controls.target.copy(this._center);
      this.controls.update();
    }
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
      this.cameraManager.getTarget().copy(center);
      if (this.controls) {
        this.controls.controls.target.copy(center);
        this.controls.update();
      }
      return;
    }

    this.cameraManager.setTarget(center.x, center.y, center.z);
    if (this.controls) {
      this.controls.controls.target.copy(center);
      this.controls.controls.update();
    }
    const onlyIfOut = options?.onlyMovePositionIfOutOfFrame === true;
    if (onlyIfOut && !this.isBoxInCameraFrame(boxId)) {
      this.adjustCameraPositionToIncludeBox(boxId);
    }
  }

  private getBoxDimensionsFromOptions(options?: BoxOptions) {
    const width = Math.max(0.001, options?.width ?? options?.size ?? 1);
    const height = Math.max(0.001, options?.height ?? options?.size ?? 1);
    const depth = Math.max(0.001, options?.depth ?? options?.size ?? 1);
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
      getOnRoomElementSelected: () => this.onRoomElementSelected,
      getOnWallSelected: () => this.onWallSelected,
      getOnBoxSelected: () => this.onBoxSelected,
      getPlacementMode: () => this.viewerState.getPlacementMode(),
      getOnRoomElementPlaced: () => this.onRoomElementPlaced,
      getWallHitAtPointer: (e) => this.getWallHitAtPointer(e),
      getRoomBuilder: () => this.roomBuilder,
      setPlacementMode: (mode) => this.viewerState.setPlacementMode(mode),
      getBoxIdAtPointer: (e) => this.getBoxIdAtPointer(e),
      getSelectedBoxId: () => this.viewerState.getSelectedBox(),
      getRoomElementAtPointer: (e) => this.getRoomElementAtPointer(e),
      getSelectedWallIndex: () => this.viewerState.getSelectedWallIndex(),
      setSelectedWallIndex: (v) => { this.viewerState.setSelectedWallIndex(v); },
      getSelectedRoomElementId: () => this.viewerState.getSelectedRoomElementId(),
      setSelectedRoomElementId: (v) => { this.viewerState.setSelectedRoomElementId(v); },
      refreshTransformControlsAttachment: () => this.refreshTransformControlsAttachment(),
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
      getOnDoorLayerDoubleClick: () => this.onDoorLayerDoubleClick,
      setCameraControlsEnabled: (enabled) => {
        if (this.controls?.controls) this.controls.controls.enabled = enabled;
      },
    };
  }

  /** API mínima para o ViewerTools (attachment, outline, clamp). */
  private getToolsEngineApi(): IViewerToolsEngine {
    return {
      getTransformControls: () => this.transformControls,
      getTransformControlsHelper: () => this.transformControlsHelper,
      getCurrentTool: () => this.viewerState.getCurrentTool(),
      getSelectedBoxId: () => this.viewerState.getSelectedBox(),
      getBoxEntry: (id) => this.boxes.get(id),
      getSelectedWallIndex: () => this.viewerState.getSelectedWallIndex(),
      getRoomBoxWalls: () => this.roomBoxWalls,
      getSelectedRoomElementId: () => this.viewerState.getSelectedRoomElementId(),
      getRoomElementById: (id) => this.roomBuilder.getElementById(id),
      getTransformGizmoSizeForBox: (entry) => this.getTransformGizmoSizeForBox(entry),
      setTransformHelperVisible: (visible) => {
        if (this.transformControlsHelper) this.transformControlsHelper.visible = visible;
      },
      applyTransformControlsMouseGuard: () => this.applyTransformControlsMouseGuard(),
      logTransformDiagnostic: (name, data) => this.logTransformDiagnostic(name, data),
      getSelectionOutline: () => this.selectionOutline,
      getSelectionOutlineMaterial: () => this.selectionOutlineMaterial,
      getHoveredBoxId: () => this.viewerState.getHoveredBox(),
      getBoxesIntersectingWalls: () => this.boxesIntersectingWalls,
      setOutlineTarget: (mesh, opacity, colorHex) => this.setOutlineTarget(mesh, opacity, colorHex),
      clampTransform: () => this.clampTransform(),
    };
  }

  private setOutlineTarget(mesh: THREE.Object3D | null, opacity: number, colorHex: number): void {
    this.selectionOutlineTarget = mesh;
    this.outlineTargetOpacity = opacity;
    if (!this.selectionOutline || !this.selectionOutlineMaterial) return;
    if (!mesh) {
      this.selectionOutline.visible = false;
      return;
    }
    this.selectionOutlineMaterial.color.setHex(colorHex);
    this.selectionOutlineMaterial.needsUpdate = true;
    this.selectionOutline.visible = true;
    this.selectionOutline.update(mesh);
  }

  /** Obtém boxId a partir de um mesh (grupo ou filho/GLB); sobe na hierarquia até encontrar userData.boxId ou o grupo da caixa. */
  private getBoxIdByMesh(mesh: THREE.Object3D): string | null {
    return this.raycastSystem.getBoxIdByMesh(mesh);
  }

  private setSelectedBox(id: string | null) {
    if (this.viewerState.getSelectedBox() === id) {
      this.onBoxSelected?.(id);
      return;
    }
    this.viewerState.setSelectedBox(id);
    this.viewerState.setSelectedWallIndex(null);
    this.viewerState.setSelectedRoomElementId(null);
    this.refreshTransformControlsAttachment();
    this.refreshOutlineTarget();
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
      return;
    }
    this.measurementOverlay.onSelectionChanged(id);
  }

  /** Só chamado em objectChange (arraste do utilizador). Nunca na criação da caixa. */
  private clampTransform() {
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

  private computeDistanceToNearestBox(): RulerMeasurementHit | null {
    const selectedBoxId = this.viewerState.getSelectedBox();
    if (!selectedBoxId) return null;
    const selectedEntry = this.boxes.get(selectedBoxId);
    if (!selectedEntry) return null;

    selectedEntry.mesh.updateMatrixWorld(true);
    const selectedBox = new THREE.Box3().setFromObject(selectedEntry.mesh);
    let best: RulerMeasurementHit | null = null;

    this.boxes.forEach((entry, id) => {
      if (id === selectedBoxId) return;
      entry.mesh.updateMatrixWorld(true);
      const otherBox = new THREE.Box3().setFromObject(entry.mesh);
      const overlapY =
        Math.min(selectedBox.max.y, otherBox.max.y) - Math.max(selectedBox.min.y, otherBox.min.y);
      const overlapZ =
        Math.min(selectedBox.max.z, otherBox.max.z) - Math.max(selectedBox.min.z, otherBox.min.z);
      if (overlapY > 0 && overlapZ > 0) {
        const yMid = (Math.max(selectedBox.min.y, otherBox.min.y) + Math.min(selectedBox.max.y, otherBox.max.y)) * 0.5;
        const zMid = (Math.max(selectedBox.min.z, otherBox.min.z) + Math.min(selectedBox.max.z, otherBox.max.z)) * 0.5;
        const y = THREE.MathUtils.clamp(yMid, selectedBox.min.y, selectedBox.max.y);
        const z = THREE.MathUtils.clamp(zMid, selectedBox.min.z, selectedBox.max.z);
        if (selectedBox.max.x <= otherBox.min.x) {
          const distanceM = otherBox.min.x - selectedBox.max.x;
          if (!best || distanceM < best.distanceM) {
            best = {
              kind: "box",
              distanceM,
              start: new THREE.Vector3(selectedBox.max.x, y, z),
              end: new THREE.Vector3(otherBox.min.x, y, z),
            };
          }
        } else if (otherBox.max.x <= selectedBox.min.x) {
          const distanceM = selectedBox.min.x - otherBox.max.x;
          if (!best || distanceM < best.distanceM) {
            best = {
              kind: "box",
              distanceM,
              start: new THREE.Vector3(selectedBox.min.x, y, z),
              end: new THREE.Vector3(otherBox.max.x, y, z),
            };
          }
        }
      }

      const overlapX =
        Math.min(selectedBox.max.x, otherBox.max.x) - Math.max(selectedBox.min.x, otherBox.min.x);
      if (overlapX > 0 && overlapZ > 0) {
        const xMid = (Math.max(selectedBox.min.x, otherBox.min.x) + Math.min(selectedBox.max.x, otherBox.max.x)) * 0.5;
        const zMid = (Math.max(selectedBox.min.z, otherBox.min.z) + Math.min(selectedBox.max.z, otherBox.max.z)) * 0.5;
        const x = THREE.MathUtils.clamp(xMid, selectedBox.min.x, selectedBox.max.x);
        const z = THREE.MathUtils.clamp(zMid, selectedBox.min.z, selectedBox.max.z);
        if (selectedBox.max.y <= otherBox.min.y) {
          const distanceM = otherBox.min.y - selectedBox.max.y;
          if (!best || distanceM < best.distanceM) {
            best = {
              kind: "box",
              distanceM,
              start: new THREE.Vector3(x, selectedBox.max.y, z),
              end: new THREE.Vector3(x, otherBox.min.y, z),
            };
          }
        } else if (otherBox.max.y <= selectedBox.min.y) {
          const distanceM = selectedBox.min.y - otherBox.max.y;
          if (!best || distanceM < best.distanceM) {
            best = {
              kind: "box",
              distanceM,
              start: new THREE.Vector3(x, selectedBox.min.y, z),
              end: new THREE.Vector3(x, otherBox.max.y, z),
            };
          }
        }
      }

      if (overlapX > 0 && overlapY > 0) {
        const xMid = (Math.max(selectedBox.min.x, otherBox.min.x) + Math.min(selectedBox.max.x, otherBox.max.x)) * 0.5;
        const yMid = (Math.max(selectedBox.min.y, otherBox.min.y) + Math.min(selectedBox.max.y, otherBox.max.y)) * 0.5;
        const x = THREE.MathUtils.clamp(xMid, selectedBox.min.x, selectedBox.max.x);
        const y = THREE.MathUtils.clamp(yMid, selectedBox.min.y, selectedBox.max.y);
        if (selectedBox.max.z <= otherBox.min.z) {
          const distanceM = otherBox.min.z - selectedBox.max.z;
          if (!best || distanceM < best.distanceM) {
            best = {
              kind: "box",
              distanceM,
              start: new THREE.Vector3(x, y, selectedBox.max.z),
              end: new THREE.Vector3(x, y, otherBox.min.z),
            };
          }
        } else if (otherBox.max.z <= selectedBox.min.z) {
          const distanceM = selectedBox.min.z - otherBox.max.z;
          if (!best || distanceM < best.distanceM) {
            best = {
              kind: "box",
              distanceM,
              start: new THREE.Vector3(x, y, selectedBox.min.z),
              end: new THREE.Vector3(x, y, otherBox.max.z),
            };
          }
        }
      }
    });
    return best;
  }

  private computeDistanceToNearestWall(): RulerMeasurementHit | null {
    const selectedBoxId = this.viewerState.getSelectedBox();
    if (!selectedBoxId) return null;
    const selectedEntry = this.boxes.get(selectedBoxId);
    if (!selectedEntry || !this.roomBounds) return null;

    selectedEntry.mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(selectedEntry.mesh);
    const centerY = (box.min.y + box.max.y) * 0.5;
    const centerX = (box.min.x + box.max.x) * 0.5;
    const centerZ = (box.min.z + box.max.z) * 0.5;
    const candidates: RulerMeasurementHit[] = [];

    const distMinX = box.min.x - this.roomBounds.minX;
    if (distMinX >= 0) {
      candidates.push({
        kind: "wall",
        distanceM: distMinX,
        start: new THREE.Vector3(box.min.x, centerY, centerZ),
        end: new THREE.Vector3(this.roomBounds.minX, centerY, centerZ),
      });
    }
    const distMaxX = this.roomBounds.maxX - box.max.x;
    if (distMaxX >= 0) {
      candidates.push({
        kind: "wall",
        distanceM: distMaxX,
        start: new THREE.Vector3(box.max.x, centerY, centerZ),
        end: new THREE.Vector3(this.roomBounds.maxX, centerY, centerZ),
      });
    }
    const distMinZ = box.min.z - this.roomBounds.minZ;
    if (distMinZ >= 0) {
      candidates.push({
        kind: "wall",
        distanceM: distMinZ,
        start: new THREE.Vector3(centerX, centerY, box.min.z),
        end: new THREE.Vector3(centerX, centerY, this.roomBounds.minZ),
      });
    }
    const distMaxZ = this.roomBounds.maxZ - box.max.z;
    if (distMaxZ >= 0) {
      candidates.push({
        kind: "wall",
        distanceM: distMaxZ,
        start: new THREE.Vector3(centerX, centerY, box.max.z),
        end: new THREE.Vector3(centerX, centerY, this.roomBounds.maxZ),
      });
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.distanceM - b.distanceM);
    return candidates[0];
  }

  private computeDistanceToFloor(): RulerMeasurementHit | null {
    const selectedBoxId = this.viewerState.getSelectedBox();
    if (!selectedBoxId) return null;
    const selectedEntry = this.boxes.get(selectedBoxId);
    if (!selectedEntry) return null;

    selectedEntry.mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(selectedEntry.mesh);
    const floorY = this.roomBounds?.minY ?? 0;
    const distanceM = box.min.y - floorY;
    if (distanceM < 1e-6) return null;
    const centerX = (box.min.x + box.max.x) * 0.5;
    const centerZ = (box.min.z + box.max.z) * 0.5;
    return {
      kind: "floor",
      distanceM,
      start: new THREE.Vector3(centerX, box.min.y, centerZ),
      end: new THREE.Vector3(centerX, floorY, centerZ),
    };
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
      const box = new THREE.Box3().setFromObject(entry.mesh);
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
    const movingBox = new THREE.Box3().setFromObject(movingMesh);
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

  /**
   * Caixa segue lógica da sala apenas quando está dentro ou encostada ao perímetro em X/Z.
   * Caixas totalmente fora da sala ficam livres (sem auto-rotate/snap da sala).
   */
  private isMeshInsideOrTouchingRoom(movingMesh: THREE.Object3D, tolerance = 0.02): boolean {
    if (!this.roomBounds) return false;
    movingMesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(movingMesh);
    const { minX, maxX, minZ, maxZ } = this.roomBounds;
    return !(
      box.max.x < minX - tolerance ||
      box.min.x > maxX + tolerance ||
      box.max.z < minZ - tolerance ||
      box.min.z > maxZ + tolerance
    );
  }

  private notifyBoxTransform() {
    if (!this.viewerState.getSelectedBox()) return;
    const entry = this.boxes.get(this.viewerState.getSelectedBox());
    if (!entry) return;
    const { x, y, z } = entry.mesh.position;
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

  private loadMaterial(materialName: string): LoadedWoodMaterial | null {
    const result = materialEngineLoadMaterial(materialName, getMaterialMode());
    return result as LoadedWoodMaterial | null;
  }

  /** Delega ao ViewerTools. */
  private refreshOutlineTarget(): void {
    this.viewerTools.updateOutline();
  }

  private setHoveredBox(id: string | null) {
    if (this.viewerState.getHoveredBox() === id) return;
    this.viewerState.setHoveredBox(id);
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

  /**
   * Retorna o alvo do ponteiro para o menu de contexto: porta, gaveta ou null (módulo/canvas).
   * Raycast nos boxes; para o primeiro hit que tenha getDoorLayerIdByMesh ou getDrawerLayerIdByMesh, devolve boxId + type + doorLayerId/drawerLayerId.
   * Depende de userData.doorLayerId propagado em createDoorObject e de userData.boxId em applyPanelIdsToBox.
   */
  getContextMenuLayerHit(event: { clientX: number; clientY: number }): {
    boxId: string;
    type: "door" | "drawer";
    doorLayerId?: string;
    drawerLayerId?: string;
  } | null {
    return this.raycastSystem.getContextMenuLayerHit(event);
  }

  private getWallIdAtPointer(event: { clientX: number; clientY: number }): number | null {
    return this.raycastSystem.getWallIdAtPointer(event);
  }

  private getWallHitAtPointer(_event: { clientX: number; clientY: number }): {
    wallId: number;
    config: DoorWindowConfig;
    type: "door" | "window";
  } | null {
    // Room Box não suporta abertura posicionada por clique.
    return null;
  }

  private getRoomElementAtPointer(event: { clientX: number; clientY: number }): {
    elementId: string;
    wallId: number;
    type: "door" | "window";
    config: DoorWindowConfig;
  } | null {
    return this.raycastSystem.getRoomElementAtPointer(event);
  }

  private updateCanvasSize = () => {
    this.runtimeLoop.onResize();
    this.measurementOverlay.resize();
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
        this.selectionOutline.update(this.selectionOutlineTarget);
      } else if (!shouldShow) {
        this.selectionOutline.visible = false;
      }
      this.selectionOutlineMaterial.opacity = Math.max(0, Math.min(1, this.outlineCurrentOpacity));
      this.selectionOutlineMaterial.needsUpdate = true;
    }

    this.highlightManager?.update();
    this.edgeOutlineSystem?.update();
    this.measurementOverlay.syncRulerWithExternalSelectionMovement();
    this.measurementOverlay.clearRulerOverlayIfMovementIdle(performance.now());

    if (this.reflectionsEnabled) {
      this.reflectionFrameCounter += 1;
      if (this.reflectionFrameCounter >= 24) {
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
    }
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
      this.sceneManager.scene.remove(this.selectionOutline);
      this.selectionOutline.geometry.dispose();
      if (this.selectionOutlineMaterial) {
        this.selectionOutlineMaterial.dispose();
      }
      this.selectionOutline = null;
      this.selectionOutlineMaterial = null;
      this.selectionOutlineTarget = null;
    }
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
    if (this.dimensionsOverlayLines) {
      this.dimensionsOverlayLines.geometry.dispose();
      (this.dimensionsOverlayLines.material as THREE.Material).dispose();
    }
    if (this.dimensionsOverlayGroup) {
      this.sceneManager.scene.remove(this.dimensionsOverlayGroup);
      this.dimensionsOverlayGroup = null;
      this.dimensionsOverlayLines = null;
    }
    this.measurementOverlay.dispose();
    // Limpar todos os caixotes corretamente
    this.clearBoxes();
    this.roomBuilder.clearRoom();
    this.materialQualityState.clear();
    if (this.premiumTexture) {
      this.premiumTexture.dispose();
      this.premiumTexture = null;
    }
    disposeSharedPanelEdgeMaterial();

    this.sceneManager.dispose();
    this.rendererManager.dispose();
  }
}
