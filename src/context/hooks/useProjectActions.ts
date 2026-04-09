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
    a.setReadyForProduction = (ready) => {
      updateProject((prev) => ({ ...prev, readyForProduction: ready }), false);
    };

    // --- setTipoProjeto ---
    a.setTipoProjeto = (tipo) => {
      updateProject((prev) => ({ ...prev, tipoProjeto: tipo }), false);
    };

    // --- setMaterial ---
    // Atualiza o Material completo + sincroniza materialId se o objeto tiver id
    a.setMaterial = (material) => {
      updateProject(
        (prev) => ({
          ...prev,
          material,
          // Se o objeto Material tiver id, sincronizar também materialId
          ...(material && "id" in material && material.id
            ? { materialId: material.id as string }
            : {}),
        }),
        false
      );
    };

    // --- setEspessura ---
    // Atualiza material.espessura (fonte principal no domínio)
    // A WorkspaceBox.espessura é por caixa — não alterar aqui
    a.setEspessura = (espessura) => {
      updateProject(
        (prev) => ({
          ...prev,
          material: { ...prev.material, espessura },
        }),
        false
      );
    };

    return a;
  }, [exportActions, updateProject]);

  return useMemo(() => {
    const actions = Object.assign(
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
    );

    // @PIMO-KEEP — Runtime validation
    if (import.meta.env.DEV) {
      const requiredActions: (keyof ProjectActions)[] = [
        "createNewProject",
        "selectBox",
        "clearSelection",
        "setActiveTool",
        "setTipoProjeto",
        "setMaterial",
        "setEspessura",
        "setDimensoes",
        "setReadyForProduction",
        "setProjectName",
        "addBox",
        "addWorkspaceBox",
        "addWorkspaceBoxFromCatalog",
        "duplicateBox",
        "duplicateWorkspaceBox",
        "duplicateWorkspaceBoxAtOffset",
        "removeBox",
        "removeWorkspaceBox",
        "removeWorkspaceBoxById",
        "setPortaTipo",
        "setTipoBorda",
        "setTipoFundo",
        "setPrateleiras",
        "setGavetas",
        "addDoorLayerItem",
        "addDrawerLayerItem",
        "removeDoorLayerItem",
        "removeDrawerLayerItem",
        "updateDoorLayerItem",
        "updateDrawerLayerItem",
        "setDoorLayerItemOpen",
        "setDrawerLayerItemOpen",
        "setDoorMaterial",
        "setDrawerMaterial",
        "updateWorkspaceBoxTransform",
        "updateWorkspacePosition",
        "repositionWorkspaceBoxesInsideRoom",
        "setWorkspaceBoxMaterial",
        "setWorkspaceBoxLocked",
        "alignFrontWithNeighbor",
        "alignBottomSelectedBoxes",
        "toggleWorkspaceRotation",
        "rotateWorkspaceBox",
        "gerarESalvarDesign",
        "exportarPDF",
        "exportarPdfTecnico",
        "exportarPdfUnificado",
        "listSavedProjects",
        "loadProjectSnapshot",
        "renameProject",
        "deleteProject",
        "mergeSnapshots",
        "undo",
        "redo",
        "goToHistory",
        "updateRulesInProfile",
        "setActiveRulesProfile",
        "addRulesProfile",
        "removeRulesProfile",
        "setRulesProfilesConfig",
        "setViewerSettings",
        "toggleHighlight",
        "toggleRuler",
        "logChangelog",
      ];

      requiredActions.forEach((key) => {
        if (typeof (actions as Record<string, unknown>)[key] !== "function") {
          console.error(
            `[PIMO] actions.${key} is not a function — runtime crash expected when called from UI`
          );
        }
      });
    }

    return actions;
  }, [
    coreActions,
    historyActions,
    projectIoActions,
    layerActions,
    boxCrudActions,
    boxTransformActions,
    rulesActions,
    viewerUiActions,
    designActions,
  ]);
}