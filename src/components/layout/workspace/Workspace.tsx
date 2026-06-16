import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "../../../context/useProject";
import { useToast } from "../../../context/ToastContext";
import { usePimoViewer } from "../../../hooks/usePimoViewer";
import { createViewerApiAdapter } from "../../../core/viewer/viewerApiAdapter";
import { useMultiBoxManager } from "../../../core/multibox";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import UnifiedTopToolbar from "../unified-toolbar/UnifiedTopToolbar";
import ViewerToolbar from "../viewer-toolbar/ViewerToolbar";
import Tools3DToolbar from "../viewer-toolbar/Tools3DToolbar";
import { useToolbarModal } from "../../../context/ToolbarModalContext";
import { defaultState } from "../../../context/projectState";
import { loadViewerCore } from "../../../core/viewer/viewerEngineLoader";
import { mToMm } from "../../../utils/units";
import { useWallStore, wallStore } from "../../../stores/wallStore";
import { applyRoomMeshFromWallStore, applyRoomOpeningsFromWallStore, getRoomMeshFingerprintFromWallStore } from "../../../utils/roomMeshFromWallStore";
import { uiStore, useUiStore } from "../../../stores/uiStore";
import { clampOpeningNoOverlap } from "../../../utils/openingConstraints";
import BoxInfoOverlay from "./BoxInfoOverlay";
import InternalMeasurementsPanel from "./InternalMeasurementsPanel";
import ContextMenu from "./ContextMenu";
import { devLogger } from "../../../utils/devLogger";
import { useWorkspaceUndoRedoRegistry } from "../../../context/WorkspaceUndoRedoRegistryContext";
import { runProjectRedo, runProjectUndo } from "./workspaceUndoRedoHandlers";
import { buildBoxesWithCutList } from "../../../context/projectState";
import { resolvePieceOrlaConfig } from "../../../core/orla/orlaCalculator";
import { normalizeOrlaPresets } from "../../../core/orla/orlaPresets";
import { useSettings } from "../../../context/SettingsContext";
import type { MouseMenuTarget } from "../../../ui/context-menu/ContextMenuEngine";
import { LEFT_TOOLBAR_IDS } from "../left-toolbar/LeftToolbar";
import { Matrix4, Vector3 } from "three";

type WorkspaceProps = {
  viewerBackground?: string;
  viewerHeight?: number | string;
  viewerOptions?: Record<string, unknown>;
};

