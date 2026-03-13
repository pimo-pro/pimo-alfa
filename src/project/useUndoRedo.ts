// Hook para histórico de undo/redo.
// Mantém pilhas de undo/redo e expõe push, undo, redo.

import { useRef } from "react";
import type { ProjectState } from "../context/projectTypes";

const MAX_HISTORY = 40;

export function useUndoRedo() {
  const undoStackRef = useRef<ProjectState[]>([]);
  const redoStackRef = useRef<ProjectState[]>([]);

  const pushState = (state: ProjectState) => {
    undoStackRef.current = [state, ...undoStackRef.current].slice(0, MAX_HISTORY);
    redoStackRef.current = [];
  };

  const undo = (current: ProjectState, setProject: (s: ProjectState) => void) => {
    if (!undoStackRef.current.length) return;
    const [prev, ...rest] = undoStackRef.current;
    undoStackRef.current = rest;
    redoStackRef.current = [current, ...redoStackRef.current];
    setProject(prev);
  };

  const redo = (current: ProjectState, setProject: (s: ProjectState) => void) => {
    if (!redoStackRef.current.length) return;
    const [next, ...rest] = redoStackRef.current;
    redoStackRef.current = rest;
    undoStackRef.current = [current, ...undoStackRef.current];
    setProject(next);
  };

  return { undoStackRef, redoStackRef, pushState, undo, redo };
}
