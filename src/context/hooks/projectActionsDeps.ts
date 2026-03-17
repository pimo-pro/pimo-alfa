import type React from "react";
import type { ProjectState, ViewerSync } from "../projectTypes";

export type UpdateProjectFn = (
  _fn: (_prev: ProjectState) => ProjectState,
  _pushUndo?: boolean
) => void;

export type SetProjectFn = React.Dispatch<React.SetStateAction<ProjectState>>;

export type UndoStackRef = React.MutableRefObject<ProjectState[]>;
export type RedoStackRef = React.MutableRefObject<ProjectState[]>;
export type ProjectRef = React.MutableRefObject<ProjectState>;

export type RecomputeStateFn = typeof import("../projectState").recomputeState;
export type ApplyResultadosFn = typeof import("../projectState").applyResultados;
export type AppendChangelogFn = typeof import("../projectState").appendChangelog;

export interface ProjectStateHelpers {
  recomputeState: RecomputeStateFn;
  applyResultados: ApplyResultadosFn;
  appendChangelog: AppendChangelogFn;
}

export interface ProjectActionsExecutionContext extends ProjectStateHelpers {
  updateProject: UpdateProjectFn;
  setProject: SetProjectFn;
  viewerSync: ViewerSync;
  undoStackRef: UndoStackRef;
  redoStackRef: RedoStackRef;
  projectRef: ProjectRef;
}
