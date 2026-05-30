/**
 * Persistência de projeto: serialização, revive, leitura/escrita de projetos guardados.
 * Fonte única para autosave e lista de projetos (localStorage).
 */

import type { WorkspaceBox, CutListItemComPreco } from "../core/types";
import type { ProjectState, ProjectSnapshot, RoomSnapshot } from "./projectTypes";
import { defaultState } from "./projectState";
import { getMaterialByIdOrLabel } from "../core/materials/service";
import { wallStore } from "../stores/wallStore";
import { createEmptyProjectMeasurements } from "../3d/viewer-engine/measurement/internalRulerTypes";
import { normalizeProjectRoom } from "../3d/viewer-engine/room/RoomEngine";
import { normalizeOrlaPresets } from "../core/orla/orlaPresets";
import type { ProjectRemate } from "../core/remate/remateTypes";
import { positionToFaceKind } from "../core/remate/remateTypes";
import type { ProjectHemati } from "../core/hemati/hematiTypes";
import type { ProjectRodape } from "../core/rodape/rodapeTypes";

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
            const next: WorkspaceBox = { ...rest, models, locked: rest.locked === true };
            if (next.costaAtiva === undefined) next.costaAtiva = true;
            if (next.profundidadeExterna === undefined) {
              next.profundidadeExterna = next.dimensoes?.profundidade ?? 0;
            }
            next.remateIds = Array.isArray(next.remateIds) ? next.remateIds.filter(Boolean) : [];
            return next;
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

  const remates: ProjectRemate[] = Array.isArray(restored.remates)
    ? restored.remates
        .filter(
          (remate): remate is ProjectRemate =>
            remate != null &&
            typeof remate === "object" &&
            typeof (remate as ProjectRemate).id === "string" &&
            typeof (remate as ProjectRemate).parentBoxId === "string"
        )
        .map((remate) => ({
          ...remate,
          faceKind:
            remate.faceKind ??
            positionToFaceKind(
              remate.position ?? "dir",
              remate.type ?? "avista"
            ),
          placementFree: remate.placementFree ?? false,
        }))
    : [];

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
    measurements: {
      ...createEmptyProjectMeasurements(),
      ...(restored.measurements && typeof restored.measurements === "object" ? restored.measurements : {}),
      internal: Array.isArray(restored.measurements?.internal)
        ? restored.measurements.internal.filter(
            (e): e is import("./projectTypes").InternalMeasurementEntry =>
              e != null &&
              typeof e === "object" &&
              typeof (e as { id?: unknown }).id === "string" &&
              typeof (e as { boxId?: unknown }).boxId === "string"
          )
        : [],
    },
    room:
      restored.room && typeof restored.room === "object"
        ? normalizeProjectRoom(restored.room as import("../3d/viewer-engine/room/roomEngineTypes").ProjectRoomConfig)
        : null,
    orlaPresets: normalizeOrlaPresets(restored.orlaPresets),
    orlaPieces:
      restored.orlaPieces && typeof restored.orlaPieces === "object"
        ? { ...(restored.orlaPieces as ProjectState["orlaPieces"]) }
        : defaultState.orlaPieces,
    orlaJuntoPairs: Array.isArray(restored.orlaJuntoPairs)
      ? restored.orlaJuntoPairs
      : defaultState.orlaJuntoPairs,
    ferragemOrla:
      restored.ferragemOrla && typeof restored.ferragemOrla === "object"
        ? {
            linhas: Array.isArray(restored.ferragemOrla.linhas) ? restored.ferragemOrla.linhas : [],
            metrosTotal: Number(restored.ferragemOrla.metrosTotal) || 0,
            custoTotal: Number(restored.ferragemOrla.custoTotal) || 0,
            porBox:
              restored.ferragemOrla.porBox && typeof restored.ferragemOrla.porBox === "object"
                ? restored.ferragemOrla.porBox
                : {},
          }
        : defaultState.ferragemOrla,
    remates,
    hematis: Array.isArray(restored.hematis)
      ? restored.hematis.filter(
          (h): h is ProjectHemati =>
            h != null &&
            typeof h === "object" &&
            typeof (h as ProjectHemati).id === "string" &&
            typeof (h as ProjectHemati).parentBoxId === "string"
        ).map((h) => ({ ...h, visible: h.visible !== false, placementFree: h.placementFree ?? false }))
      : [],
    rodapes: Array.isArray(restored.rodapes)
      ? restored.rodapes.filter(
          (r): r is ProjectRodape =>
            r != null &&
            typeof r === "object" &&
            typeof (r as ProjectRodape).id === "string" &&
            typeof (r as ProjectRodape).parentBoxId === "string"
        ).map((r) => ({ ...r, visible: r.visible !== false, placementFree: r.placementFree ?? false }))
      : [],
    autoFill:
      restored.autoFill && typeof restored.autoFill === "object"
        ? {
            lastRunAt: String((restored.autoFill as { lastRunAt?: unknown }).lastRunAt ?? ""),
            summary: String((restored.autoFill as { summary?: unknown }).summary ?? ""),
            createdBoxIds: Array.isArray((restored.autoFill as { createdBoxIds?: unknown }).createdBoxIds)
              ? (restored.autoFill as { createdBoxIds: string[] }).createdBoxIds
              : [],
            createdRemateIds: Array.isArray((restored.autoFill as { createdRemateIds?: unknown }).createdRemateIds)
              ? (restored.autoFill as { createdRemateIds: string[] }).createdRemateIds
              : [],
            createdHematiIds: Array.isArray((restored.autoFill as { createdHematiIds?: unknown }).createdHematiIds)
              ? (restored.autoFill as { createdHematiIds: string[] }).createdHematiIds
              : [],
            createdRodapeIds: Array.isArray((restored.autoFill as { createdRodapeIds?: unknown }).createdRodapeIds)
              ? (restored.autoFill as { createdRodapeIds: string[] }).createdRodapeIds
              : [],
            wallSummaries: Array.isArray((restored.autoFill as { wallSummaries?: unknown }).wallSummaries)
              ? (restored.autoFill as { wallSummaries: import("../core/autoRoomFill/autoRoomFillTypes").AutoFillWallSummary[] })
                  .wallSummaries
              : [],
          }
        : null,
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
