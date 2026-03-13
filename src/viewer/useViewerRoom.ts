/**
 * Hook especializado para sala e paredes no viewer.
 * Obtém a API de sala a partir de window.viewerCore (ver viewerCoreWindow.d.ts).
 */
import { useMemo } from "react";

const NOOP = () => {};
const NOOP_RETURN_FALSE = () => false;
const NOOP_RETURN_NULL = () => null;

/** API NOOP com exatamente as mesmas chaves que a API real. Referência estável. */
const ROOM_NOOP_API = {
  createRoom: NOOP,
  removeRoom: NOOP,
  selectWallByIndex: NOOP,
  selectRoomElementById: NOOP,
  setPlacementMode: NOOP,
  addDoorToRoom: NOOP_RETURN_FALSE,
  addWindowToRoom: NOOP_RETURN_FALSE,
  setOnRoomElementPlaced: NOOP,
  setOnRoomElementSelected: NOOP,
  setOnWallSelected: NOOP,
  setOnWallTransform: NOOP,
  setOnRoomElementTransform: NOOP,
  updateRoomElementConfig: NOOP_RETURN_FALSE,
  setRoomBounds: NOOP,
  clearRoomBounds: NOOP,
  getRoomExists: NOOP_RETURN_FALSE,
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
    const bind = (fn: ((..._args: unknown[]) => unknown) | undefined, target: unknown) =>
      fn ? fn.bind(target) : NOOP;
    const bindCore = (fn: ((..._args: unknown[]) => unknown) | undefined) =>
      bind(fn, viewerCore);
    const bindRoom = (fn: ((..._args: unknown[]) => unknown) | undefined) =>
      room && fn ? fn.bind(room) : NOOP;

    return {
      createRoom: bindCore(viewerCore.createRoom) ?? bindRoom(room?.createRoom),
      removeRoom: bindCore(viewerCore.removeRoom) ?? bindRoom(room?.removeRoom),
      selectWallByIndex: bindCore(viewerCore.selectWallByIndex),
      selectRoomElementById: bindCore(viewerCore.selectRoomElementById),
      setPlacementMode: bindCore(viewerCore.setPlacementMode),
      addDoorToRoom: bindCore(viewerCore.addDoorToRoom) ?? bindRoom(room?.addDoorToRoom),
      addWindowToRoom: bindCore(viewerCore.addWindowToRoom) ?? bindRoom(room?.addWindowToRoom),
      setOnRoomElementPlaced: bindCore(viewerCore.setOnRoomElementPlaced),
      setOnRoomElementSelected: bindCore(viewerCore.setOnRoomElementSelected),
      setOnWallSelected: bindCore(viewerCore.setOnWallSelected),
      setOnWallTransform: bindCore(viewerCore.setOnWallTransform),
      setOnRoomElementTransform: bindCore(viewerCore.setOnRoomElementTransform),
      updateRoomElementConfig: bindCore(viewerCore.updateRoomElementConfig),
      setRoomBounds: bindCore(viewerCore.setRoomBounds),
      clearRoomBounds: bindCore(viewerCore.clearRoomBounds),
      getRoomExists: bindCore(viewerCore.getRoomExists) ?? bindRoom(room?.getRoomExists),
      getRoomDimensions: bindCore(viewerCore.getRoomDimensions) ?? bindRoom(room?.getRoomDimensions),
      getRoomVisible: bindCore(viewerCore.getRoomVisible) ?? bindRoom(room?.getRoomVisible),
      hideRoom: bindCore(viewerCore.hideRoom) ?? bindRoom(room?.hideRoom),
      showRoom: bindCore(viewerCore.showRoom) ?? bindRoom(room?.showRoom),
    };
  }, [viewerCore]);
}