export default function Workspace({
  viewerBackground,
  viewerHeight: _viewerHeight = "100%",
  viewerOptions,
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerSurfaceRef = useRef<HTMLDivElement | null>(null);
  const { project, actions, viewerSync } = useProject();
  const { settings } = useSettings();
  const { registerWorkspaceUndoRedo } = useWorkspaceUndoRedoRegistry();
  const { openModal } = useToolbarModal();
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const actionsRef = useRef(actions);
  // eslint-disable-next-line react-hooks/refs -- intencional: espelho em ref com o `actions` mais recente para listeners/efeitos sem re-inscrever em cada mudança de identidade.
  actionsRef.current = actions;
  const { showToast } = useToast();
  const viewerOptionsStable = useMemo(
    () => ({
      background: viewerBackground,
      ...viewerOptions,
      skipInitialBox: true as const,
    }),
    [viewerBackground, viewerOptions]
  );
  const viewerApi = usePimoViewer();
  const { registerViewerApi } = usePimoViewerContext();
  const isRoomOpen = useWallStore((state) => state.isOpen);
  const walls = useWallStore((state) => state.walls);

  const projectHasNonDefaultState = useMemo(() => {
    if (project.workspaceBoxes.length > 0) return true;
    if ((project.projectName?.trim() || "") !== defaultState.projectName) return true;
    if (walls.length >= 3) return true;
    return false;
  }, [project.workspaceBoxes.length, project.projectName, walls.length]);

  const handleTopToolbarNovo = useCallback(() => {
    if (projectHasNonDefaultState) setConfirmNewOpen(true);
    else void actions.createNewProject();
  }, [projectHasNonDefaultState, actions]);

  const handleTopToolbarProjetos = useCallback(() => {
    openModal("projects");
  }, [openModal]);

  const handleUndo = useCallback(() => {
    runProjectUndo(actions);
  }, [actions]);

  const handleRedo = useCallback(() => {
    runProjectRedo(actions);
  }, [actions]);

  useEffect(() => {
    registerWorkspaceUndoRedo({ handleUndo, handleRedo });
    return () => {
      registerWorkspaceUndoRedo(null);
    };
  }, [handleUndo, handleRedo, registerWorkspaceUndoRedo]);

  const roomMeshSyncToken = useWallStore((state) => state.roomMeshSyncToken);
  const selectedWallId = useWallStore((state) => state.selectedWallId);
  const selectedObject = useUiStore((state) => state.selectedObject);
  const setSelectedObject = useUiStore((state) => state.setSelectedObject);
  const clearUiSelection = useUiStore((state) => state.clearSelection);
  const setSelectedTool = useUiStore((state) => state.setSelectedTool);
  const photoModePanelOpen = useUiStore((state) => state.photoModePanelOpen);

  const [contextSelectedBoxIds, setContextSelectedBoxIds] = useState<string[]>([]);
  const viewerCoreInstanceRef = useRef<{ dispose: () => void } | null>(null);
  const lastRoomMeshFingerprintRef = useRef("");
  const projectRef = useRef(project);
  const ctrlOrMetaPressedRef = useRef(false);
  const pointerToggleSelectionRef = useRef(false);
  const multiSelectedBoxIdsRef = useRef<string[]>([]);
  const keyboardMoveRef = useRef<{
    activeKey: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | null;
    accelTimeoutId: number | null;
    repeatIntervalId: number | null;
  }>({
    activeKey: null,
    accelTimeoutId: null,
    repeatIntervalId: null,
  });
  const [showKeyboardShortcutsHelp, setShowKeyboardShortcutsHelp] = useState(false);
  const [, setViewerMounted] = useState(false);

  // Montar ViewerCore no container via import dinâmico (evita 500 ao servir ViewerCore.ts estático).
  // viewerMounted força re-render para que usePimoViewer leia window.viewerCore e viewerReady fique true só após o core estar pronto.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setViewerMounted(false);
    let mounted = true;
    loadViewerCore()
      .then((ViewerCore) => {
        if (!mounted) return;
        const core = new ViewerCore(container, viewerOptionsStable as Record<string, unknown>);
        viewerCoreInstanceRef.current = core;
        window.viewerCore = core as typeof window.viewerCore;
        setViewerMounted(true);
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error("[Workspace] Falha ao carregar viewer-engine:", err);
        }
      });
    return () => {
      mounted = false;
      const core = viewerCoreInstanceRef.current;
      viewerCoreInstanceRef.current = null;
      if (core?.dispose) {
        core.dispose();
      }
      (window as Window & { viewerCore?: unknown }).viewerCore = undefined;
      setViewerMounted(false);
    };
  }, [viewerOptionsStable]);

  // Registrar no PimoViewerContext apenas quando viewerApi muda (não quando viewerSync muda, para evitar loop ao rotacionar/atualizar projeto).
  useEffect(() => {
    registerViewerApi(viewerApi);
    return () => {
      registerViewerApi(null);
    };
  }, [registerViewerApi, viewerApi]);

  // Manter viewerSync com o adapter atual; roda quando viewerApi ou viewerSync mudam, sem chamar setState no contexto.
  useEffect(() => {
    const adapter = createViewerApiAdapter(viewerApi);
    viewerSync.registerViewerApi(adapter);
    return () => {
      viewerSync.registerViewerApi(null);
    };
  }, [viewerApi, viewerSync]);

  // Fluxo da sala é controlado exclusivamente pelo PainelSala (RoomManager).
  // Evita remoção/criação implícita da sala em mudanças de seleção do wallStore.

  /** Após alterações Room 2.0: rebuild só se geometria/aberturas mudaram; locked/visible sem rebuild. */
  useEffect(() => {
    const fingerprint = getRoomMeshFingerprintFromWallStore();
    const room = projectRef.current.room;
    if (
      fingerprint &&
      fingerprint === lastRoomMeshFingerprintRef.current &&
      viewerApi.getRoomExists?.()
    ) {
      if (room) {
        viewerApi.setRoomLocked?.(room.locked);
        viewerApi.setRoomFloorMode?.(room.floorMode);
        viewerApi.setRoomCeilingVisible?.(room.ceilingVisible && projectRef.current.viewerSettings.showCeiling);
        viewerApi.setRoomHiddenWalls?.(room.hiddenWalls ?? []);
        viewerApi.setRoomUtilities?.(room.utilities ?? []);
        if (room.visible !== false) viewerApi.showRoom?.();
        else viewerApi.hideRoom?.();
      }
      return;
    }
    lastRoomMeshFingerprintRef.current = fingerprint;
    applyRoomMeshFromWallStore(viewerApi);
    applyRoomOpeningsFromWallStore(viewerApi);
    if (room) {
      viewerApi.setRoomLocked?.(room.locked);
      viewerApi.setRoomFloorMode?.(room.floorMode);
      viewerApi.setRoomCeilingVisible?.(room.ceilingVisible && projectRef.current.viewerSettings.showCeiling);
      viewerApi.setRoomHiddenWalls?.(room.hiddenWalls ?? []);
      viewerApi.setRoomUtilities?.(room.utilities ?? []);
      if (room.visible !== false) viewerApi.showRoom?.();
      else viewerApi.hideRoom?.();
    }
  }, [viewerApi, roomMeshSyncToken, project.room]);

  // MultiBoxManager: sincroniza workspaceBoxes ↔ viewer; addBox/removeBox delegam a actions
  useMultiBoxManager({
    viewerApi: viewerApi as import("../../../core/multibox/types").MultiBoxViewerApi,
    project,
    actions,
  });

  useEffect(() => {
    viewerApi.setOnBoxSelected((boxId) => {
      if (import.meta.env.DEV) {
        const beforeUi = uiStore.getState();
        devLogger.debug("[SELECTION][Workspace] onBoxSelected:entrada", {
          boxId,
          selectedObjectBefore: beforeUi.selectedObject,
          selectedToolBefore: beforeUi.selectedTool,
          projectSelectedWorkspaceBoxIdBefore: project.selectedWorkspaceBoxId,
        });
      }
      if (boxId) {
        const toggleSelection = pointerToggleSelectionRef.current || ctrlOrMetaPressedRef.current;
        if (toggleSelection) {
          const currentSelection = multiSelectedBoxIdsRef.current;
          const alreadySelected = currentSelection.includes(boxId);
          const nextSelection = alreadySelected
            ? currentSelection.filter((id) => id !== boxId)
            : [...currentSelection, boxId];
          multiSelectedBoxIdsRef.current = nextSelection;
          if (alreadySelected) {
            const fallbackBoxId = nextSelection[nextSelection.length - 1];
            if (fallbackBoxId) {
              actions.selectBox(fallbackBoxId);
            } else {
              actions.clearSelection();
              clearUiSelection();
            }
            return;
          }
        } else {
          multiSelectedBoxIdsRef.current = [boxId];
        }
        if (import.meta.env.DEV) {
          devLogger.debug("[SELECTION][Workspace] onBoxSelected:actions.selectBox", {
            boxId,
          });
        }
        actions.selectBox(boxId);
        setSelectedObject({ type: "box", id: boxId });
        if (import.meta.env.DEV) {
          devLogger.debug("[SELECTION][Workspace] selectedObject:set box", {
            boxId,
          });
        }
        pointerToggleSelectionRef.current = false;
        return;
      }
      if (project.selectedWorkspaceBoxId != null && project.selectedWorkspaceBoxId !== "") {
        multiSelectedBoxIdsRef.current = [];
        if (import.meta.env.DEV) {
          devLogger.debug("[SELECTION][Workspace] onBoxSelected:null -> clearSelection", {
            projectSelectedWorkspaceBoxIdBeforeClear: project.selectedWorkspaceBoxId,
          });
        }
        actions.clearSelection();
        clearUiSelection();
        if (import.meta.env.DEV) {
          const afterUi = uiStore.getState();
          devLogger.debug("[SELECTION][Workspace] after clearSelection", {
            selectedObjectAfterClear: afterUi.selectedObject,
            selectedToolAfterClear: afterUi.selectedTool,
          });
        }
      }
      pointerToggleSelectionRef.current = false;
    });
  }, [actions, viewerApi, clearUiSelection, project.selectedWorkspaceBoxId, setSelectedObject]);

  useEffect(() => {
    viewerApi.setOnBoxDoubleClick?.((boxId) => {
      actions.selectBox(boxId);
      setSelectedObject({ type: "box", id: boxId });
      setSelectedTool(LEFT_TOOLBAR_IDS.HOME);
    });
    return () => {
      viewerApi.setOnBoxDoubleClick?.(null);
    };
  }, [actions, viewerApi, setSelectedObject, setSelectedTool]);

  /** GLB/CAD: ViewerCore chama após `addModelToBox` concluir o load (ver ViewerCore.addModelToBox). */
  useEffect(() => {
    viewerApi.setOnModelLoaded((boxId, modelId, _object) => {
      if (import.meta.env.DEV) {
        devLogger.debug("[Workspace] Modelo carregado no viewer", { boxId, modelId });
      }
    });
    return () => {
      viewerApi.setOnModelLoaded(null);
    };
  }, [viewerApi]);

  useEffect(() => {
    const selectedBoxId = project.selectedWorkspaceBoxId;
    const validIds = new Set(project.workspaceBoxes.map((box) => box.id));
    const filteredSelection = multiSelectedBoxIdsRef.current.filter((id) => validIds.has(id));
    if (!selectedBoxId) {
      multiSelectedBoxIdsRef.current = filteredSelection;
      return;
    }
    if (filteredSelection.length <= 1 || !filteredSelection.includes(selectedBoxId)) {
      multiSelectedBoxIdsRef.current = [selectedBoxId];
      return;
    }
    multiSelectedBoxIdsRef.current = filteredSelection;
  }, [project.selectedWorkspaceBoxId, project.workspaceBoxes]);

  useEffect(() => {
    viewerApi.setOnDoorLayerDoubleClick((boxId, doorLayerId) => {
      const box = project.workspaceBoxes.find((workspaceBox) => workspaceBox.id === boxId);
      const door = box?.doorsLayer?.find((item) => item.id === doorLayerId);
      if (!box || !door) return;

      const nextIsOpen = !door.isOpen;
      if (project.selectedWorkspaceBoxId === boxId) {
        actions.setDoorLayerItemOpen(doorLayerId, nextIsOpen);
        return;
      }

      actions.selectBox(boxId);
      requestAnimationFrame(() => {
        actionsRef.current.setDoorLayerItemOpen(doorLayerId, nextIsOpen);
      });
    });
  }, [actions, project.workspaceBoxes, project.selectedWorkspaceBoxId, viewerApi]);

  useEffect(() => {
    viewerApi.setOnWallSelected?.((wallIndex) => {
      if (wallIndex == null) {
        wallStore.getState().selectWall(null);
        return;
      }
      const wall = walls[wallIndex];
      if (!wall) return;
      actions.clearSelection();
      wallStore.getState().setOpen(true);
      wallStore.getState().selectWall(wall.id);
      setSelectedTool("layout");
      setSelectedObject({ type: "wall", id: wall.id });
    });
  }, [actions, viewerApi, walls, setSelectedObject, setSelectedTool]);

  useEffect(() => {
    if (!isRoomOpen || !viewerApi.selectWallByIndex) return;
    const index = selectedWallId ? walls.findIndex((w) => w.id === selectedWallId) : -1;
    viewerApi.selectWallByIndex(index >= 0 ? index : null);
  }, [viewerApi, isRoomOpen, selectedWallId, walls]);

  useEffect(() => {
    if (selectedObject?.type === "roomElement" && selectedObject?.id) {
      viewerApi.selectRoomElementById?.(selectedObject.id);
    } else if (selectedObject?.type === "roomUtility" && selectedObject?.id) {
      viewerApi.selectRoomUtilityById?.(selectedObject.id);
    }
  }, [viewerApi, selectedObject]);

  useEffect(() => {
    viewerApi.setOnWallTransform?.((wallIndex, position, rotation) => {
      const wall = walls[wallIndex];
      if (!wall) return;
      wallStore.getState().updateWall(wall.id, {
        position: {
          x: position.x * 100,
          y: wall.position?.y,
          z: position.z * 100,
        },
        rotation,
      }, { skipSnap: true });
      const room = projectRef.current.room;
      if (!room) return;
      actionsRef.current.updateProjectRoom({
        walls: room.walls.map((roomWall) =>
          roomWall.id === wall.id
            ? {
                ...roomWall,
                position: {
                  ...roomWall.position,
                  x: position.x * 1000,
                  z: position.z * 1000,
                },
                rotationDeg: rotation,
              }
            : roomWall
        ),
      });
    });
  }, [viewerApi, walls]);

  useEffect(() => {
    viewerApi.setOnRoomElementSelected?.((roomElement) => {
      if (roomElement == null) {
        const currentSelectedObject = uiStore.getState().selectedObject;
        if (import.meta.env.DEV) {
          devLogger.debug("[SELECTION][Workspace] onRoomElementSelected:null", {
            selectedObjectBefore: currentSelectedObject,
          });
        }
        if (currentSelectedObject.type === "roomElement" || currentSelectedObject.type === "wall") {
          if (import.meta.env.DEV) {
            devLogger.debug("[SELECTION][Workspace] onRoomElementSelected:null -> clearUiSelection", {
              reason: "current selection is room/wall",
            });
          }
          clearUiSelection();
        }
        return;
      }
      actions.clearSelection();
      const wall = walls[roomElement.wallId];
      if (wall) {
        wallStore.getState().setOpen(true);
        wallStore.getState().selectWall(wall.id);
      }
      setSelectedTool("layout");
      setSelectedObject({ type: "roomElement", id: roomElement.elementId });
    });
  }, [actions, viewerApi, walls, clearUiSelection, setSelectedObject, setSelectedTool]);

  useEffect(() => {
    viewerApi.setOnRoomUtilitySelected?.((roomUtility) => {
      if (roomUtility == null) {
        const currentSelectedObject = uiStore.getState().selectedObject;
        if (currentSelectedObject.type === "roomUtility") clearUiSelection();
        return;
      }
      actions.clearSelection();
      const wall = walls[roomUtility.wallId];
      if (wall) {
        wallStore.getState().setOpen(true);
        wallStore.getState().selectWall(wall.id);
      }
      setSelectedTool("layout");
      setSelectedObject({ type: "roomUtility", id: roomUtility.utilityId });
    });
  }, [actions, viewerApi, walls, clearUiSelection, setSelectedObject, setSelectedTool]);

  useEffect(() => {
    viewerApi.setOnRoomElementTransform?.((elementId, config) => {
      const wall = walls.find((w) => (w.openings ?? []).some((o) => o.id === elementId));
      if (!wall) return;
      const wallLengthMm = wall.lengthCm * 10;
      const wallHeightMm = wall.heightCm * 10;
      const { horizontalOffsetMm, floorOffsetMm } = clampOpeningNoOverlap(
        config,
        elementId,
        wall.openings ?? [],
        wallLengthMm,
        wallHeightMm
      );
      const finalConfig = {
        ...config,
        horizontalOffsetMm,
        floorOffsetMm,
      };
      const currentOpening = wall.openings?.find((o) => o.id === elementId);
      wallStore.getState().updateWall(wall.id, {
        openings: (wall.openings ?? []).map((o) =>
          o.id === elementId
            ? {
                ...o,
                widthMm: finalConfig.widthMm,
                heightMm: finalConfig.heightMm,
                floorOffsetMm: finalConfig.floorOffsetMm,
                horizontalOffsetMm: finalConfig.horizontalOffsetMm,
              }
            : o
        ),
      });
      const room = projectRef.current.room;
      if (room) {
        actionsRef.current.updateProjectRoom({
          openings: room.openings.map((opening) =>
            opening.id === elementId
              ? {
                  ...opening,
                  widthMm: finalConfig.widthMm,
                  heightMm: finalConfig.heightMm,
                  thicknessMm: currentOpening?.thicknessMm ?? opening.thicknessMm,
                  kind: currentOpening?.kind ?? opening.kind,
                  floorOffsetMm: finalConfig.floorOffsetMm,
                  verticalOffsetMm: finalConfig.floorOffsetMm,
                  xPosMm: finalConfig.horizontalOffsetMm,
                  horizontalOffsetMm: finalConfig.horizontalOffsetMm,
                }
              : opening
          ),
        });
      }
      viewerApi.updateRoomElementConfig?.(elementId, finalConfig);
    });
  }, [viewerApi, walls]);

  useEffect(() => {
    viewerApi.setOnRoomUtilityTransform?.((utilityId, patch) => {
      const room = projectRef.current.room;
      if (!room) return;
      actionsRef.current.updateProjectRoom({
        utilities: (room.utilities ?? []).map((utility) =>
          utility.id === utilityId
            ? {
                ...utility,
                positionAlongWall: patch.positionAlongWall,
                heightMm: patch.heightMm,
              }
            : utility
        ),
      });
    });
  }, [viewerApi]);

  useEffect(() => {
    if (project.selectedWorkspaceBoxId) {
      viewerApi.selectBox(project.selectedWorkspaceBoxId);
    } else {
      viewerApi.selectBox(null);
    }
  }, [project.selectedWorkspaceBoxId, viewerApi]);

  useEffect(() => {
    if (!viewerApi.highlightBox) return;
    if (!project.viewerSettings.highlightEnabled) return;
    if (!project.selectedWorkspaceBoxId) return;
    viewerApi.highlightBox(project.selectedWorkspaceBoxId);
  }, [project.viewerSettings.highlightEnabled, project.selectedWorkspaceBoxId, viewerApi]);

  useEffect(() => {
    viewerApi.setOnBoxTransform((boxId, position, rotation) => {
      const project = projectRef.current;
      const box = project.workspaceBoxes.find((b) => b.id === boxId);
      if (box?.locked) return;
      actionsRef.current.updateWorkspaceBoxTransform(boxId, {
        x_mm: mToMm(position.x),
        y_mm: mToMm(position.y),
        z_mm: mToMm(position.z),
        rotacaoX_rad: rotation.x,
        rotacaoY_rad: rotation.y,
        rotacaoZ_rad: rotation.z,
        manualPosition: true,
      });
    });
  }, [viewerApi]);

  // Aplicar ferramenta 3D ativa ao Viewer (select/move/rotate). Só depender de activeViewerTool para não reaplicar a cada mudança de viewerSync (ex.: após rotacionar) e permitir que o gizmo desapareça ao clicar em "Selecionar".
  const viewerSyncRef = useRef(viewerSync);
  // eslint-disable-next-line react-hooks/refs -- intencional: espelho em ref com o `viewerSync` mais recente; o efeito abaixo depende só de activeViewerTool (ver comentário).
  viewerSyncRef.current = viewerSync;
  useEffect(() => {
    const mode = project.activeViewerTool ?? "select";
    viewerSyncRef.current.setActiveTool(mode);
  }, [project.activeViewerTool]);

  const [lockEnabled, setLockEnabledState] = useState(true);
  const [mouseMenuPosition, setMouseMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuLayerTarget, setContextMenuLayerTarget] = useState<MouseMenuTarget | null>(null);
  const handleToolSelect = useCallback((toolId: string) => {
    if (toolId === "select" || toolId === "move" || toolId === "rotate" || toolId === "scale") {
      actions.setActiveTool(toolId);
    }
  }, [actions]);
  const toggleLock = useCallback(() => {
    const next = !lockEnabled;
    setLockEnabledState(next);
    viewerSync.setLockEnabled(next);
    if (!next && project.selectedWorkspaceBoxId) {
      actions.updateWorkspaceBoxTransform(project.selectedWorkspaceBoxId, { manualPosition: true });
    }
  }, [lockEnabled, viewerSync, project.selectedWorkspaceBoxId, actions]);

