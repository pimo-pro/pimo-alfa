import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { extractPartsFromGLB } from "../../../core/glb";
import { glbPartsToCutListItems } from "../../../core/glb";
import { calcularPrecoCutList } from "../../../core/pricing/pricing";
import { useProject } from "../../../context/useProject";
import { useToast } from "../../../context/ToastContext";
import { usePimoViewer } from "../../../hooks/usePimoViewer";
import { createViewerApiAdapter } from "../../../core/viewer/viewerApiAdapter";
import { useMultiBoxManager } from "../../../core/multibox";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import ViewerToolbar from "../viewer-toolbar/ViewerToolbar";
import Tools3DToolbar from "../viewer-toolbar/Tools3DToolbar";
import { loadViewerCore } from "../../../core/viewer/viewerEngineLoader";
import {
  toPlacedModelMm,
  positionMmToLocalM,
  computeAutoPositionLocal,
} from "../../../core/layout/viewerLayoutAdapter";
import { mToMm } from "../../../utils/units";
import { getModelo } from "../../../core/cad/cadModels";
import { useWallStore, wallStore } from "../../../stores/wallStore";
import { useUiStore } from "../../../stores/uiStore";
import { clampOpeningNoOverlap } from "../../../utils/openingConstraints";
import { useGerarArquivoHandlers } from "../../../hooks/useGerarArquivoHandlers";
import GerarArquivoModal from "../right-panel/GerarArquivoModal";
import BoxInfoOverlay from "./BoxInfoOverlay";
import ContextMenu from "./ContextMenu";
import { RulerSystem } from "../../../core/ruler/RulerSystem";
import { devLogger } from "../../../utils/devLogger";

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
  const { project, actions, viewerSync } = useProject();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const { showToast, startLoading, stopLoading } = useToast();
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
  const selectedWallId = useWallStore((state) => state.selectedWallId);
  const selectedObject = useUiStore((state) => state.selectedObject);
  const setSelectedObject = useUiStore((state) => state.setSelectedObject);
  const clearUiSelection = useUiStore((state) => state.clearSelection);
  const setSelectedTool = useUiStore((state) => state.setSelectedTool);

  const [showGerarArquivoModal, setShowGerarArquivoModal] = useState(false);
  const gerarArquivoHandlers = useGerarArquivoHandlers();
  const viewerCoreInstanceRef = useRef<{ dispose: () => void } | null>(null);
  const rulerSystemRef = useRef<RulerSystem | null>(null);
  const projectRef = useRef(project);
  const keyboardMoveRef = useRef<{
    activeKey: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | null;
    accelTimeoutId: number | null;
    repeatIntervalId: number | null;
  }>({
    activeKey: null,
    accelTimeoutId: null,
    repeatIntervalId: null,
  });
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

  useEffect(() => {
    const handleOpenGerarArquivo = () => setShowGerarArquivoModal(true);
    window.addEventListener("pimo:open-gerar-arquivo-modal", handleOpenGerarArquivo);
    return () => window.removeEventListener("pimo:open-gerar-arquivo-modal", handleOpenGerarArquivo);
  }, []);

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

  // MultiBoxManager: sincroniza workspaceBoxes ↔ viewer; addBox/removeBox delegam a actions
  useMultiBoxManager({
    viewerApi: viewerApi as import("../../../core/multibox/types").MultiBoxViewerApi,
    project,
    actions,
  });

  useEffect(() => {
    viewerApi.setOnBoxSelected((boxId) => {
      if (boxId) {
        actions.selectBox(boxId);
        return;
      }
      if (project.selectedWorkspaceBoxId != null && project.selectedWorkspaceBoxId !== "") {
        actions.clearSelection();
        clearUiSelection();
      }
    });
  }, [actions, viewerApi, clearUiSelection, project.selectedWorkspaceBoxId]);

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
        clearUiSelection();
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
      rulerSystemRef.current?.notifyDrag(boxId);
    });
  }, [viewerApi]);

  // Aplicar ferramenta 3D ativa ao Viewer (select/move/rotate). Só depender de activeViewerTool para não reaplicar a cada mudança de viewerSync (ex.: após rotacionar) e permitir que o gizmo desapareça ao clicar em "Selecionar".
  const viewerSyncRef = useRef(viewerSync);
  viewerSyncRef.current = viewerSync;
  useEffect(() => {
    const mode = project.activeViewerTool ?? "select";
    viewerSyncRef.current.setActiveTool(mode);
    rulerSystemRef.current?.clearMeasurements();
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
    viewerApi.setMousePreset?.(settings.mousePreset);
    viewerApi.setBackgroundMode?.(settings.backgroundMode);
    viewerApi.setMaterialQuality?.(settings.materialQuality);
    viewerApi.setReflectionsEnabled?.(settings.enableReflections);
    viewerApi.setPhotoModeEnabled?.(settings.photoModeEnabled);
    viewerApi.setExplodedViewEnabled?.(settings.explodedViewEnabled);
    viewerApi.setExplodedViewIntensity?.(settings.explodedViewIntensity);
    viewerApi.setHighlightEnabled?.(settings.highlightEnabled);
    viewerApi.setUltraPerformanceModeOptions?.(settings.ultraPerformanceModeOptions);
    viewerApi.setUltraPerformanceMode?.(settings.ultraPerformanceModeOptions.enabled);
  }, [
    project.viewerSettings,
    viewerApi,
  ]);

  useEffect(() => {
    const host = containerRef.current;
    const viewerCore = window.viewerCore as {
      sceneManager?: { scene?: THREE.Scene };
      cameraManager?: { camera?: THREE.Camera };
      getBoxIdByMeshPublic?: (_mesh: THREE.Object3D) => string | null;
      boxes?: Map<string, { mesh?: THREE.Object3D }>;
    } | undefined;
    if (!host || !viewerCore?.sceneManager?.scene || !viewerCore?.cameraManager?.camera) return;
    rulerSystemRef.current?.dispose();
    rulerSystemRef.current = new RulerSystem({
      host,
      getScene: () => viewerCore.sceneManager?.scene ?? null,
      getCamera: () => viewerCore.cameraManager?.camera ?? null,
      projectWorldToScreen: (p) => viewerApi.projectWorldToScreen?.(p) ?? null,
      applyDistanceDeltaMm: (deltaMm) => {
        const currentProject = projectRef.current;
        const id = currentProject.selectedWorkspaceBoxId;
        if (!id) return;
        const current = currentProject.workspaceBoxes.find((b) => b.id === id);
        if (!current) return;
        actionsRef.current.updateWorkspaceBoxTransform(id, {
          x_mm: (current.posicaoX_mm ?? 0) + deltaMm.x,
          y_mm: (current.posicaoY_mm ?? 0) + deltaMm.y,
          z_mm: (current.posicaoZ_mm ?? 0) + deltaMm.z,
          manualPosition: true,
        });
      },
      getMovableObjects: () => {
        const scene = viewerCore.sceneManager?.scene;
        if (!scene) return [];
        const out: THREE.Object3D[] = [];
        const seen = new Set<string>();
        const boxesMap = viewerCore.boxes;
        if (boxesMap instanceof Map) {
          boxesMap.forEach((entry, boxId) => {
            const mesh = entry?.mesh;
            if (!mesh || seen.has(`box:${boxId}`)) return;
            seen.add(`box:${boxId}`);
            out.push(mesh);
          });
        }
        scene.traverse((obj) => {
          const wallId = obj.userData?.wallId;
          if (typeof wallId !== "string") return;
          const key = `wall:${wallId}`;
          if (seen.has(key)) return;
          seen.add(key);
          out.push(obj);
        });
        return out;
      },
      getMovableObjectById: (boxId) => {
        if (!boxId) return null;
        const mesh = viewerCore.boxes?.get(boxId)?.mesh;
        return mesh ?? null;
      },
      getActiveBoxId: () => projectRef.current.selectedWorkspaceBoxId || null,
    });
    return () => {
      rulerSystemRef.current?.dispose();
      rulerSystemRef.current = null;
    };
  }, [viewerApi]);

  useEffect(() => {
    rulerSystemRef.current?.setMode(project.viewerSettings.rulerEnabled ? "ON" : "OFF");
  }, [project.viewerSettings.rulerEnabled]);

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
      rulerSystemRef.current?.notifyDrag(boxId);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const keyLower = event.key.toLowerCase();
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
      const state = keyboardMoveRef.current;
      if (state.activeKey == null) return;
      if (event.key !== state.activeKey) return;
      clearKeyboardMoveTimers();
      if (!projectRef.current.viewerSettings.rulerEnabled) {
        rulerSystemRef.current?.clearMeasurements();
      }
    };

    const handleWindowBlur = () => {
      clearKeyboardMoveTimers();
      if (!projectRef.current.viewerSettings.rulerEnabled) {
        rulerSystemRef.current?.clearMeasurements();
      }
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

  useEffect(() => {
    viewerApi.setOnModelLoaded((boxId, modelInstanceId, object) => {
      const loadingId = startLoading("A processar modelo no Viewer...");
      try {
        const scene = object as THREE.Object3D;
        const parts = extractPartsFromGLB(scene);
        const materialTipo = projectRef.current.material.tipo;
        const espessura = projectRef.current.material.espessura;
        const items = glbPartsToCutListItems(parts, boxId, modelInstanceId, materialTipo, espessura);
        const withPreco = calcularPrecoCutList(items);
        actions.setExtractedPartsForBox(boxId, modelInstanceId, withPreco);

        const box = projectRef.current.workspaceBoxes.find((b) => b.id === boxId);
        const modelId = box?.models?.find((m) => m.id === modelInstanceId)?.modelId;
        const isCatalogModel = modelId?.startsWith("catalog:");
        scene.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const modelSizeMm = {
          largura: Math.max(1, mToMm(size.x)),
          altura: Math.max(1, mToMm(size.y)),
          profundidade: Math.max(1, mToMm(size.z)),
        };

        // Caixa CAD-only: dimensões vêm do GLB; atualizar estado para cut list, lista de caixas e reflow
        const isCadOnlyBox =
          box && (box.models?.length ?? 0) > 0 && box.prateleiras === 0 && box.gavetas === 0;
        if (isCadOnlyBox && !isCatalogModel) {
          actions.setWorkspaceBoxDimensoes(boxId, modelSizeMm);
          if (modelId) {
            const cadModel = getModelo(modelId);
            if (cadModel?.nome) actions.setWorkspaceBoxNome(boxId, cadModel.nome);
          }
          showToast("Modelo processado com sucesso.", "info", 1400);
          return;
        }

        const boxDims = viewerApi.getBoxDimensions(boxId);
        if (!boxDims || !modelId) return;

        const list = viewerApi.listModels(boxId) ?? [];
        const placedModels = list
          .filter((m) => m.id !== modelInstanceId)
          .map((m) => {
            const pos = viewerApi.getModelPosition(boxId, m.id);
            const sz = viewerApi.getModelBoundingBoxSize(boxId, m.id);
            const otherModelId = box?.models?.find((x) => x.id === m.id)?.modelId ?? m.id;
            if (!pos || !sz) return null;
            return toPlacedModelMm(m.id, otherModelId, pos, sz, boxDims);
          })
          .filter(Boolean) as ReturnType<typeof toPlacedModelMm>[];

        const result = computeAutoPositionLocal(
          boxDims,
          placedModels,
          modelId,
          modelSizeMm,
          modelInstanceId
        );
        const positionLocal = positionMmToLocalM(result.positionMm, boxDims);
        viewerApi.setModelPosition(boxId, modelInstanceId, positionLocal);
        actions.setModelPositionInBox(boxId, modelInstanceId, positionLocal);
        showToast("Modelo posicionado automaticamente.", "info", 1400);
      } catch {
        showToast("Falha ao processar o modelo carregado.", "error");
      } finally {
        stopLoading(loadingId);
      }
    });
    return () => viewerApi.setOnModelLoaded(null);
  }, [actions, viewerApi, startLoading, stopLoading, showToast]);

return (
    <>
    <main
      className="workspace-root"
      style={{ position: "relative", zIndex: 0 }}
      aria-label="Área de design 3D"
      onPointerDown={() => {
        if (mouseMenuPosition) setMouseMenuPosition(null);
        setContextMenuLayerTarget(null);
      }}
    >
      <div className="workspace-canvas">
        <div className="workspace-toolbars" style={{ display: "flex", flexDirection: "column" }}>
          <ViewerToolbar />
          <Tools3DToolbar
            activeTool={project.activeViewerTool ?? "select"}
            onToolSelect={handleToolSelect}
            lockEnabled={lockEnabled}
            onToggleLock={toggleLock}
          />
        </div>
<div className="workspace-viewer" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
          <div
            style={{
              position: "relative",
              flex: 1,
              minHeight: 0,
            }}
          >
            <div
              ref={containerRef}
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
            />
          )}
        </div>
      </div>
    </main>
      {showGerarArquivoModal && (
        <GerarArquivoModal
          onClose={() => setShowGerarArquivoModal(false)}
          hasBoxes={gerarArquivoHandlers.hasBoxes}
          onCutlist={gerarArquivoHandlers.onCutlist}
          onPdfTecnico={gerarArquivoHandlers.onPdfTecnico}
          onUnificado={gerarArquivoHandlers.onUnificado}
          onAmbos={gerarArquivoHandlers.onAmbos}
          onLayoutCortePro={gerarArquivoHandlers.onLayoutCortePro}
          onArquivoCompleto={gerarArquivoHandlers.onArquivoCompleto}
        />
      )}
    </>
  );
}

