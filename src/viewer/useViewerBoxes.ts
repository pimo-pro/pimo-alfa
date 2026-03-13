/**
 * Hook especializado para boxes no viewer.
 * Obtém a API de boxes a partir de window.viewerCore (ViewerCore do viewer-engine).
 * Sempre chama useMemo com dependência [viewerCore] para manter ordem de hooks estável.
 * NOOP e API real têm exatamente a mesma forma (mesmas chaves).
 */
import { useMemo } from "react";

declare global {
  interface Window {
    viewerCore?: {
      addBox?: (...args: unknown[]) => unknown;
      removeBox?: (...args: unknown[]) => unknown;
      updateBox?: (...args: unknown[]) => unknown;
      setBoxIndex?: (...args: unknown[]) => unknown;
      setBoxPosition?: (...args: unknown[]) => unknown;
      addModelToBox?: (...args: unknown[]) => unknown;
      removeModelFromBox?: (...args: unknown[]) => unknown;
      clearModelsFromBox?: (...args: unknown[]) => unknown;
      listModels?: (...args: unknown[]) => unknown;
      getBoxDimensions?: (...args: unknown[]) => unknown;
      getModelPosition?: (...args: unknown[]) => unknown;
      getModelBoundingBoxSize?: (...args: unknown[]) => unknown;
      setModelPosition?: (...args: unknown[]) => unknown;
      setBoxGap?: (gap: number) => void;
      setBoxSpacing?: (spacing: number) => void;
      updateBoxSpacing?: (spacing: number) => void;
      setOnBoxSelected?: (callback: (id: string | null) => void) => void;
      setOnDoorLayerDoubleClick?: (callback: ((boxId: string, doorLayerId: string) => void) | null) => void;
      setOnBoxTransform?: (callback: ((boxId: string, position: { x: number; y: number; z: number }, rotationY: number) => void) | null) => void;
      setOnModelLoaded?: (callback: ((boxId: string, modelId: string, object: unknown) => void) | null) => void;
      selectBox?: (id: string | null) => void;
      setTransformMode?: (mode: "translate" | "rotate" | null) => void;
      /** Alvo do ponteiro para menu de contexto: porta/gaveta ou null. Usado pelo Workspace no onContextMenu. */
      getContextMenuLayerHit?: (event: { clientX: number; clientY: number }) => {
        boxId: string;
        type: "door" | "drawer";
        doorLayerId?: string;
        drawerLayerId?: string;
      } | null;
    };
  }
}

const NOOP = () => {};
const NOOP_SELECT_BOX = () => {};
const NOOP_RETURN_NULL = () => null as {
  boxId: string;
  type: "door" | "drawer";
  doorLayerId?: string;
  drawerLayerId?: string;
} | null;

/** API NOOP com exatamente as mesmas chaves que a API real. Referência estável. */
const BOXES_NOOP_API = {
  addBox: () => false,
  removeBox: NOOP,
  updateBox: () => false,
  setBoxIndex: () => false,
  setBoxPosition: NOOP,
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

    const fromCore = (fn: ((...args: unknown[]) => unknown) | undefined) =>
      fn ? fn.bind(viewerCore) : NOOP;

    return {
      addBox: fromCore(viewerCore.addBox),
      removeBox: fromCore(viewerCore.removeBox),
      updateBox: fromCore(viewerCore.updateBox),
      setBoxIndex: fromCore(viewerCore.setBoxIndex),
      setBoxPosition: fromCore(viewerCore.setBoxPosition),
      setBoxGap: fromCore(viewerCore.setBoxGap),
      setBoxSpacing: fromCore(viewerCore.setBoxSpacing),
      updateBoxSpacing: fromCore(viewerCore.updateBoxSpacing),
      setOnBoxSelected: fromCore(viewerCore.setOnBoxSelected),
      setOnDoorLayerDoubleClick: fromCore(viewerCore.setOnDoorLayerDoubleClick),
      setOnBoxTransform: fromCore(viewerCore.setOnBoxTransform),
      setOnModelLoaded: fromCore(viewerCore.setOnModelLoaded),
      selectBox: fromCore(viewerCore.selectBox),
      setTransformMode: fromCore(viewerCore.setTransformMode),
      addModelToBox: fromCore(viewerCore.addModelToBox),
      removeModelFromBox: fromCore(viewerCore.removeModelFromBox),
      clearModelsFromBox: fromCore(viewerCore.clearModelsFromBox),
      listModels: fromCore(viewerCore.listModels),
      getBoxDimensions: fromCore(viewerCore.getBoxDimensions),
      getModelPosition: fromCore(viewerCore.getModelPosition),
      getModelBoundingBoxSize: fromCore(viewerCore.getModelBoundingBoxSize),
      setModelPosition: fromCore(viewerCore.setModelPosition),
      getContextMenuLayerHit: viewerCore.getContextMenuLayerHit
        ? viewerCore.getContextMenuLayerHit.bind(viewerCore)
        : NOOP_RETURN_NULL,
    };
  }, [viewerCore]);
}
