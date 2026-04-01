/**
 * Persistência de projeto: serialização, revive, leitura/escrita de projetos guardados.
 * Fonte única para autosave e lista de projetos (localStorage).
 */

import type { WorkspaceBox, CutListItemComPreco } from "../core/types";
import type { ProjectState, ProjectSnapshot, RoomSnapshot } from "./projectTypes";
import { defaultState } from "./projectState";
import { getMaterialByIdOrLabel } from "../core/materials/service";
import { wallStore } from "../stores/wallStore";

export const PROJECTS_STORAGE_KEY = "pimo_saved_projects";
export const MANUAL_BACKUPS_STORAGE_KEY = "pimo_manual_backups";

export type ManualBackupEntry = {
  id: string;
  name: string;
  savedAt: string;
  snapshot: ProjectSnapshot;
};

export type StoredProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  snapshot: ProjectSnapshot | unknown;
};

export function normalizeExtractedParts(
  byBox: unknown
): Record<string, Record<string, CutListItemComPreco[]>> {
  if (!byBox || typeof byBox !== "object") return {};
  const result: Record<string, Record<string, CutListItemComPreco[]>> = {};
  for (const [boxId, byModel] of Object.entries(byBox as Record<string, unknown>)) {
    if (byModel && typeof byModel === "object") {
      result[boxId] = byModel as Record<string, CutListItemComPreco[]>;
    }
  }
  return result;
}

export function serializeState(state: ProjectState): unknown {
  return JSON.parse(
    JSON.stringify(state, (_key, value) => {
      if (value instanceof Date) {
        return { __date: value.toISOString() };
      }
      return value;
    })
  );
}

export function serializeStateForAutosave(state: ProjectState): unknown {
  const { lastAutosaveTime: _lastAutosaveTime, ...rest } = state;
  return serializeState(rest as ProjectState);
}

export function reviveState(snapshot: unknown): ProjectState | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const restored = JSON.parse(
    JSON.stringify(snapshot),
    (_key, value: unknown) => {
      if (
        value &&
        typeof value === "object" &&
        "__date" in value &&
        typeof (value as { __date?: unknown }).__date === "string"
      ) {
        return new Date((value as { __date: string }).__date);
      }
      return value;
    }
  ) as ProjectState;

  const extractedPartsByBoxId = normalizeExtractedParts(restored.extractedPartsByBoxId);

  const modelPositionsByBoxId: ProjectState["modelPositionsByBoxId"] =
    restored.modelPositionsByBoxId && typeof restored.modelPositionsByBoxId === "object"
      ? { ...(restored.modelPositionsByBoxId as ProjectState["modelPositionsByBoxId"]) }
      : {};

  for (const [boxId, inner] of Object.entries(modelPositionsByBoxId)) {
    if (inner && typeof inner === "object") {
      modelPositionsByBoxId[boxId] = { ...inner };
    }
  }

  const workspaceBoxesRaw = restored.workspaceBoxes ?? [];
  const workspaceBoxes = Array.isArray(workspaceBoxesRaw)
    ? (() => {
        const seenIds = new Set<string>();
        return workspaceBoxesRaw
          .map((box: WorkspaceBox & { modelId?: string | null }) => {
            const models =
              box.models ?? (box.modelId != null ? [{ id: `${box.id}-model-1`, modelId: box.modelId }] : []);
            const { modelId: _modelId, ...rest } = box;
            return { ...rest, models, locked: rest.locked === true };
          })
          .filter((box: { id?: string }) => {
            if (!box?.id || typeof box.id !== "string") return false;
            if (seenIds.has(box.id)) return false;
            seenIds.add(box.id);
            return true;
          });
      })()
    : defaultState.workspaceBoxes;

  const materialId =
    restored.materialId !== undefined && restored.materialId !== null
      ? restored.materialId
      : (restored.material?.tipo
          ? getMaterialByIdOrLabel(restored.material.tipo)?.id ?? ""
          : "");

  return {
    ...defaultState,
    ...restored,
    viewerSettings: {
      ...defaultState.viewerSettings,
      ...(restored.viewerSettings ?? {}),
      ultraPerformanceModeOptions: {
        ...defaultState.viewerSettings.ultraPerformanceModeOptions,
        ...(restored.viewerSettings?.ultraPerformanceModeOptions ?? {}),
      },
    },
    workspaceBoxes,
    selectedWorkspaceBoxId: workspaceBoxes.length ? (restored.selectedWorkspaceBoxId ?? workspaceBoxes[0].id) : "",
    selectedCaixaId: workspaceBoxes.length ? (restored.selectedCaixaId ?? workspaceBoxes[0].id) : "",
    selectedBoxId: workspaceBoxes.length ? (restored.selectedBoxId ?? "") : "",
    material: { ...defaultState.material, ...restored.material },
    materialId,
    dimensoes: { ...defaultState.dimensoes, ...restored.dimensoes },
    extractedPartsByBoxId,
    modelPositionsByBoxId,
    selectedModelInstanceId: restored.selectedModelInstanceId ?? null,
    lastAutosaveTime:
      typeof restored.lastAutosaveTime === "string" ? restored.lastAutosaveTime : null,
  };
}

export function captureRoomSnapshot(): RoomSnapshot | null {
  const state = wallStore.getState();
  if (!state.walls || state.walls.length === 0) return null;
  return {
    walls: state.walls.map((wall) => ({
      ...wall,
      openings: (wall.openings ?? []).map((opening) => ({ ...opening })),
    })),
    selectedWallId: state.selectedWallId,
    mainWallIndex: Math.max(0, Math.min(3, state.mainWallIndex ?? 0)),
  };
}

export function readStoredProjects(): StoredProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredProject[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredProjects(items: StoredProject[]): void {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}
