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
import { applyRoomMeshFromWallStore, applyRoomOpeningsFromWallStore } from "../../../utils/roomMeshFromWallStore";
import { uiStore, useUiStore } from "../../../stores/uiStore";
import { clampOpeningNoOverlap } from "../../../utils/openingConstraints";
import BoxInfoOverlay from "./BoxInfoOverlay";
import ContextMenu from "./ContextMenu";
import { devLogger } from "../../../utils/devLogger";
import { useWorkspaceUndoRedoRegistry } from "../../../context/WorkspaceUndoRedoRegistryContext";
import { runProjectRedo, runProjectUndo } from "./workspaceUndoRedoHandlers";

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

  /** Após restaurar projeto/autosave (loadRoomConfig / clearRoom), recria ou remove a mesh da sala e as aberturas. */
  useEffect(() => {
    applyRoomMeshFromWallStore(viewerApi);
    applyRoomOpeningsFromWallStore(viewerApi);
  }, [viewerApi, roomMeshSyncToken]);

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
        setSelectedTool("home");
        if (import.meta.env.DEV) {
          const afterUi = uiStore.getState();
          devLogger.debug("[SELECTION][Workspace] modo painel -> box/home", {
            selectedObjectAfter: afterUi.selectedObject,
            selectedToolAfter: afterUi.selectedTool,
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
  }, [actions, viewerApi, clearUiSelection, project.selectedWorkspaceBoxId, setSelectedObject, setSelectedTool]);

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
    }
  }, [viewerApi, selectedObject]);

  useEffect(() => {
    viewerApi.setOnWallTransform?.((wallIndex, position, rotation) => {
      const wall = walls[wallIndex];
      if (!wall) return;
      wallStore.getState().updateWall(wall.id, {
        position: { x: position.x * 100, z: position.z * 100 },
        rotation,
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
      viewerApi.updateRoomElementConfig?.(elementId, finalConfig);
    });
  }, [viewerApi, walls]);

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
  const [contextMenuLayerTarget, setContextMenuLayerTarget] = useState<{
    boxId: string;
    type: "door" | "drawer";
    doorLayerId?: string;
    drawerLayerId?: string;
  } | null>(null);
  const handleToolSelect = useCallback((toolId: string) => {
    if (toolId === "select" || toolId === "move" || toolId === "rotate") {
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
    viewerSync.setDimensionsOverlayVisible(false);
  }, [viewerSync]);

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
    viewerApi.setMousePreset?.(settings.mousePreset === "orbital" ? "classic" : settings.mousePreset);
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
    viewerApi.setUltraPerformanceModeOptions?.(settings.ultraPerformanceModeOptions);
    viewerApi.setUltraPerformanceMode?.(settings.ultraPerformanceModeOptions.enabled);
    viewerApi.setGlobalLightIntensity?.(settings.globalLightIntensity);
    viewerApi.setShadowIntensity?.(settings.shadowIntensity);
    viewerApi.setGlossIntensity?.(settings.glossIntensity);
    viewerApi.setMatteMode?.(settings.matteMode);
  }, [project.viewerSettings, viewerApi, photoModePanelOpen]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

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
                if (import.meta.env.DEV && hit?.type === "door" && hit?.doorLayerId) {
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

