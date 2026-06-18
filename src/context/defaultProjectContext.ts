import { defaultState } from "./projectState";
import type {
  ProjectActions,
  ProjectContextProps,
  ProjectHistoryController,
  ViewerSync,
} from "./projectTypes";

const noop = (): void => {};
const noopFalse = (): boolean => false;
const noopNull = (): null => null;
const noopEmptyString = (): string => "";
const noopEmptyArray = (): never[] => [];
const noopUnsubscribe = (): (() => void) => noop;
const noopAsyncNull = async (): Promise<null> => null;

const ASYNC_NULL_ACTIONS = new Set<string>([
  "loadProjectSnapshot",
  "mergeSnapshots",
  "listSavedProjects",
  "createNewProject",
  "renameProject",
  "deleteProject",
]);

const NULL_RETURN_ACTIONS = new Set<string>([
  "duplicateRemate",
  "createOppositeRemate",
  "createObjectGroup",
]);

const FALSE_RETURN_ACTIONS = new Set<string>(["toggleDimensionsOverlay", "align", "updateRoomElementConfig"]);

const EMPTY_ARRAY_RETURN_ACTIONS = new Set<string>(["getSelectedObjects"]);

const EMPTY_STRING_RETURN_ACTIONS = new Set<string>(["addDoorToRoom", "addWindowToRoom"]);

function createSafeProjectActions(): ProjectActions {
  return new Proxy({} as ProjectActions, {
    get(_target, prop) {
      if (typeof prop !== "string") return noop;
      if (ASYNC_NULL_ACTIONS.has(prop)) return noopAsyncNull;
      if (NULL_RETURN_ACTIONS.has(prop)) return noopNull;
      if (FALSE_RETURN_ACTIONS.has(prop)) return noopFalse;
      if (EMPTY_ARRAY_RETURN_ACTIONS.has(prop)) return noopEmptyArray;
      if (EMPTY_STRING_RETURN_ACTIONS.has(prop)) return noopEmptyString;
      if (prop === "toggleDimensionsOverlay") return noopFalse;
      return noop;
    },
  });
}

const defaultViewerSync: ViewerSync = {
  notifyChangeSignal: defaultState,
  saveViewerSnapshot: noopNull,
  restoreViewerSnapshot: noop,
  registerViewerApi: noop,
  renderScene: async () => null,
  setActiveTool: noop,
  setUltraPerformanceMode: noop,
  getUltraPerformanceMode: noopFalse,
  createRoom: noop,
  removeRoom: noop,
  setPlacementMode: noop,
  addDoorToRoom: noopEmptyString,
  addWindowToRoom: noopEmptyString,
  setOnRoomElementPlaced: noop,
  setOnRoomElementSelected: noop,
  updateRoomElementConfig: noopFalse,
  setLockEnabled: noop,
  getLockEnabled: noopFalse,
  getCombinedBoundingBox: noopNull,
  getSelectedBoxDimensions: noopNull,
  subscribeSelectedBoxChange: noopUnsubscribe,
  setDimensionsOverlayVisible: noop,
  getDimensionsOverlayVisible: noopFalse,
  toggleDimensionsOverlay: noopFalse,
  getPrintReadyDimensions: () => ({ entries: [], generatedAt: Date.now() }),
  getSelectedObjects: noopEmptyArray,
  align: noopFalse,
  getSelectedBoxScreenPosition: noopNull,
  getRightmostX: () => -0.1,
};

const defaultHistory: ProjectHistoryController = {
  entries: [],
  currentIndex: -1,
  canUndo: false,
  canRedo: false,
  undo: noop,
  redo: noop,
  goTo: noop,
};

/** Contexto neutro quando `useProject()` é chamado fora de `<ProjectProvider>`. */
export const defaultProjectContext: ProjectContextProps = {
  project: defaultState,
  actions: createSafeProjectActions(),
  viewerSync: defaultViewerSync,
  history: defaultHistory,
};
