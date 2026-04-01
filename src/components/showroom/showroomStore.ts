import { create } from "zustand";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export type ShowroomTool = "move" | "rotate" | "measure";

export type Vec3Tuple = [number, number, number];

export type ShowroomEntity = {
  /** Deslocamento extra em metros (em cima do slot da grelha). */
  position: Vec3Tuple;
  rotationY: number;
  visible: boolean;
};

const HALF_PI = Math.PI / 2;

const BASE_CAM_X = 14;
const BASE_CAM_Y = 11;
const BASE_CAM_Z = 14;

type ShowroomStoreState = {
  entities: Record<string, ShowroomEntity>;
  /** IDs com snapshot carregado com sucesso (último `initProjectIds` do viewer). */
  projectIdsCarregados: string[];
  /** Por projeto: incluir na fila de merge para o workspace (predefinição: true ao carregar lista). */
  mergeIncludeById: Record<string, boolean>;
  selectedId: string | null;
  activeTool: ShowroomTool;
  measurePointA: Vec3Tuple | null;
  measurePointB: Vec3Tuple | null;
  cameraDistanceScale: number;
  orbitSuspended: boolean;
  controlsRef: OrbitControlsImpl | null;

  initProjectIds: (_ids: string[]) => void;
  toggleMergeInclude: (_id: string) => void;
  setSelectedId: (_id: string | null) => void;
  setActiveTool: (_tool: ShowroomTool) => void;
  moveProject: (_id: string, _delta: { x: number; y: number; z: number }) => void;
  rotateProject: (_id: string, _deltaY: number) => void;
  rotateProject90: (_id: string, _direction: 1 | -1) => void;
  toggleProjectVisible: (_id: string) => void;
  setCameraZoom: (_value: number) => void;
  adjustCameraZoom: (_factor: number) => void;
  setOrbitSuspended: (_v: boolean) => void;
  setControlsRef: (_ref: OrbitControlsImpl | null) => void;
  resetCamera: () => void;
  measurementStart: (_x: number, _y: number, _z: number) => void;
  measurementEnd: (_x: number, _y: number, _z: number) => void;
  clearMeasurement: () => void;
};

const defaultEntity = (): ShowroomEntity => ({
  position: [0, 0, 0],
  rotationY: 0,
  visible: true,
});

function applyCameraDistance(ctrl: OrbitControlsImpl, scale: number): void {
  ctrl.object.position.set(BASE_CAM_X * scale, BASE_CAM_Y * scale, BASE_CAM_Z * scale);
  ctrl.update();
}

export const useShowroomStore = create<ShowroomStoreState>((set, get) => ({
  entities: {},
  projectIdsCarregados: [],
  mergeIncludeById: {},
  selectedId: null,
  activeTool: "move",
  measurePointA: null,
  measurePointB: null,
  cameraDistanceScale: 1,
  orbitSuspended: false,
  controlsRef: null,

  initProjectIds: (ids) =>
    set(() => {
      const entities: Record<string, ShowroomEntity> = {};
      const mergeIncludeById: Record<string, boolean> = {};
      for (const id of ids) {
        entities[id] = defaultEntity();
        mergeIncludeById[id] = true;
      }
      return {
        entities,
        mergeIncludeById,
        projectIdsCarregados: [...ids],
        selectedId: null,
        measurePointA: null,
        measurePointB: null,
        activeTool: "move",
        cameraDistanceScale: 1,
        orbitSuspended: false,
      };
    }),

  toggleMergeInclude: (id) =>
    set((s) => {
      const cur = s.mergeIncludeById[id] !== false;
      return {
        mergeIncludeById: {
          ...s.mergeIncludeById,
          [id]: !cur,
        },
      };
    }),

  setSelectedId: (id) => set({ selectedId: id }),

  setActiveTool: (tool) => set({ activeTool: tool, orbitSuspended: false }),

  moveProject: (id, delta) =>
    set((s) => {
      const e = s.entities[id];
      if (!e) return s;
      const [px, py, pz] = e.position;
      return {
        entities: {
          ...s.entities,
          [id]: {
            ...e,
            position: [px + delta.x, py + delta.y, pz + delta.z],
          },
        },
      };
    }),

  rotateProject: (id, deltaY) =>
    set((s) => {
      const e = s.entities[id];
      if (!e) return s;
      return {
        entities: {
          ...s.entities,
          [id]: { ...e, rotationY: e.rotationY + deltaY },
        },
      };
    }),

  rotateProject90: (id, direction) =>
    set((s) => {
      const e = s.entities[id];
      if (!e) return s;
      return {
        entities: {
          ...s.entities,
          [id]: { ...e, rotationY: e.rotationY + direction * HALF_PI },
        },
      };
    }),

  toggleProjectVisible: (id) =>
    set((s) => {
      const e = s.entities[id];
      if (!e) return s;
      return {
        entities: {
          ...s.entities,
          [id]: { ...e, visible: !e.visible },
        },
      };
    }),

  setCameraZoom: (value) => {
    const clamped = Math.min(3, Math.max(0.35, value));
    set({ cameraDistanceScale: clamped });
    const ctrl = get().controlsRef;
    if (ctrl) applyCameraDistance(ctrl, clamped);
  },

  adjustCameraZoom: (factor) => {
    const next = get().cameraDistanceScale * factor;
    get().setCameraZoom(next);
  },

  setOrbitSuspended: (v) => set({ orbitSuspended: v }),

  setControlsRef: (ref) => {
    set({ controlsRef: ref });
    if (ref) applyCameraDistance(ref, get().cameraDistanceScale);
  },

  resetCamera: () => {
    set({ cameraDistanceScale: 1, orbitSuspended: false });
    const ctrl = get().controlsRef;
    if (ctrl) {
      ctrl.target.set(0, 0, 0);
      ctrl.object.position.set(BASE_CAM_X, BASE_CAM_Y, BASE_CAM_Z);
      ctrl.object.up.set(0, 1, 0);
      ctrl.update();
    }
  },

  measurementStart: (x, y, z) => set({ measurePointA: [x, y, z], measurePointB: null }),

  measurementEnd: (x, y, z) => set({ measurePointB: [x, y, z] }),

  clearMeasurement: () => set({ measurePointA: null, measurePointB: null }),
}));
