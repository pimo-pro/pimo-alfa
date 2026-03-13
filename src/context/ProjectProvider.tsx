import { useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ProjectContext } from "./projectContext";
import type { ProjectState } from "./projectTypes";
import { applyResultados } from "./projectState";
import { useViewerSync } from "../hooks/useViewerSync";
import { useProjectExportActions } from "./hooks/useProjectExportActions";
import { useProjectPersistence } from "./hooks/useProjectPersistence";
import { captureRoomSnapshot, serializeStateForAutosave, reviveState } from "./projectPersistence";
import { useProjectActions } from "./hooks/useProjectActions";
import { useProjectState } from "../project/useProjectState";

const MAX_HISTORY = 40;

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { project, setProject, projectRef } = useProjectState();
  useEffect(() => {
    projectRef.current = project;
  }, [project, projectRef]);
  const viewerSync = useViewerSync(project);
  const exportActions = useProjectExportActions({ projectRef });
  useProjectPersistence(project, setProject, viewerSync, {
    serializeForAutosave: (state) => serializeStateForAutosave(state),
    revive: (snap) => reviveState(snap),
    captureRoomSnapshot,
    applyResultados,
  });

  const undoStackRef = useRef<ProjectState[]>([]);
  const redoStackRef = useRef<ProjectState[]>([]);

  const updateProject = useCallback(
    (fn: (_prev: ProjectState) => ProjectState, pushUndo?: boolean) => {
      setProject((prev) => {
        const next = fn(prev);
        if (pushUndo) {
          undoStackRef.current = [prev, ...undoStackRef.current].slice(0, MAX_HISTORY);
          redoStackRef.current = [];
        }
        return next;
      });
    },
    [setProject]
  );

  const actions = useProjectActions({
    updateProject,
    setProject,
    viewerSync,
    exportActions,
    undoStackRef,
    redoStackRef,
    projectRef,
  });

  return (
    <ProjectContext.Provider value={{ project, actions, viewerSync }}>
      {children}
    </ProjectContext.Provider>
  );
}
