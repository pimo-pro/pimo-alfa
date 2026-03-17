import { useMemo } from "react";
import type { WorkspaceBox } from "../../core/types";
import { getBaseCabinetById, modelToPortaTipo } from "../../core/baseCabinets";
import { ensureBoxPanelIds } from "../../core/box/panelIds";
import type { ProjectActions } from "../projectTypes";
import { appendChangelog, buildBoxesFromWorkspace, getSelectedWorkspaceBox } from "../projectState";
import {
  getSpawnFromSelectedWall,
  getNextWorkspaceBoxId,
  isLowerCabinet,
  isUpperCabinet,
  getBoxLeftMm,
  getBoxRightMm,
  getBoxTopMm,
  UPPER_FLOOR_DEFAULT_MM,
  UPPER_STANDARD_GAP_MM,
  UPPER_COUNTERTOP_MM,
} from "../projectHelpers";
import { createWorkspaceBox, recomputeState } from "../projectState";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type BoxCrudActions = Pick<
  ProjectActions,
  | "addBox"
  | "addWorkspaceBox"
  | "addWorkspaceBoxFromCatalog"
  | "duplicateBox"
  | "duplicateWorkspaceBox"
  | "duplicateWorkspaceBoxAtOffset"
  | "removeBox"
  | "removeWorkspaceBox"
  | "removeWorkspaceBoxById"
  | "selectBox"
  | "clearSelection"
  | "renameBox"
>;

