import { useMemo } from "react";
import type { BoxModelInstance } from "../../core/types";
import type { ProjectActions } from "../projectTypes";
import { appendChangelog, buildBoxesFromWorkspace, buildDesignState, getModelUrlFromStorage, recomputeState } from "../projectState";
import { getNextWorkspaceBoxId } from "../projectHelpers";
import { createWorkspaceBox } from "../projectState";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type CadModelActions = Pick<
  ProjectActions,
  | "addModelToBox"
  | "addCadModelAsNewBox"
  | "removeModelFromBox"
  | "updateModelInBox"
  | "updateCaixaModelId"
  | "selectModelInstance"
  | "setExtractedPartsForBox"
  | "clearExtractedPartsForBox"
  | "setModelPositionInBox"
>;

export function useCadModelActions(ctx: ProjectActionsExecutionContext): CadModelActions {
  const { updateProject, viewerSync } = ctx;

  return useMemo(() => {
    const a = {} as CadModelActions;

    a.addModelToBox = (caixaId, cadModelId) => {
      updateProject((prev) => {
        const box = prev.workspaceBoxes.find((b) => b.id === caixaId);
        if (!box) return prev;
        const instanceId = `${caixaId}-model-${Date.now()}`;
        const instance: BoxModelInstance = { id: instanceId, modelId: cadModelId };
        const models = [...(box.models ?? []), instance];
        const workspaceBoxes = prev.workspaceBoxes.map((b) =>
          b.id === caixaId ? { ...b, models } : b
        );
        return recomputeState(prev, { workspaceBoxes }, true);
      });
    };

    a.addCadModelAsNewBox = (cadModelId) => {
      const rightmostX_m = viewerSync.getRightmostX();
      updateProject((prev) => {
        const { id: newBoxId, index: nextIndex } = getNextWorkspaceBoxId(prev.workspaceBoxes);
        const instanceId = `${newBoxId}-model-${Date.now()}`;
        const instance: BoxModelInstance = { id: instanceId, modelId: cadModelId };
        const baseEspessura = prev.workspaceBoxes[0]?.espessura ?? prev.material.espessura;
        const placeholderDimensoes = { largura: 100, altura: 100, profundidade: 100 };
        const posicaoX_mm = (rightmostX_m + 0.1) * 1000 + placeholderDimensoes.largura / 2;
        const newBox = createWorkspaceBox(
          newBoxId,
          `Módulo ${nextIndex}`,
          placeholderDimensoes,
          baseEspessura,
          posicaoX_mm,
          [instance]
        );
        newBox.manualPosition = true;
        newBox.posicaoZ_mm = 0;
        newBox.posicaoY_mm = placeholderDimensoes.altura / 2;
        const nextWorkspaceBoxes = [...prev.workspaceBoxes, newBox];
        const nextPrev = { ...prev, workspaceBoxes: nextWorkspaceBoxes };
        const boxes = buildBoxesFromWorkspace(nextPrev);
        return recomputeState(
          prev,
          {
            workspaceBoxes: nextWorkspaceBoxes,
            boxes,
            selectedWorkspaceBoxId: newBox.id,
            selectedCaixaId: newBox.id,
            selectedBoxId: newBox.id,
            selectedCaixaModelUrl: null,
            selectedModelInstanceId: null,
            changelog: appendChangelog(prev.changelog, {
              timestamp: new Date(),
              type: "box",
              message: `Módulo CAD adicionado: ${newBox.nome}`,
            }),
          },
          true
        );
      });
    };

    a.removeModelFromBox = (caixaId, modelInstanceId) => {
      updateProject((prev) => {
        const box = prev.workspaceBoxes.find((b) => b.id === caixaId);
        if (!box) return prev;
        const models = (box.models ?? []).filter((m) => m.id !== modelInstanceId);
        const workspaceBoxes = prev.workspaceBoxes.map((b) =>
          b.id === caixaId ? { ...b, models } : b
        );
        const extractedByBox = { ...prev.extractedPartsByBoxId };
        if (extractedByBox[caixaId]) {
          const rest = Object.fromEntries(
            Object.entries(extractedByBox[caixaId]).filter(([k]) => k !== modelInstanceId)
          );
          if (Object.keys(rest).length > 0) extractedByBox[caixaId] = rest;
          else delete extractedByBox[caixaId];
        }
        const next = { ...prev, workspaceBoxes, extractedPartsByBoxId: extractedByBox };
        return { ...next, ...buildDesignState(next) };
      });
    };

    a.updateModelInBox = (caixaId, modelInstanceId, updates) => {
      updateProject((prev) => {
        const workspaceBoxes = prev.workspaceBoxes.map((box) => {
          if (box.id !== caixaId) return box;
          const models = (box.models ?? []).map((m) =>
            m.id === modelInstanceId ? { ...m, ...updates } : m
          );
          return { ...box, models };
        });
        return recomputeState(prev, { workspaceBoxes }, true);
      });
    };

    a.updateCaixaModelId = (caixaId, modelId) => {
      if (modelId) {
        a.addModelToBox(caixaId, modelId);
      } else {
        updateProject((prev) => {
          const box = prev.workspaceBoxes.find((b) => b.id === caixaId);
          if (!box) return prev;
          const workspaceBoxes = prev.workspaceBoxes.map((b) =>
            b.id === caixaId ? { ...b, models: [] } : b
          );
          const extractedByBox = { ...prev.extractedPartsByBoxId };
          delete extractedByBox[caixaId];
          const next = { ...prev, workspaceBoxes, extractedPartsByBoxId: extractedByBox };
          return { ...next, ...buildDesignState(next) };
        });
      }
    };

    a.selectModelInstance = (boxId, modelInstanceId) => {
      updateProject((prev) => ({
        ...prev,
        selectedModelInstanceId: modelInstanceId ?? null,
        selectedCaixaModelUrl: modelInstanceId
          ? getModelUrlFromStorage(
              prev.workspaceBoxes
                .find((b) => b.id === boxId)
                ?.models?.find((m) => m.id === modelInstanceId)?.modelId
            ) ?? null
          : null,
      }));
    };

    a.setExtractedPartsForBox = (boxId, modelInstanceId, parts) => {
      updateProject((prev) => {
        const byBox = { ...prev.extractedPartsByBoxId };
        const byModel = { ...(byBox[boxId] ?? {}), [modelInstanceId]: parts };
        byBox[boxId] = byModel;
        const next = { ...prev, extractedPartsByBoxId: byBox };
        return { ...next, ...buildDesignState(next) };
      });
    };

    a.clearExtractedPartsForBox = (boxId, modelInstanceId) => {
      updateProject((prev) => {
        const byBox = { ...prev.extractedPartsByBoxId };
        if (modelInstanceId != null) {
          const byModel = { ...byBox[boxId] };
          delete byModel[modelInstanceId];
          if (Object.keys(byModel).length > 0) byBox[boxId] = byModel;
          else delete byBox[boxId];
        } else {
          delete byBox[boxId];
        }
        const next = { ...prev, extractedPartsByBoxId: byBox };
        return { ...next, ...buildDesignState(next) };
      });
    };

    a.setModelPositionInBox = (boxId, modelInstanceId, position) => {
      updateProject((prev) => {
        const byBox = { ...(prev.modelPositionsByBoxId ?? {}) };
        const byModel = { ...(byBox[boxId] ?? {}), [modelInstanceId]: position };
        byBox[boxId] = byModel;
        const next = { ...prev, modelPositionsByBoxId: byBox };
        return { ...next, ...buildDesignState(next) };
      });
    };

    return a;
  }, [updateProject, viewerSync]);
}
