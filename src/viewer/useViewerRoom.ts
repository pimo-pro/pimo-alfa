/**
 * Hook especializado para sala e paredes no viewer.
 * Obtém a API de sala a partir de window.viewerCore (ver viewerCoreWindow.d.ts).
 */
import { useMemo } from "react";

const NOOP = () => {};
const NOOP_RETURN_FALSE = () => false;
const NOOP_RETURN_EMPTY = () => "";
const NOOP_RETURN_NULL = () => null;

/** API NOOP com exatamente as mesmas chaves que a API real. Referência estável. */
const ROOM_NOOP_API = {
  createRoom: NOOP,
  createRoomWithDimensions: NOOP,
  removeRoom: NOOP,
  setRoomDimensions: NOOP,
  addExtraWall: NOOP,
  setRoomLocked: NOOP,
  selectWallByIndex: NOOP,
  selectRoomElementById: NOOP,
  setPlacementMode: NOOP,
  addDoorToRoom: NOOP_RETURN_EMPTY,
  addWindowToRoom: NOOP_RETURN_EMPTY,
  setOnRoomElementPlaced: NOOP,
  setOnRoomElementSelected: NOOP,
  setOnWallSelected: NOOP,
  setOnWallTransform: NOOP,
  setOnRoomElementTransform: NOOP,
  updateRoomElementConfig: NOOP_RETURN_FALSE,
  setRoomBounds: NOOP,
  clearRoomBounds: NOOP,
  getRoomExists: NOOP_RETURN_FALSE,
  getRoomLocked: NOOP_RETURN_FALSE,
  getRoomDimensions: NOOP_RETURN_NULL,
  getRoomVisible: NOOP_RETURN_FALSE,
  hideRoom: NOOP,
  showRoom: NOOP,
} as const;

export function useViewerRoom() {
  const viewerCore =
    typeof window !== "undefined" ? (window as Window).viewerCore : undefined;

  return useMemo(() => {
    if (!viewerCore) return ROOM_NOOP_API;

    const room = viewerCore.roomManager;
    const bindMaybe = (
      fn: ((..._args: unknown[]) => unknown) | undefined,
      target: unknown
    ) => (fn ? fn.bind(target) : undefined);
    const bindCore = (fn: ((..._args: unknown[]) => unknown) | undefined) =>
      bindMaybe(fn, viewerCore);
    const bindRoom = (fn: ((..._args: unknown[]) => unknown) | undefined) =>
      room ? bindMaybe(fn, room) : undefined;

    return {
      createRoom: bindCore(viewerCore.createRoom) ?? bindRoom(room?.createRoom) ?? NOOP,
      createRoomWithDimensions: bindCore(viewerCore.createRoomWithDimensions) ?? NOOP,
      removeRoom: bindCore(viewerCore.removeRoom) ?? bindRoom(room?.removeRoom) ?? NOOP,
      setRoomDimensions: bindCore(viewerCore.setRoomDimensions) ?? NOOP,
      addExtraWall: bindCore(viewerCore.addExtraWall) ?? NOOP,
      setRoomLocked: bindCore(viewerCore.setRoomLocked) ?? NOOP,
      selectWallByIndex: bindCore(viewerCore.selectWallByIndex) ?? NOOP,
      selectRoomElementById: bindCore(viewerCore.selectRoomElementById) ?? NOOP,
      setPlacementMode: bindCore(viewerCore.setPlacementMode) ?? NOOP,
      addDoorToRoom: bindCore(viewerCore.addDoorToRoom) ?? bindRoom(room?.addDoorToRoom) ?? NOOP_RETURN_EMPTY,
      addWindowToRoom: bindCore(viewerCore.addWindowToRoom) ?? bindRoom(room?.addWindowToRoom) ?? NOOP_RETURN_EMPTY,
      setOnRoomElementPlaced: bindCore(viewerCore.setOnRoomElementPlaced) ?? NOOP,
      setOnRoomElementSelected: bindCore(viewerCore.setOnRoomElementSelected) ?? NOOP,
      setOnWallSelected: bindCore(viewerCore.setOnWallSelected) ?? NOOP,
      setOnWallTransform: bindCore(viewerCore.setOnWallTransform) ?? NOOP,
      setOnRoomElementTransform: bindCore(viewerCore.setOnRoomElementTransform) ?? NOOP,
      updateRoomElementConfig: bindCore(viewerCore.updateRoomElementConfig) ?? NOOP_RETURN_FALSE,
      setRoomBounds: bindCore(viewerCore.setRoomBounds) ?? NOOP,
      clearRoomBounds: bindCore(viewerCore.clearRoomBounds) ?? NOOP,
      getRoomExists: bindCore(viewerCore.getRoomExists) ?? bindRoom(room?.getRoomExists) ?? NOOP_RETURN_FALSE,
      getRoomLocked: bindCore(viewerCore.getRoomLocked) ?? NOOP_RETURN_FALSE,
      getRoomDimensions:
        bindCore(viewerCore.getRoomDimensions) ?? bindRoom(room?.getRoomDimensions) ?? NOOP_RETURN_NULL,
      getRoomVisible: bindCore(viewerCore.getRoomVisible) ?? bindRoom(room?.getRoomVisible) ?? NOOP_RETURN_FALSE,
      hideRoom: bindCore(viewerCore.hideRoom) ?? bindRoom(room?.hideRoom) ?? NOOP,
      showRoom: bindCore(viewerCore.showRoom) ?? bindRoom(room?.showRoom) ?? NOOP,
    };
  }, [viewerCore]);
}