export function useBoxCrudActions(ctx: ProjectActionsExecutionContext): BoxCrudActions {
  const { updateProject, viewerSync } = ctx;

  return useMemo(() => {
    const a = {} as BoxCrudActions;

    a.addBox = () => {
      updateProject((prev) => {
        const rightmostX_m = viewerSync.getRightmostX();
        const { id: newBoxId, index: nextIndex } = getNextWorkspaceBoxId(prev.workspaceBoxes);
        const defaultModel = prev.workspaceBoxes[0];
        const dimensoes = prev.dimensoes;
        const baseEspessura = prev.material.espessura;
        const spawn = getSpawnFromSelectedWall(dimensoes);
        const posicaoX_mm =
          spawn?.posicaoX_mm ?? (rightmostX_m + 0.1) * 1000 + dimensoes.largura / 2;
        const feetHeightMm = 100;
        const newBox = createWorkspaceBox(
          newBoxId,
          defaultModel?.nome ?? `Caixa ${nextIndex}`,
          dimensoes,
          baseEspessura,
          posicaoX_mm,
          [],
          "reta",
          "recuado",
          defaultModel?.id,
          {
            ...(defaultModel
              ? {
                  prateleiras: defaultModel.prateleiras,
                  portaTipo: defaultModel.portaTipo,
                  gavetas: defaultModel.gavetas,
                }
              : {}),
            cabinetType: "lower",
            feetEnabled: true,
            feetHeight: feetHeightMm,
            feetOffsetFront: 100,
          }
        );
        newBox.manualPosition = true;
        newBox.posicaoZ_mm = spawn?.posicaoZ_mm ?? 0;
        newBox.posicaoY_mm = feetHeightMm + dimensoes.altura / 2;
        if (spawn) {
          newBox.rotacaoY = spawn.rotacaoY;
          newBox.rotacaoY_90 = Math.round(Math.abs(spawn.rotacaoY) / (Math.PI / 2)) % 2 === 1;
        }
        if (defaultModel) newBox.baseCabinetId = defaultModel.id;
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
            selectedCaixaModelUrl: null,
            changelog: appendChangelog(prev.changelog, {
              timestamp: new Date(),
              type: "box",
              message: `Caixote criado: ${newBox.nome}`,
            }),
            selectedModelInstanceId: null,
          },
          true
        );
      });
    };

    a.addWorkspaceBox = () => {
      a.addBox();
    };

    a.addWorkspaceBoxFromCatalog = (catalogItemId) => {
      const baseModel = getBaseCabinetById(catalogItemId);
      if (!baseModel) return;
      const isUpperModel = baseModel.categoria === "upper";
      const rightmostX_m = viewerSync.getRightmostX();
      updateProject((prev) => {
        const { id: newBoxId } = getNextWorkspaceBoxId(prev.workspaceBoxes);
        const baseEspessura =
          prev.workspaceBoxes.find((box) => box.id === prev.selectedWorkspaceBoxId)?.espessura ??
          prev.material.espessura;
        const dimensoes = {
          largura: baseModel.widthMm,
          altura: baseModel.heightMm,
          profundidade: baseModel.depthMm,
        };
        const spawn = getSpawnFromSelectedWall(dimensoes);
        const lowerBoxes = prev.workspaceBoxes.filter(isLowerCabinet);
        const upperBoxes = prev.workspaceBoxes.filter(isUpperCabinet);

        let posicaoX_mm = spawn?.posicaoX_mm ?? (rightmostX_m + 0.1) * 1000 + dimensoes.largura / 2;
        if (isUpperModel) {
          if (upperBoxes.length > 0) {
            const rightmostUpper = upperBoxes.reduce(
              (max, box) => Math.max(max, getBoxRightMm(box)),
              Number.NEGATIVE_INFINITY
            );
            posicaoX_mm = rightmostUpper + 100 + dimensoes.largura / 2;
          } else if (lowerBoxes.length > 0) {
            const firstLowerLeft = lowerBoxes.reduce(
              (min, box) => Math.min(min, getBoxLeftMm(box)),
              Number.POSITIVE_INFINITY
            );
            posicaoX_mm = firstLowerLeft + dimensoes.largura / 2;
          }
        }

        const newBox = createWorkspaceBox(
          newBoxId,
          baseModel.nome,
          dimensoes,
          baseEspessura,
          posicaoX_mm,
          [],
          "reta",
          "recuado",
          catalogItemId,
          {
            prateleiras: baseModel.shelves,
            portaTipo: modelToPortaTipo(baseModel.doors),
            gavetas: baseModel.drawers,
            cabinetType: isUpperModel ? "upper" : "lower",
            feetEnabled: !isUpperModel,
            feetHeight: 100,
            feetOffsetFront: 100,
          }
        );
        newBox.manualPosition = true;
        newBox.posicaoZ_mm = spawn?.posicaoZ_mm ?? 0;
        if (isUpperModel) {
          newBox.cabinetType = "upper";
          newBox.feetEnabled = false;
          newBox.feetHeight = 0;
          newBox.feetOffsetFront = 100;
          newBox.pe_cm = 0;
          if (lowerBoxes.length > 0) {
            const lowerTopMm = lowerBoxes.reduce(
              (max, box) => Math.max(max, getBoxTopMm(box)),
              Number.NEGATIVE_INFINITY
            );
            const upperBottomMm = lowerTopMm + UPPER_COUNTERTOP_MM + UPPER_STANDARD_GAP_MM;
            newBox.posicaoY_mm = upperBottomMm + dimensoes.altura / 2;
            if (!spawn) {
              const anchorLower = lowerBoxes.reduce(
                (best, box) => (getBoxLeftMm(box) < getBoxLeftMm(best) ? box : best),
                lowerBoxes[0]
              );
              newBox.posicaoZ_mm = anchorLower.posicaoZ_mm ?? 0;
            }
          } else {
            newBox.posicaoY_mm = UPPER_FLOOR_DEFAULT_MM + dimensoes.altura / 2;
          }
        } else {
          newBox.cabinetType = "lower";
          newBox.feetEnabled = true;
          newBox.feetHeight = 100;
          newBox.feetOffsetFront = 100;
          newBox.pe_cm = (newBox.feetHeight ?? 100) / 10;
          newBox.posicaoY_mm = (newBox.feetHeight ?? 100) + dimensoes.altura / 2;
        }
        if (spawn) {
          newBox.rotacaoY = spawn.rotacaoY;
          newBox.rotacaoY_90 = Math.round(Math.abs(spawn.rotacaoY) / (Math.PI / 2)) % 2 === 1;
        }
        newBox.baseCabinetId = baseModel.id;

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
            selectedCaixaModelUrl: null,
            changelog: appendChangelog(prev.changelog, {
              timestamp: new Date(),
              type: "box",
              message: `${isUpperModel ? "Upper cabinet" : "Base cabinet"} adicionado: ${baseModel.nome}`,
            }),
            selectedModelInstanceId: null,
          },
          true
        );
      });
    };

    a.duplicateBox = () => {
      const rightmostX_m = viewerSync.getRightmostX();
      updateProject((prev) => {
        const selected = getSelectedWorkspaceBox(prev);
        if (!selected) return prev;
        const { id: newBoxId } = getNextWorkspaceBoxId(prev.workspaceBoxes);
        const largura = selected.dimensoes?.largura ?? 400;
        const posicaoX_mm = (rightmostX_m + 0.1) * 1000 + largura / 2;
        const newBox: WorkspaceBox = {
          ...selected,
          id: newBoxId,
          nome: `${selected.nome} (cópia)`,
          posicaoX_mm,
          posicaoY_mm: selected.posicaoY_mm ?? (selected.dimensoes?.altura ?? 400) / 2,
          posicaoZ_mm: 0,
          models: (selected.models ?? []).map((m, i) => ({ ...m, id: `${newBoxId}-model-${Date.now()}-${i}` })),
          panelIds: ensureBoxPanelIds(undefined, {
            prateleiras: selected.prateleiras,
            portaTipo: selected.portaTipo,
            gavetas: selected.gavetas,
          }),
        };
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
            selectedCaixaModelUrl: null,
            selectedModelInstanceId: null,
            changelog: appendChangelog(prev.changelog, {
              timestamp: new Date(),
              type: "box",
              message: `Caixote duplicado: ${selected.nome} → ${newBox.nome}`,
            }),
          },
          true
        );
      });
    };

    a.duplicateWorkspaceBox = () => {
      a.duplicateBox();
    };

    a.duplicateWorkspaceBoxAtOffset = (offsetXMm = 50) => {
      updateProject((prev) => {
        const selected = getSelectedWorkspaceBox(prev);
        if (!selected) return prev;
        const { id: newBoxId } = getNextWorkspaceBoxId(prev.workspaceBoxes);
        const newBox: WorkspaceBox = {
          ...selected,
          id: newBoxId,
          nome: `${selected.nome} (cópia)`,
          posicaoX_mm: (selected.posicaoX_mm ?? 0) + offsetXMm,
          posicaoY_mm: selected.posicaoY_mm ?? (selected.dimensoes?.altura ?? 400) / 2,
          posicaoZ_mm: selected.posicaoZ_mm ?? 0,
          manualPosition: true,
          locked: false,
          models: (selected.models ?? []).map((m, i) => ({
            ...m,
            id: `${newBoxId}-model-${Date.now()}-${i}`,
          })),
          panelIds: ensureBoxPanelIds(undefined, {
            prateleiras: selected.prateleiras,
            portaTipo: selected.portaTipo,
            gavetas: selected.gavetas,
          }),
        };
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
            selectedCaixaModelUrl: null,
            selectedModelInstanceId: null,
            changelog: appendChangelog(prev.changelog, {
              timestamp: new Date(),
              type: "box",
              message: `Peça duplicada: ${selected.nome} → ${newBox.nome}`,
            }),
          },
          true
        );
      });
    };

    a.removeBox = () => {
      updateProject((prev) => {
        const removed = getSelectedWorkspaceBox(prev);
        if (!removed) return prev;
        const filtered = prev.workspaceBoxes.filter((box) => box.id !== prev.selectedWorkspaceBoxId);
        const nextSelected = filtered[0];
        const nextPrev = { ...prev, workspaceBoxes: filtered };
        const boxes = buildBoxesFromWorkspace(nextPrev);
        return recomputeState(
          prev,
          {
            workspaceBoxes: filtered,
            boxes,
            selectedWorkspaceBoxId: nextSelected?.id ?? "",
            selectedCaixaId: nextSelected?.id ?? "",
            selectedBoxId: nextSelected?.id ?? prev.selectedBoxId ?? "",
            selectedCaixaModelUrl: null,
            selectedModelInstanceId: null,
            dimensoes: nextSelected?.dimensoes ?? prev.dimensoes,
            changelog: appendChangelog(prev.changelog, {
              timestamp: new Date(),
              type: "box",
              message: `Caixote removido: ${removed.nome}`,
            }),
          },
          true
        );
      });
    };

    a.removeWorkspaceBox = () => {
      // FIXED: was empty — now calls real remove logic
      a.removeBox();
    };

    a.removeWorkspaceBoxById = (boxId) => {
      updateProject((prev) => {
        const filtered = prev.workspaceBoxes.filter((box) => box.id !== boxId);
        if (filtered.length === prev.workspaceBoxes.length) return prev;
        const nextSelected = filtered[0];
        const nextPrev = { ...prev, workspaceBoxes: filtered };
        const boxes = buildBoxesFromWorkspace(nextPrev);
        const extractedRest = Object.fromEntries(
          Object.entries(prev.extractedPartsByBoxId ?? {}).filter(([k]) => k !== boxId)
        );
        const removed = prev.workspaceBoxes.find((b) => b.id === boxId);
        return recomputeState(
          prev,
          {
            workspaceBoxes: filtered,
            boxes,
            extractedPartsByBoxId: extractedRest,
            selectedWorkspaceBoxId: nextSelected?.id ?? "",
            selectedCaixaId: nextSelected?.id ?? "",
            selectedBoxId: nextSelected ? (prev.selectedBoxId === boxId ? nextSelected.id : prev.selectedBoxId) : "",
            selectedCaixaModelUrl: null,
            selectedModelInstanceId: null,
            dimensoes: nextSelected?.dimensoes ?? prev.dimensoes,
            changelog: appendChangelog(prev.changelog, {
              timestamp: new Date(),
              type: "box",
              message: `Caixote removido: ${removed?.nome ?? "Caixa"}`,
            }),
          },
          true
        );
      });
    };

    a.selectBox = (boxId) => {
      updateProject((prev) => {
        const selected = prev.workspaceBoxes.find((box) => box.id === boxId);
        if (!selected) return prev;
        const isLower = selected.cabinetType === "lower";
        const feetHeight = Math.max(40, selected.feetHeight ?? (selected.pe_cm ?? 10) * 10);
        const alturaMm = selected.dimensoes?.altura ?? 0;
        const fixedY = feetHeight + alturaMm / 2;
        const workspaceBoxes =
          isLower && selected.feetEnabled !== false
            ? prev.workspaceBoxes.map((b) =>
                b.id !== boxId
                  ? b
                  : {
                      ...b,
                      feetEnabled: true,
                      manualPosition: true,
                      posicaoY_mm: b.posicaoY_mm != null && b.posicaoY_mm > 0 ? b.posicaoY_mm : fixedY,
                      posicaoZ_mm: b.posicaoZ_mm ?? 0,
                    }
              )
            : prev.workspaceBoxes;
        return recomputeState(
          { ...prev, workspaceBoxes },
          {
            selectedWorkspaceBoxId: boxId,
            selectedBoxId: prev.boxes.find((box) => box.id === boxId) ? boxId : prev.selectedBoxId,
            selectedCaixaId: boxId,
            selectedCaixaModelUrl: null,
            selectedModelInstanceId: null,
            dimensoes: selected.dimensoes ?? prev.dimensoes,
          },
          true
        );
      });
    };

    a.clearSelection = () => {
      updateProject((prev) =>
        recomputeState(
          prev,
          {
            selectedWorkspaceBoxId: "",
            selectedCaixaId: "",
            selectedBoxId: "",
            selectedCaixaModelUrl: null,
            selectedModelInstanceId: null,
          },
          true
        )
      );
    };

    a.renameBox = (nome) => {
      updateProject((prev) => {
        const selected = getSelectedWorkspaceBox(prev);
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === prev.selectedWorkspaceBoxId ? { ...box, nome } : box
        );
        return recomputeState(
          prev,
          {
            workspaceBoxes,
            changelog: appendChangelog(prev.changelog, {
              timestamp: new Date(),
              type: "box",
              message: `Caixote renomeado: ${selected?.nome ?? "Caixa"} → ${nome}`,
            }),
          },
          true
        );
      });
    };

    return a;
  }, [updateProject, viewerSync]);
}
