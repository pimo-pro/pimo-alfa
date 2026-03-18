/**
 * Hook compositor de ações do projeto.
 * Mantém apenas composição de hooks por domínio.
 */

import { useMemo } from "react";
import type { ProjectActions, ProjectState } from "../projectTypes";
import { applyResultados, appendChangelog, recomputeState } from "../projectState";
import { useHistoryActions } from "./useHistoryActions";
import { useProjectIoActions } from "./useProjectIoActions";
import { useLayerActions } from "./useLayerActions";
import { useBoxCrudActions } from "./useBoxCrudActions";
import { useBoxTransformActions } from "./useBoxTransformActions";
import { useRulesActions } from "./useRulesActions";
import { useViewerUiActions } from "./useViewerUiActions";
import { useDesignActions } from "./useDesignActions";

export type UseProjectActionsParams = {
  updateProject: (_fn: (_prev: ProjectState) => ProjectState, _pushUndo?: boolean) => void;
  setProject: React.Dispatch<React.SetStateAction<ProjectState>>;
  viewerSync: import("../projectTypes").ViewerSync;
  exportActions: ReturnType<typeof import("./useProjectExportActions").useProjectExportActions>;
  undoStackRef: React.MutableRefObject<ProjectState[]>;
  redoStackRef: React.MutableRefObject<ProjectState[]>;
  projectRef: React.MutableRefObject<ProjectState>;
};

export function useProjectActions(params: UseProjectActionsParams): ProjectActions {
  const { updateProject, setProject, viewerSync, exportActions, undoStackRef, redoStackRef, projectRef } =
    params;

  const executionContext = useMemo(
    () => ({
      updateProject,
      setProject,
      viewerSync,
      undoStackRef,
      redoStackRef,
      projectRef,
      recomputeState,
      applyResultados,
      appendChangelog,
    }),
    [updateProject, setProject, viewerSync, undoStackRef, redoStackRef, projectRef]
  );

  const historyActions = useHistoryActions(executionContext);
  const projectIoActions = useProjectIoActions(executionContext);
  const layerActions = useLayerActions(executionContext);
  const boxCrudActions = useBoxCrudActions(executionContext);
  const boxTransformActions = useBoxTransformActions(executionContext);
  const rulesActions = useRulesActions(executionContext);
  const viewerUiActions = useViewerUiActions(executionContext);
  const designActions = useDesignActions(executionContext);

  const coreActions = useMemo(() => {
    const a = {} as ProjectActions;
    a.exportarPDF = exportActions.exportarPDF;
    a.exportarPdfTecnico = exportActions.exportarPdfTecnico;
    a.exportarPdfUnificado = exportActions.exportarPdfUnificado;
    a.logChangelog = (message) => {
      updateProject(
        (prev) => ({
          ...prev,
          changelog: appendChangelog(prev.changelog, {
            timestamp: new Date(),
            type: "doc",
            message,
          }),
        }),
        false
      );
    };
    return a;
  }, [exportActions, updateProject]);

  return useMemo(
    () =>
      Object.assign(
        {} as ProjectActions,
        coreActions,
        historyActions,
        projectIoActions,
        layerActions,
        boxCrudActions,
        boxTransformActions,
        rulesActions,
        viewerUiActions,
        designActions
      ),
    [
      coreActions,
      historyActions,
      projectIoActions,
      layerActions,
      boxCrudActions,
      boxTransformActions,
      rulesActions,
      viewerUiActions,
      designActions,
    ]
  );
}