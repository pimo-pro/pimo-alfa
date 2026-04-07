/* eslint-disable no-unused-vars -- declaração de tipos; nomes de parâmetros são apenas documentação */
/**
 * Declaração global única para window.viewerCore.
 * Usado por hooks de integração com o viewer.
 */
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
      setOnBoxTransform?: (
        callback: ((
          boxId: string,
          position: { x: number; y: number; z: number },
          rotation: { x: number; y: number; z: number }
        ) => void) | null
      ) => void;
      setOnModelLoaded?: (callback: ((boxId: string, modelId: string, object: unknown) => void) | null) => void;
      selectBox?: (id: string | null) => void;
      setTransformMode?: (mode: "translate" | "rotate" | null) => void;
      getContextMenuLayerHit?: (event: { clientX: number; clientY: number }) => {
        boxId: string;
        type: "door" | "drawer";
        doorLayerId?: string;
        drawerLayerId?: string;
      } | null;
      setCameraView?: (preset: "top" | "bottom" | "front" | "back" | "right" | "left" | "isometric") => void;
      resetCamera?: () => void;
      getCameraPosition?: () => unknown;
      setCameraPosition?: (...args: unknown[]) => void;
      setCameraZoom?: (...args: unknown[]) => void;
      getCameraZoom?: () => unknown;
      createRoom?: (...args: unknown[]) => unknown;
      createRoomWithDimensions?: (...args: unknown[]) => unknown;
      removeRoom?: (...args: unknown[]) => unknown;
      setRoomDimensions?: (...args: unknown[]) => unknown;
      addExtraWall?: (...args: unknown[]) => unknown;
      setRoomLocked?: (locked: boolean) => void;
      getRoomLocked?: () => boolean;
      roomManager?: {
        createRoom?: (...args: unknown[]) => unknown;
        removeRoom?: (...args: unknown[]) => unknown;
        addDoorToRoom?: (...args: unknown[]) => unknown;
        addWindowToRoom?: (...args: unknown[]) => unknown;
        getRoomExists?: () => boolean;
        getRoomDimensions?: () => unknown;
        getRoomVisible?: () => boolean;
        hideRoom?: () => void;
        showRoom?: () => void;
      };
      selectWallByIndex?: (index: number | null) => void;
      selectRoomElementById?: (elementId: string | null) => void;
      setPlacementMode?: (mode: "door" | "window" | null) => void;
      setOnRoomElementPlaced?: (callback: unknown) => void;
      setOnRoomElementSelected?: (callback: unknown) => void;
      setOnWallSelected?: (callback: ((wallId: number | null) => void) | null) => void;
      setOnWallTransform?: (
        callback: ((wallIndex: number, position: { x: number; z: number }, rotation: number) => void) | null
      ) => void;
      setOnRoomElementTransform?: (callback: ((elementId: string, config: unknown) => void) | null) => void;
      updateRoomElementConfig?: (...args: unknown[]) => unknown;
      setRoomBounds?: (bounds: unknown) => void;
      clearRoomBounds?: () => void;
      getRoomExists?: () => boolean;
      getRoomDimensions?: () => unknown;
      getRoomVisible?: () => boolean;
      hideRoom?: () => void;
      showRoom?: () => void;
      addDoorToRoom?: (...args: unknown[]) => unknown;
      addWindowToRoom?: (...args: unknown[]) => unknown;
      updateBoxMaterial?: (id: string, materialName: string) => void;
      updateDoorMaterial?: (boxId: string, doorLayerId: string, materialName: string) => void;
      updateDrawerMaterial?: (boxId: string, drawerLayerId: string, materialName: string) => void;
      setMaterialMode?: (mode: unknown) => void;
      getMaterialMode?: () => unknown;
      setMaterialQuality?: (quality: unknown) => void;
      getMaterialQuality?: () => unknown;
      applyMaterialPreset?: (presetId: unknown) => void;
      setGlobalLightIntensity?: (value: number) => void;
      getGlobalLightIntensity?: () => number;
      setShadowIntensity?: (value: number) => void;
      getShadowIntensity?: () => number;
      setGlossIntensity?: (value: number) => void;
      getGlossIntensity?: () => number;
      setMatteMode?: (enabled: boolean) => void;
      getMatteMode?: () => boolean;
      display?: {
        shadowIntensity: number;
      };
      events?: {
        emit?: (event: string, ...args: unknown[]) => void;
      };
    };
  }
}

export {};
