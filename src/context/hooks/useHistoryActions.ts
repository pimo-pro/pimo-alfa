import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import { serializeState, reviveState } from "../projectPersistence";
import { HISTORY_MAX_ENTRIES } from "../historyConfig";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import type { ProjectState } from "../projectTypes";

export type HistoryActions = Pick<ProjectActions, "undo" | "redo" | "goToHistory"> & {
  recordDragUndo: (_preDrag: import("../projectTypes").ProjectState) => void;
};

export function useHistoryActions(ctx: ProjectActionsExecutionContext): HistoryActions {
  const { updateProject, viewerSync, undoStackRef, redoStackRef, applyResultados } = ctx;

  return useMemo(
    () => ({
      undo: () => {
        updateProject(
          (prev) => {
            if (undoStackRef.current.length === 0) return prev;
            const [next, ...rest] = undoStackRef.current;
            undoStackRef.current = rest;
            const currentSnapshot = reviveState(serializeState(prev)) ?? prev;
            redoStackRef.current = [currentSnapshot, ...redoStackRef.current].slice(
              0,
              HISTORY_MAX_ENTRIES
            );
            viewerSync.restoreViewerSnapshot(null);
            return applyResultados(next);
          },
          false
        );
      },
      redo: () => {
        updateProject(
          (prev) => {
            if (redoStackRef.current.length === 0) return prev;
            const [next, ...rest] = redoStackRef.current;
            redoStackRef.current = rest;
            const currentSnapshot = reviveState(serializeState(prev)) ?? prev;
            undoStackRef.current = [currentSnapshot, ...undoStackRef.current].slice(
              0,
              HISTORY_MAX_ENTRIES
            );
            viewerSync.restoreViewerSnapshot(null);
            return applyResultados(next);
          },
          false
        );
      },
      goToHistory: (index) => {
        updateProject(
          (prev) => {
            const past = [...undoStackRef.current].reverse();
            const future = [...redoStackRef.current];
            const timeline = [...past, prev, ...future];
            if (!timeline.length) return prev;
            const currentIndex = past.length;
            const safeIndex = Math.max(0, Math.min(timeline.length - 1, Math.floor(index)));
            if (safeIndex === currentIndex) return prev;
            const next = timeline[safeIndex];
            const nextUndo = timeline.slice(0, safeIndex).reverse();
            const nextRedo = timeline.slice(safeIndex + 1);
            undoStackRef.current = nextUndo.slice(0, HISTORY_MAX_ENTRIES);
            redoStackRef.current = nextRedo.slice(0, HISTORY_MAX_ENTRIES);
            viewerSync.restoreViewerSnapshot(null);
            return applyResultados(next);
          },
          false
        );
      },
      recordDragUndo: (preDrag: ProjectState) => {
        const snapshot = reviveState(serializeState(preDrag)) ?? preDrag;
        undoStackRef.current = [snapshot, ...undoStackRef.current].slice(0, HISTORY_MAX_ENTRIES);
        redoStackRef.current = [];
      },
    }),
    [updateProject, viewerSync, undoStackRef, redoStackRef, applyResultados]
  );
}