const hasShownViewerReadyToastRef = useRef(false);

  useEffect(() => {
    const settings = project.viewerSettings;
    viewerApi.setPanelEdgesVisible?.(settings.showPanelEdges);
    viewerApi.setAllPanelsHidden?.(settings.hideAllPanels);
    if (viewerApi.setHiddenPanels) {
      viewerApi.setHiddenPanels(settings.hiddenPanels);
    } else {
      const panels: Array<"left" | "right" | "top" | "bottom" | "back"> = ["left", "right", "top", "bottom", "back"];
      panels.forEach((panel) => {
        viewerApi.setPanelHidden?.(panel, settings.hiddenPanels.includes(panel));
      });
    }
    viewerApi.setRoomCeilingVisible?.(settings.showCeiling);
    viewerApi.setWallEditMode?.(settings.wallEditMode);
    viewerApi.setMousePreset?.(settings.mousePreset);
    if (!photoModePanelOpen) {
      viewerApi.setBackgroundMode?.(settings.backgroundMode);
    }
    viewerApi.setMaterialQuality?.(settings.materialQuality);
    viewerApi.setReflectionsEnabled?.(settings.enableReflections);
    viewerApi.setPhotoModeEnabled?.(settings.photoModeEnabled);
    viewerApi.setExplodedViewEnabled?.(settings.explodedViewEnabled);
    viewerApi.setExplodedViewIntensity?.(settings.explodedViewIntensity);
    viewerApi.setHighlightEnabled?.(settings.highlightEnabled);
    viewerApi.setInternalMeasurementMode?.(settings.rulerEnabled);
    if (settings.internalRulerEnabled) viewerApi.enableInternalRuler?.();
    else viewerApi.disableInternalRuler?.();
    viewerApi.setUltraPerformanceModeOptions?.(settings.ultraPerformanceModeOptions);
    viewerApi.setUltraPerformanceMode?.(settings.ultraPerformanceModeOptions.enabled);
    viewerApi.setGlobalLightIntensity?.(settings.globalLightIntensity);
    viewerApi.setShadowIntensity?.(settings.shadowIntensity);
    viewerApi.setGlossIntensity?.(settings.glossIntensity);
    viewerApi.setMatteMode?.(settings.matteMode);
    viewerApi.setPanelRenderingEnabled?.(settings.panelRenderingEnabled);
  }, [project.viewerSettings, viewerApi, photoModePanelOpen]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    if (!viewerApi.viewerReady) return;
    const core = window.viewerCore;
    core?.bindInternalMeasurementBridge?.(
      () => projectRef.current.measurements?.internal ?? [],
      (entry) => actionsRef.current.addInternalMeasurement(entry)
    );
    core?.bindAutoLayoutBridge?.({
      getWorkspaceBoxes: () => projectRef.current.workspaceBoxes,
      applyPlan: (plan) => actionsRef.current.applyAutoLayoutPlan(plan),
      runProjectRoomFill: () => {
        actionsRef.current.runKitchenLayout30();
        return true;
      },
      getRoomLabelHint: () =>
        projectRef.current.autoFill?.layoutSummary ??
        projectRef.current.projectName ??
        undefined,
    });
    core?.bindOrlaBridge?.({
      getBoxOrlaConfig: (boxId) => {
        const state = projectRef.current;
        const wsBox = state.workspaceBoxes.find((b) => b.id === boxId);
        const boxesWithCut = buildBoxesWithCutList(state);
        const box = boxesWithCut.find((b) => b.id === boxId);
        if (!box) return null;
        const presets = normalizeOrlaPresets(state.orlaPresets);
        const pieces = (box.cutList ?? []).map((item) => {
          const panelId =
            typeof item.metadata?.panelId === "string" && item.metadata.panelId.trim().length > 0
              ? item.metadata.panelId
              : item.id;
          return {
            pieceId: panelId,
            panelType: item.tipo,
            config: resolvePieceOrlaConfig(
              panelId,
              state.orlaPieces,
              wsBox?.orlaPresetId,
              presets
            ),
          };
        });
        return { boxId, pieces, presets };
      },
    });
    const buildFinishBoxDims = (boxId: string) => {
      const state = projectRef.current;
      const wsBox = state.workspaceBoxes.find((b) => b.id === boxId);
      if (!wsBox) return null;
      const dimsRaw = core?.getBoxDimensions?.(boxId);
      const dims =
        dimsRaw &&
        typeof dimsRaw === "object" &&
        "width" in dimsRaw &&
        "height" in dimsRaw &&
        "depth" in dimsRaw
          ? (dimsRaw as { width: number; height: number; depth: number })
          : null;
      return {
        boxId,
        widthM: dims?.width ?? Math.max(0.001, (wsBox.dimensoes?.largura ?? 600) / 1000),
        heightM: dims?.height ?? Math.max(0.001, (wsBox.dimensoes?.altura ?? 720) / 1000),
        depthM: dims?.depth ?? Math.max(0.001, (wsBox.dimensoes?.profundidade ?? 600) / 1000),
      };
    };

    const getBoxWorldMatrix = (boxId: string) => core?.getBoxWorldMatrix?.(boxId) ?? null;

    core?.bindRemateBridge?.({
      listRematePieces: () => projectRef.current.remates ?? [],
      getBoxConfig: (boxId) => {
        const dims = buildFinishBoxDims(boxId);
        if (!dims) return null;
        const wsBox = projectRef.current.workspaceBoxes.find((b) => b.id === boxId);
        return {
          ...dims,
          box: wsBox
            ? {
                cabinetType: wsBox.cabinetType,
                feetEnabled: wsBox.feetEnabled,
                feetHeight: wsBox.feetHeight,
                pe_cm: wsBox.pe_cm,
              }
            : undefined,
        };
      },
      getBoxWorldMatrix,
    });

    core?.setOnRemateSelected?.((remateId) => {
      if (remateId) {
        if (projectRef.current.selectedWorkspaceBoxId) {
          actionsRef.current.clearSelection();
        }
        setSelectedObject({ type: "remate", id: remateId });
        setSelectedTool("home");
        return;
      }
      if (uiStore.getState().selectedObject.type === "remate") {
        clearUiSelection();
      }
    });

    core?.setOnRodapeSelected?.((rodapeId) => {
      if (rodapeId) {
        if (projectRef.current.selectedWorkspaceBoxId) {
          actionsRef.current.clearSelection();
        }
        setSelectedObject({ type: "rodape", id: rodapeId });
        setSelectedTool("home");
        return;
      }
      if (uiStore.getState().selectedObject.type === "rodape") {
        clearUiSelection();
      }
    });

    const buildHematiBoxConfig = (boxId: string) => {
      const dims = buildFinishBoxDims(boxId);
      if (!dims) return null;
      const hematis = (projectRef.current.hematis ?? []).filter((h) => h.parentBoxId === boxId);
      return { ...dims, hematis };
    };

    const buildRodapeBoxConfig = (boxId: string) => {
      const dims = buildFinishBoxDims(boxId);
      if (!dims) return null;
      const rodapes = (projectRef.current.rodapes ?? []).filter((r) => r.parentBoxId === boxId);
      return { ...dims, rodapes };
    };

    core?.bindHematiBridge?.({
      getBoxHematiConfig: (boxId) => buildHematiBoxConfig(boxId),
      listBoxHematiConfigs: () =>
        projectRef.current.workspaceBoxes
          .map((box) => buildHematiBoxConfig(box.id))
          .filter((cfg): cfg is NonNullable<typeof cfg> => cfg != null && cfg.hematis.length > 0),
      getBoxWorldMatrix,
    });

    core?.bindRodapeBridge?.({
      getBoxRodapeConfig: (boxId) => buildRodapeBoxConfig(boxId),
      listBoxRodapeConfigs: () =>
        projectRef.current.workspaceBoxes
          .map((box) => buildRodapeBoxConfig(box.id))
          .filter((cfg): cfg is NonNullable<typeof cfg> => cfg != null && cfg.rodapes.length > 0),
      getBoxWorldMatrix,
    });

    core?.setOnRemateTransform?.((remateId, patch) => {
      actionsRef.current.updateRemate(remateId, patch);
    });
    core?.setOnHematiTransform?.((hematiId, patch) => {
      actionsRef.current.updateHemati(hematiId, patch);
    });
    core?.setOnRodapeTransform?.((rodapeId, patch) => {
      actionsRef.current.updateRodape(rodapeId, patch);
    });
  }, [viewerApi.viewerReady, setSelectedObject, setSelectedTool, clearUiSelection]);

  useEffect(() => {
    if (!viewerApi.viewerReady) return;
    window.viewerCore?.syncOrlaVisuals?.();
    window.viewerCore?.syncRemateVisuals?.();
    window.viewerCore?.syncHematiVisuals?.();
    window.viewerCore?.syncRodapeVisuals?.();
    window.viewerCore?.refreshTransformControlsAttachment?.();
  }, [
    project.orlaPieces,
    project.orlaPresets,
    project.remates,
    project.hematis,
    project.rodapes,
    project.room,
    project.workspaceBoxes,
    project.boxes,
    settings.orlaRules,
    viewerApi.viewerReady,
  ]);

  useEffect(() => {
    if (!viewerApi.viewerReady) return;
    viewerApi.internalRuler?.syncFromProject?.(project.measurements?.internal ?? []);
  }, [project.measurements?.internal, viewerApi.viewerReady, viewerApi.internalRuler]);

  useEffect(() => {
    const clearKeyboardMoveTimers = () => {
      const state = keyboardMoveRef.current;
      if (state.accelTimeoutId != null) {
        window.clearTimeout(state.accelTimeoutId);
        state.accelTimeoutId = null;
      }
      if (state.repeatIntervalId != null) {
        window.clearInterval(state.repeatIntervalId);
        state.repeatIntervalId = null;
      }
      state.activeKey = null;
    };

    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || target.isContentEditable;
    };

    const performRemateMoveStep = (
      remateId: string,
      key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
      stepMm: number
    ) => {
      const remate = projectRef.current.remates?.find((r) => r.id === remateId);
      if (!remate) return;

      const stepM = stepMm / 1000;
      let localU = 0;
      let localV = 0;
      if (key === "ArrowUp") localV = stepM;
      else if (key === "ArrowDown") localV = -stepM;
      else if (key === "ArrowLeft") localU = -stepM;
      else localU = stepM;

      const yaw = remate.rotation?.yRad ?? 0;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const delta = new Vector3(
        localU * cos - localV * sin,
        localV,
        localU * sin + localV * cos
      );

      let nextPosition = { ...remate.position };

      if (remate.parentBoxId) {
        const worldMatrix = window.viewerCore?.getBoxWorldMatrix?.(remate.parentBoxId) as Matrix4 | undefined;
        if (worldMatrix) {
          const inv = new Matrix4().copy(worldMatrix).invert();
          const deltaLocal = delta.clone().applyMatrix4(inv);
          nextPosition = {
            xMm: remate.position.xMm + deltaLocal.x * 1000,
            yMm: remate.position.yMm + deltaLocal.y * 1000,
            zMm: remate.position.zMm + deltaLocal.z * 1000,
          };
        }
      } else {
        nextPosition = {
          xMm: remate.position.xMm + delta.x * 1000,
          yMm: remate.position.yMm + delta.y * 1000,
          zMm: remate.position.zMm + delta.z * 1000,
        };
      }

      const current = projectRef.current;
      projectRef.current = {
        ...current,
        remates: (current.remates ?? []).map((r) =>
          r.id === remateId
            ? { ...r, position: nextPosition, placementMode: "FREE" as const }
            : r
        ),
      };
      window.viewerCore?.syncRemateVisuals?.();
      window.viewerCore?.resolveFinishCollisionAfterSync?.({ remateId });
    };

    const performMoveStep = (key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", stepMm: number) => {
      const currentProject = projectRef.current;
      const boxId = currentProject.selectedWorkspaceBoxId;
      if (!boxId) return;
      const box = currentProject.workspaceBoxes.find((b) => b.id === boxId);
      if (!box || box.locked) return;
      const delta =
        key === "ArrowUp"
          ? { x: 0, y: stepMm }
          : key === "ArrowDown"
            ? { x: 0, y: -stepMm }
            : key === "ArrowLeft"
              ? { x: -stepMm, y: 0 }
              : { x: stepMm, y: 0 };
      actionsRef.current.updateWorkspaceBoxTransform(boxId, {
        x_mm: (box.posicaoX_mm ?? 0) + delta.x,
        y_mm: (box.posicaoY_mm ?? 0) + delta.y,
        manualPosition: true,
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      ctrlOrMetaPressedRef.current = event.ctrlKey || event.metaKey;
      const keyLower = event.key.toLowerCase();
      if (event.key === "Alt" && !event.repeat) {
        event.preventDefault();
        setShowKeyboardShortcutsHelp((prev) => !prev);
        return;
      }
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      if (ctrlOrMeta && !event.altKey && keyLower === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          actionsRef.current.redo();
        } else {
          actionsRef.current.undo();
        }
        return;
      }
      if (ctrlOrMeta && !event.altKey && keyLower === "y") {
        event.preventDefault();
        actionsRef.current.redo();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        const uiSelection = uiStore.getState().selectedObject;
        if (uiSelection.type === "remate") {
          actionsRef.current.removeRemate(uiSelection.id);
          clearUiSelection();
          return;
        }
        const currentProject = projectRef.current;
        const validIds = new Set(currentProject.workspaceBoxes.map((box) => box.id));
        const multiSelectionIds = multiSelectedBoxIdsRef.current.filter((id) => validIds.has(id));
        const selectedId = currentProject.selectedWorkspaceBoxId;
        const idsToDelete = multiSelectionIds.length > 0
          ? Array.from(new Set(multiSelectionIds))
          : selectedId
            ? [selectedId]
            : [];
        if (idsToDelete.length === 0) return;
        for (const boxId of idsToDelete) {
          actionsRef.current.removeWorkspaceBoxById(boxId);
        }
        multiSelectedBoxIdsRef.current = [];
        return;
      }
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown" && event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const key = event.key;
      const state = keyboardMoveRef.current;
      if (state.activeKey === key) return;
      clearKeyboardMoveTimers();
      state.activeKey = key;

      const uiSelection = uiStore.getState().selectedObject;
      const remateStep = 1;
      if (uiSelection.type === "remate") {
        performRemateMoveStep(uiSelection.id, key, remateStep);
        state.accelTimeoutId = window.setTimeout(() => {
          state.repeatIntervalId = window.setInterval(() => {
            if (keyboardMoveRef.current.activeKey !== key) return;
            performRemateMoveStep(uiSelection.id, key, remateStep);
          }, 40);
        }, 200);
        return;
      }

      performMoveStep(key, 1);
      state.accelTimeoutId = window.setTimeout(() => {
        state.repeatIntervalId = window.setInterval(() => {
          if (keyboardMoveRef.current.activeKey !== key) return;
          performMoveStep(key, 10);
        }, 40);
      }, 200);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      ctrlOrMetaPressedRef.current = event.ctrlKey || event.metaKey;
      const state = keyboardMoveRef.current;
      if (state.activeKey == null) return;
      if (event.key !== state.activeKey) return;
      clearKeyboardMoveTimers();
    };

    const handleWindowBlur = () => {
      ctrlOrMetaPressedRef.current = false;
      clearKeyboardMoveTimers();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      clearKeyboardMoveTimers();
    };
  }, []);

  const workspacePositionKey = useMemo(
    () => JSON.stringify(project.workspaceBoxes.map((b) => [b.id, b.posicaoX_mm, b.posicaoY_mm, b.posicaoZ_mm])),
    [project.workspaceBoxes]
  );

  const prevBoxesRef = useRef<string>("");
  useEffect(() => {
    const key = workspacePositionKey;
    if (project.estaCarregando) {
      prevBoxesRef.current = key;
      return;
    }
    prevBoxesRef.current = key;
  }, [workspacePositionKey, project.estaCarregando]);

  useEffect(() => {
    if (viewerApi.viewerReady) {
      if (!hasShownViewerReadyToastRef.current) {
        hasShownViewerReadyToastRef.current = true;
        showToast("Viewer pronto.", "info", 1400);
      }
    } else {
      hasShownViewerReadyToastRef.current = false;
    }
  }, [viewerApi.viewerReady, showToast]);

