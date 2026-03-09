/**
 * Lógica de autosave e carregamento a partir do autosave.
 * Extraído do ProjectProvider para reduzir complexidade.
 */

import { useCallback, useEffect, useRef } from "react";
import { safeGetItem, safeSetItem } from "../../utils/storage";
import { wallStore } from "../../stores/wallStore";
import type { ProjectState, ProjectSnapshot, RoomSnapshot } from "../projectTypes";

const AUTOSAVE_STORAGE_KEY = "pimo_autosave";
const AUTO_SAVE_BASE_DEBOUNCE_MS = 1200;

export type ProjectPersistenceApi = {
  serializeForAutosave: (_state: ProjectState) => unknown;
  revive: (_snapshot: unknown) => ProjectState | null;
  captureRoomSnapshot: () => RoomSnapshot | null;
  /** Opcional: aplicar resultados ao estado restaurado (ex.: applyResultados). */
  applyResultados?: (_state: ProjectState) => ProjectState;
};

export function useProjectPersistence(
  project: ProjectState,
  setProject: React.Dispatch<React.SetStateAction<ProjectState>>,
  viewerSync: { saveViewerSnapshot: () => unknown; restoreViewerSnapshot: (_snapshot: unknown) => void },
  api: ProjectPersistenceApi
) {
  const projectRef = useRef(project);
  projectRef.current = project;
  const autosaveTimerRef = useRef<number | null>(null);
  const lastAutosaveFingerprintRef = useRef<string>("");
  const pendingAutosaveRef = useRef(false);

  const performAutosave = useCallback(() => {
    const proj = projectRef.current;
    if (proj.workspaceBoxes.length === 0) return;
    if (proj.estaCarregando) {
      pendingAutosaveRef.current = true;
      return;
    }
    const snapshot: ProjectSnapshot = {
      projectState: api.serializeForAutosave(proj) as ProjectSnapshot["projectState"],
      viewerSnapshot: viewerSync.saveViewerSnapshot() as ProjectSnapshot["viewerSnapshot"],
      roomSnapshot: api.captureRoomSnapshot(),
    };
    const savedAt = new Date().toISOString();
    safeSetItem(
      AUTOSAVE_STORAGE_KEY,
      JSON.stringify({ snapshot, savedAt })
    );
    pendingAutosaveRef.current = false;
    setProject((prev) =>
      prev.lastAutosaveTime === savedAt ? prev : { ...prev, lastAutosaveTime: savedAt }
    );
  }, [viewerSync, setProject, api]);

  const scheduleAutosave = useCallback(
    (ms: number) => {
      if (autosaveTimerRef.current != null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = window.setTimeout(() => {
        autosaveTimerRef.current = null;
        performAutosave();
      }, ms);
    },
    [performAutosave]
  );

  useEffect(() => {
    const raw = safeGetItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return;
    let parsed: { snapshot?: ProjectSnapshot; savedAt?: string };
    try {
      parsed = JSON.parse(raw) as { snapshot?: ProjectSnapshot; savedAt?: string };
    } catch {
      return;
    }
    const snap = parsed?.snapshot;
    const projectState =
      snap && typeof snap === "object" && "projectState" in snap
        ? (snap as ProjectSnapshot).projectState
        : null;
    const viewerSnapshot =
      snap && typeof snap === "object" && "viewerSnapshot" in snap
        ? (snap as ProjectSnapshot).viewerSnapshot
        : null;
    const roomSnapshot =
      snap && typeof snap === "object" && "roomSnapshot" in snap
        ? (snap as ProjectSnapshot).roomSnapshot
        : undefined;
    const restored = projectState ? api.revive(projectState) : null;
    if (restored) {
      const next = api.applyResultados
        ? api.applyResultados({ ...restored, lastAutosaveTime: parsed.savedAt ?? restored.lastAutosaveTime ?? null })
        : { ...restored, lastAutosaveTime: parsed.savedAt ?? restored.lastAutosaveTime ?? null };
      setProject(next);
    }
    if (roomSnapshot !== undefined) {
      if (roomSnapshot) {
        wallStore.getState().loadRoomConfig(roomSnapshot);
      } else {
        wallStore.getState().clearRoom();
      }
    }
    if (viewerSnapshot) {
      viewerSync.restoreViewerSnapshot(viewerSnapshot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    const proj = project;
    if ((proj.workspaceBoxes?.length ?? 0) === 0) return;
    const fingerprint = JSON.stringify(api.serializeForAutosave(proj));
    if (fingerprint === lastAutosaveFingerprintRef.current) return;
    lastAutosaveFingerprintRef.current = fingerprint;
    const boxCount = proj.workspaceBoxes.length;
    const debounceMs = proj.estaCarregando
      ? AUTO_SAVE_BASE_DEBOUNCE_MS * 2
      : boxCount > 12
        ? AUTO_SAVE_BASE_DEBOUNCE_MS * 2
        : AUTO_SAVE_BASE_DEBOUNCE_MS;
    scheduleAutosave(debounceMs);
  }, [project, scheduleAutosave, api]);

  useEffect(() => {
    if (project.estaCarregando) return;
    if (pendingAutosaveRef.current) {
      scheduleAutosave(450);
    }
  }, [project.estaCarregando, scheduleAutosave]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current != null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const proj = projectRef.current;
      if (proj.workspaceBoxes.length > 0) {
        e.preventDefault();
        e.returnValue = "Você perderá o seu projeto atual. Deseja continuar?";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return { performAutosave, scheduleAutosave };
}
