import { useCallback, useMemo, useRef } from "react";
import type {
  DoorWindowConfig,
  ProjectState,
  RoomConfig,
  ViewerApi,
  ViewerRenderOptions,
  ViewerRenderResult,
  ViewerSnapshot,
  ViewerSync,
  ViewerToolMode,
} from "../context/projectTypes";

/**
 * Hook que fornece a interface ViewerSync para o ProjectContext.
 * O viewer real é registrado via registerViewerApi pelo Workspace (adapter de PimoViewerApi).
 * Retorno memoizado para evitar re-renders desnecessários em consumidores (ex.: useMemo das actions).
 */
export const useViewerSync = (_project: ProjectState): ViewerSync => {
  const viewerApiRef = useRef<ViewerApi | null>(null);

  const restoreViewerSnapshot = useCallback((snapshot: ViewerSnapshot | null) => {
    viewerApiRef.current?.restoreSnapshot(snapshot);
  }, []);

  const renderScene = useCallback(
    (options: ViewerRenderOptions): Promise<ViewerRenderResult | null> =>
      viewerApiRef.current?.renderScene(options) ?? Promise.resolve(null),
    []
  );

  const setActiveTool = useCallback((mode: ViewerToolMode) => {
    viewerApiRef.current?.setTool(mode);
  }, []);

  const setUltraPerformanceMode = useCallback((active: boolean) => {
    viewerApiRef.current?.setUltraPerformanceMode(active);
  }, []);

  const getUltraPerformanceMode = useCallback(
    () => viewerApiRef.current?.getUltraPerformanceMode() ?? false,
    []
  );

  const createRoom = useCallback((config: RoomConfig) => {
    viewerApiRef.current?.createRoom(config);
  }, []);

  const removeRoom = useCallback(() => {
    viewerApiRef.current?.removeRoom();
  }, []);

  const setPlacementMode = useCallback((mode: "door" | "window" | null) => {
    viewerApiRef.current?.setPlacementMode?.(mode);
  }, []);

  const addDoorToRoom = useCallback(
    (wallId: number, config: DoorWindowConfig, elementId?: string) =>
      viewerApiRef.current?.addDoorToRoom?.(wallId, config, elementId) ?? "",
    []
  );

  const addWindowToRoom = useCallback(
    (wallId: number, config: DoorWindowConfig, elementId?: string) =>
      viewerApiRef.current?.addWindowToRoom?.(wallId, config, elementId) ?? "",
    []
  );

  const setOnRoomElementPlaced = useCallback(
    (
      cb: ((_wallId: number, _config: DoorWindowConfig, _type: "door" | "window") => void) | null
    ) => {
      viewerApiRef.current?.setOnRoomElementPlaced?.(cb);
    },
    []
  );

  const setOnRoomElementSelected = useCallback(
    (
      cb: ((_data: { elementId: string; wallId: number; type: "door" | "window"; config: DoorWindowConfig } | null) => void) | null
    ) => {
      viewerApiRef.current?.setOnRoomElementSelected?.(cb);
    },
    []
  );

  const updateRoomElementConfig = useCallback(
    (elementId: string, config: DoorWindowConfig) =>
      viewerApiRef.current?.updateRoomElementConfig?.(elementId, config) ?? false,
    []
  );

  const setLockEnabled = useCallback((enabled: boolean) => {
    viewerApiRef.current?.setLockEnabled(enabled);
  }, []);

  const getLockEnabled = useCallback(
    () => viewerApiRef.current?.getLockEnabled?.() ?? false,
    []
  );

  const getCombinedBoundingBox = useCallback(
    () => viewerApiRef.current?.getCombinedBoundingBox?.() ?? null,
    []
  );

  const getSelectedBoxDimensions = useCallback(
    () => viewerApiRef.current?.getSelectedBoxDimensions?.() ?? null,
    []
  );

  const subscribeSelectedBoxChange = useCallback(
    (callback: (_id: string | null) => void) =>
      viewerApiRef.current?.subscribeSelectedBoxChange?.(callback) ?? (() => {}),
    []
  );

  const setDimensionsOverlayVisible = useCallback((visible: boolean) => {
    viewerApiRef.current?.setDimensionsOverlayVisible(visible);
  }, []);

  const getDimensionsOverlayVisible = useCallback(
    () => viewerApiRef.current?.getDimensionsOverlayVisible?.() ?? false,
    []
  );

  const toggleDimensionsOverlay = useCallback(
    () => viewerApiRef.current?.toggleDimensionsOverlay?.() ?? false,
    []
  );

  const getPrintReadyDimensions = useCallback(
    () =>
      viewerApiRef.current?.getPrintReadyDimensions?.() ?? {
        entries: [],
        generatedAt: Date.now(),
      },
    []
  );

  const getSelectedObjects = useCallback(
    (multiBoxIds?: string[]) => viewerApiRef.current?.getSelectedObjects?.(multiBoxIds) ?? [],
    []
  );

  const align = useCallback(
    (type: "right" | "left" | "front" | "back" | "top" | "bottom", multiBoxIds?: string[]) =>
      viewerApiRef.current?.align?.(type, multiBoxIds) ?? false,
    []
  );

  const getSelectedBoxScreenPosition = useCallback(
    () => viewerApiRef.current?.getSelectedBoxScreenPosition?.() ?? null,
    []
  );

  const getRightmostX = useCallback(
    () => viewerApiRef.current?.getRightmostX?.() ?? -0.1,
    []
  );

  const saveViewerSnapshot = useCallback(
    () => viewerApiRef.current?.saveSnapshot() ?? null,
    []
  );

  const registerViewerApi = useCallback((api: ViewerApi | null) => {
    viewerApiRef.current = api;
  }, []);

  return useMemo<ViewerSync>(
    () => ({
      notifyChangeSignal: _project,
      saveViewerSnapshot,
      restoreViewerSnapshot,
      registerViewerApi,
      renderScene,
      setActiveTool,
      setUltraPerformanceMode,
      getUltraPerformanceMode,
      createRoom,
      removeRoom,
      setPlacementMode,
      addDoorToRoom,
      addWindowToRoom,
      setOnRoomElementPlaced,
      setOnRoomElementSelected,
      updateRoomElementConfig,
      setLockEnabled,
      getLockEnabled,
      getCombinedBoundingBox,
      getSelectedBoxDimensions,
      subscribeSelectedBoxChange,
      setDimensionsOverlayVisible,
      getDimensionsOverlayVisible,
      toggleDimensionsOverlay,
      getPrintReadyDimensions,
      getSelectedObjects,
      align,
      getSelectedBoxScreenPosition,
      getRightmostX,
    }),
    [
      _project,
      saveViewerSnapshot,
      restoreViewerSnapshot,
      registerViewerApi,
      renderScene,
      setActiveTool,
      setUltraPerformanceMode,
      getUltraPerformanceMode,
      createRoom,
      removeRoom,
      setPlacementMode,
      addDoorToRoom,
      addWindowToRoom,
      setOnRoomElementPlaced,
      setOnRoomElementSelected,
      updateRoomElementConfig,
      setLockEnabled,
      getLockEnabled,
      getCombinedBoundingBox,
      getSelectedBoxDimensions,
      subscribeSelectedBoxChange,
      setDimensionsOverlayVisible,
      getDimensionsOverlayVisible,
      toggleDimensionsOverlay,
      getPrintReadyDimensions,
      getSelectedObjects,
      align,
      getSelectedBoxScreenPosition,
      getRightmostX,
    ]
  );
};
