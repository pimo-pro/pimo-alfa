import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

export type SelectedObject =
  | { type: "none" }
  | { type: "box"; id: string }
  | { type: "remate"; id: string }
  | { type: "wall"; id: string }
  | { type: "roomElement"; id: string }
  | { type: "roomUtility"; id: string };

export interface UiStoreState {
  selectedTool: string;
  selectedObject: SelectedObject;
  /** Painel esquerdo: definições de captura (Photo Mode); o viewport principal é a pré-visualização. */
  photoModePanelOpen: boolean;
  setPhotoModePanelOpen: (_open: boolean) => void;
  setSelectedTool: (_toolId: string) => void;
  setSelectedObject: (_selected: SelectedObject) => void;
  clearSelection: () => void;
}

const logUiStore = (event: string, payload?: Record<string, unknown>) => {
  if (!import.meta.env.DEV) return;
  console.info("[uiStore]", event, payload ?? {});
};

function isValidSelectedObject(value: SelectedObject): boolean {
  if (!value || typeof value !== "object" || typeof value.type !== "string") return false;
  if (value.type === "none") return true;
  return typeof (value as { id?: unknown }).id === "string" && ((value as { id: string }).id?.trim()?.length ?? 0) > 0;
}

export const uiStore = createStore<UiStoreState>((set) => ({
  selectedTool: "home",
  selectedObject: { type: "none" },
  photoModePanelOpen: false,
  setPhotoModePanelOpen: (open) => {
    set((state) => {
      if (state.photoModePanelOpen === open) return state;
      return { ...state, photoModePanelOpen: open };
    });
  },
  setSelectedTool: (toolId) => {
    set((state) => {
      if (state.selectedTool === toolId) return state;
      return { ...state, selectedTool: toolId };
    });
  },
  setSelectedObject: (selected) => {
    if (!isValidSelectedObject(selected)) {
      logUiStore("invalid-selected-object", { selected });
      return;
    }
    set((state) => {
      if (
        state.selectedObject.type === selected.type &&
        ((state.selectedObject.type === "none" && selected.type === "none") ||
          (state.selectedObject.type !== "none" &&
            selected.type !== "none" &&
            state.selectedObject.id === selected.id))
      ) {
        return state;
      }
      return { ...state, selectedObject: selected };
    });
  },
  clearSelection: () => {
    set((state) => {
      if (state.selectedObject.type === "none") return state;
      return { ...state, selectedObject: { type: "none" } };
    });
  },
}));

export function useUiStore<T>(selector: (_state: UiStoreState) => T): T {
  return useStore(uiStore, selector);
}
