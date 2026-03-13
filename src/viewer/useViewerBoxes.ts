/**
 * Hook especializado para boxes no viewer.
 * Obtém a API de boxes a partir de window.viewerCore (ver viewerCoreWindow.d.ts).
 */
import { useMemo } from "react";

const NOOP = () => {};
const NOOP_SELECT_BOX = () => {};
const NOOP_RETURN_FALSE = () => false;
const NOOP_RETURN_NULL = () => null as {
  boxId: string;
  type: "door" | "drawer";
  doorLayerId?: string;
  drawerLayerId?: string;
} | null;

/** API NOOP com exatamente as mesmas chaves que a API real. Referência estável. */
const BOXES_NOOP_API = {
  addBox: () => false,
  removeBox: NOOP_RETURN_FALSE,
  updateBox: () => false,
  setBoxIndex: () => false,
  setBoxPosition: NOOP_RETURN_FALSE,
  setBoxGap: NOOP,
  setBoxSpacing: NOOP,
  updateBoxSpacing: NOOP,
  setOnBoxSelected: NOOP,
  setOnDoorLayerDoubleClick: NOOP,
  setOnBoxTransform: NOOP,
  setOnModelLoaded: NOOP,
  selectBox: NOOP_SELECT_BOX,
  setTransformMode: NOOP,
  addModelToBox: () => false,
  removeModelFromBox: () => false,
  clearModelsFromBox: NOOP,
  listModels: () => null,
  getBoxDimensions: () => null,
  getModelPosition: () => null,
  getModelBoundingBoxSize: () => null,
  setModelPosition: () => false,
  getContextMenuLayerHit: NOOP_RETURN_NULL,
} as const;

export function useViewerBoxes() {
  const viewerCore =
    typeof window !== "undefined" ? (window as Window).viewerCore : undefined;

  return useMemo(() => {
    if (!viewerCore) return BOXES_NOOP_API;

    const fromCore = (fn: ((..._args: unknown[]) => unknown) | undefined) =>
      fn ? fn.bind(viewerCore) : NOOP;

    const wrapBool = (fn: ((..._a: unknown[]) => unknown) | undefined) =>
      fn ? (...args: unknown[]) => { (fn as (..._a: unknown[]) => void)(...args); return true; } : NOOP_RETURN_FALSE;
    return {
      addBox: wrapBool(viewerCore.addBox),
      removeBox: wrapBool(viewerCore.removeBox),
      updateBox: wrapBool(viewerCore.updateBox),
      setBoxIndex: wrapBool(viewerCore.setBoxIndex),
      setBoxPosition: wrapBool(viewerCore.setBoxPosition),
      setBoxGap: fromCore(viewerCore.setBoxGap),
      setBoxSpacing: fromCore(viewerCore.setBoxSpacing),
      updateBoxSpacing: fromCore(viewerCore.updateBoxSpacing),
      setOnBoxSelected: fromCore(viewerCore.setOnBoxSelected),
      setOnDoorLayerDoubleClick: fromCore(viewerCore.setOnDoorLayerDoubleClick),
      setOnBoxTransform: fromCore(viewerCore.setOnBoxTransform),
      setOnModelLoaded: fromCore(viewerCore.setOnModelLoaded),
      selectBox: fromCore(viewerCore.selectBox),
      setTransformMode: fromCore(viewerCore.setTransformMode),
      addModelToBox: wrapBool(viewerCore.addModelToBox),
      removeModelFromBox: wrapBool(viewerCore.removeModelFromBox),
      clearModelsFromBox: fromCore(viewerCore.clearModelsFromBox),
      listModels: fromCore(viewerCore.listModels),
      getBoxDimensions: fromCore(viewerCore.getBoxDimensions),
      getModelPosition: fromCore(viewerCore.getModelPosition),
      getModelBoundingBoxSize: fromCore(viewerCore.getModelBoundingBoxSize),
      setModelPosition: wrapBool(viewerCore.setModelPosition),
      getContextMenuLayerHit: viewerCore.getContextMenuLayerHit
        ? viewerCore.getContextMenuLayerHit.bind(viewerCore)
        : NOOP_RETURN_NULL,
    };
  }, [viewerCore]);
}
