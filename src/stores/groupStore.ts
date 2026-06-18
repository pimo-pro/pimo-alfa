import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import type { ObjectGroupData } from "../core/viewer/groupTypes";

export interface GroupStoreState {
  /** Grupo activo para transformação com gizmo. */
  activeGroupId: string | null;
  /** IDs codificados para gizmo efémero (multi-seleção sem grupo formal). */
  ephemeralMemberIds: string[];
  setActiveGroupId: (_groupId: string | null) => void;
  setEphemeralMemberIds: (_ids: string[]) => void;
  clearGroupSelection: () => void;
}

export const groupStore = createStore<GroupStoreState>((set) => ({
  activeGroupId: null,
  ephemeralMemberIds: [],
  setActiveGroupId: (groupId) => {
    set((state) => {
      if (state.activeGroupId === groupId) return state;
      return { ...state, activeGroupId: groupId, ephemeralMemberIds: groupId ? [] : state.ephemeralMemberIds };
    });
  },
  setEphemeralMemberIds: (ids) => {
    const unique = Array.from(new Set(ids.filter((id) => id?.trim())));
    set((state) => {
      if (
        state.ephemeralMemberIds.length === unique.length &&
        state.ephemeralMemberIds.every((id, i) => id === unique[i])
      ) {
        return state;
      }
      return { ...state, ephemeralMemberIds: unique, activeGroupId: unique.length >= 2 ? null : state.activeGroupId };
    });
  },
  clearGroupSelection: () => {
    set((state) => {
      if (!state.activeGroupId && state.ephemeralMemberIds.length === 0) return state;
      return { ...state, activeGroupId: null, ephemeralMemberIds: [] };
    });
  },
}));

export function useGroupStore<T>(selector: (_state: GroupStoreState) => T): T {
  return useStore(groupStore, selector);
}

export function resolveActiveGroupMembers(
  groups: Record<string, ObjectGroupData> | undefined,
  activeGroupId: string | null,
  ephemeralMemberIds: string[]
): string[] {
  if (activeGroupId && groups?.[activeGroupId]) {
    return groups[activeGroupId].memberIds;
  }
  if (ephemeralMemberIds.length >= 2) return ephemeralMemberIds;
  return [];
}