return (
    <>
    <main
      className="workspace-root"
      style={{ position: "relative", zIndex: 0 }}
      aria-label="Área de design 3D"
      onPointerDown={() => {
        if (mouseMenuPosition) setMouseMenuPosition(null);
        setContextMenuLayerTarget(null);
        setContextSelectedBoxIds([]);
      }}
    >
      <div className="workspace-canvas">
        <div className="workspace-toolbars" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <UnifiedTopToolbar
            onNovo={handleTopToolbarNovo}
            onProjetos={handleTopToolbarProjetos}
            activeTool={project.activeViewerTool ?? "select"}
            onToolSelect={(toolId, _eventKey) => handleToolSelect(toolId)}
            lockEnabled={lockEnabled}
            onToggleLock={toggleLock}
          />
          <ViewerToolbar confirmNewOpen={confirmNewOpen} setConfirmNewOpen={setConfirmNewOpen} />
          <Tools3DToolbar
            activeTool={project.activeViewerTool ?? "select"}
            onToolSelect={handleToolSelect}
          />
        </div>
<div className="workspace-viewer" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
          <div
            ref={viewerSurfaceRef}
            style={{
              position: "relative",
              flex: 1,
              minHeight: 0,
            }}
          >
            <div
              ref={containerRef}
              onPointerDownCapture={(event) => {
                ctrlOrMetaPressedRef.current = event.ctrlKey || event.metaKey;
                pointerToggleSelectionRef.current = event.ctrlKey || event.metaKey;
              }}
              onMouseDownCapture={(event) => {
                pointerToggleSelectionRef.current = event.ctrlKey || event.metaKey;
              }}
              onClickCapture={(event) => {
                pointerToggleSelectionRef.current = event.ctrlKey || event.metaKey;
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                const hit = viewerApi.getContextMenuLayerHit?.(event) ?? null;
                if (import.meta.env.DEV && hit?.type === "door" && hit.doorLayerId) {
                  devLogger.debug("[DOOR-MAT] Workspace onContextMenu — hit recebido (será usado no menu)", {
                    boxId: hit.boxId,
                    doorLayerId: hit.doorLayerId,
                    type: hit.type,
                  });
                }
                setContextMenuLayerTarget(hit);
                setContextSelectedBoxIds([...multiSelectedBoxIdsRef.current]);
                setMouseMenuPosition({ x: event.clientX, y: event.clientY });
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                overflow: "hidden",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
              }}
              aria-hidden
            >
              <BoxInfoOverlay />
              <InternalMeasurementsPanel />
            </div>
          </div>
          {!viewerApi.viewerReady && (
            <div className="workspace-loading-overlay" aria-live="polite">
              <span className="workspace-loading-spinner" aria-hidden="true" />
              <span>A carregar viewer 3D...</span>
            </div>
          )}
          {mouseMenuPosition && (
            <ContextMenu
              position={mouseMenuPosition}
              onClose={() => {
                setMouseMenuPosition(null);
                setContextMenuLayerTarget(null);
                setContextSelectedBoxIds([]);
              }}
              contextMenuLayerTarget={contextMenuLayerTarget}
              onDoorMaterialChange={(boxId, doorLayerId, materialId) => {
                if (import.meta.env.DEV) {
                  devLogger.debug("[DOOR-MAT] 1 Workspace.onDoorMaterialChange", { boxId, doorLayerId, materialId, when: "before setState" });
                }
                actions.setDoorMaterial(boxId, doorLayerId, materialId);
                viewerApi.updateDoorMaterial?.(boxId, doorLayerId, materialId);
                if (import.meta.env.DEV) {
                  devLogger.debug("[DOOR-MAT] 2 Workspace.onDoorMaterialChange done (viewer updated)", { boxId, doorLayerId, materialId });
                }
              }}
              onDrawerMaterialChange={(boxId, drawerLayerId, materialId) => {
                actions.setDrawerMaterial(boxId, drawerLayerId, materialId);
                viewerApi.updateDrawerMaterial?.(boxId, drawerLayerId, materialId);
              }}
              selectedBoxIds={contextSelectedBoxIds}
            />
          )}
          {showKeyboardShortcutsHelp && (
            <div
              aria-live="polite"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 120,
                minWidth: 260,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(8, 12, 26, 0.92)",
                color: "var(--text-main)",
                fontSize: 12,
                lineHeight: 1.45,
                pointerEvents: "none",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Atalhos do teclado</div>
              <div>Ctrl+Z: Desfazer</div>
              <div>Ctrl+Y: Refazer</div>
              <div>Delete/Backspace: Excluir seleção</div>
              <div>Ctrl+Click: Adicionar/remover da seleção</div>
              <div>Setas: Mover caixa selecionada</div>
              <div>Alt: Mostrar/ocultar esta ajuda</div>
            </div>
          )}
        </div>
      </div>
    </main>
    </>
  );
}

