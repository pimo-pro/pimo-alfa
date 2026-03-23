import { useMemo } from "react";
import type { WorkspaceBox } from "../../core/types";
import { getBaseCabinetById, modelToPortaTipo } from "../../core/baseCabinets";
import { ensureBoxPanelIds } from "../../core/box/panelIds";
import { getSettings } from "../../core/settings/settingsService";
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
import { isPiBaseCabinetId } from "../../data/moveisUnificados/pi/models";
import { wallStore } from "../../stores/wallStore";
import {
  getFloorBoundsMmFromWalls,
  getRoomGridSpawnMm,
  hasPersistedRoomWalls,
} from "../../utils/roomWorkspaceBounds";

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

const NEW_BOX_GAP_MM = 0;

function getAdjacentPlacementMm(
  referenceBox: WorkspaceBox,
  targetDimensions: { largura: number },
  gapMm = NEW_BOX_GAP_MM
): { x_mm: number; z_mm: number } {
  const referenceWidthMm = Math.max(0, referenceBox.dimensoes?.largura ?? 0);
  const targetWidthMm = Math.max(0, targetDimensions.largura ?? 0);
  const distanceMm = referenceWidthMm / 2 + targetWidthMm / 2 + Math.max(0, gapMm);
  const rotationY = Number.isFinite(referenceBox.rotacaoY) ? (referenceBox.rotacaoY ?? 0) : 0;
  const dirX = Math.cos(rotationY);
  const dirZ = Math.sin(rotationY);
  return {
    x_mm: (referenceBox.posicaoX_mm ?? 0) + dirX * distanceMm,
    z_mm: (referenceBox.posicaoZ_mm ?? 0) + dirZ * distanceMm,
  };
}

export function useBoxCrudActions(ctx: ProjectActionsExecutionContext): BoxCrudActions {
  const { updateProject, viewerSync } = ctx;

  return useMemo(() => {
    const a = {} as BoxCrudActions;

    a.addBox = () => {
      updateProject(
        (prev) => {
          const rightmostX_m = viewerSync.getRightmostX();
          const { id: newBoxId, index: nextIndex } = getNextWorkspaceBoxId(prev.workspaceBoxes);
          const defaultModel = prev.workspaceBoxes[0];
          const dimensoes = prev.dimensoes;
          const baseEspessura = prev.material.espessura;
          const selectedReference = prev.workspaceBoxes.find((box) => box.id === prev.selectedWorkspaceBoxId);
          const adjacentPlacement = selectedReference
            ? getAdjacentPlacementMm(selectedReference, dimensoes)
            : null;
          const spawn = getSpawnFromSelectedWall(dimensoes);
          const wallsState = wallStore.getState().walls;
          const roomBounds = hasPersistedRoomWalls(wallsState) ? getFloorBoundsMmFromWalls(wallsState) : null;
          const roomSpawn =
            !adjacentPlacement && roomBounds
              ? getRoomGridSpawnMm(
                  prev.workspaceBoxes.length,
                  dimensoes.largura,
                  dimensoes.profundidade,
                  roomBounds,
                  0
                )
              : null;
          const posicaoX_mm =
            adjacentPlacement?.x_mm ??
            roomSpawn?.x_mm ??
            spawn?.posicaoX_mm ??
            rightmostX_m * 1000 + dimensoes.largura / 2;
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
          newBox.posicaoZ_mm = adjacentPlacement?.z_mm ?? roomSpawn?.z_mm ?? spawn?.posicaoZ_mm ?? 0;
          newBox.posicaoY_mm = selectedReference?.posicaoY_mm ?? feetHeightMm + dimensoes.altura / 2;
          if (roomSpawn) {
            newBox.rotacaoY = roomSpawn.rotacaoY;
            newBox.rotacaoY_90 = Math.round(Math.abs(roomSpawn.rotacaoY) / (Math.PI / 2)) % 2 === 1;
          } else if (spawn) {
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
        },
        true
      );
    };

    a.addWorkspaceBox = () => {
      a.addBox();
    };

    a.addWorkspaceBoxFromCatalog = (catalogItemId) => {
      const baseModel = getBaseCabinetById(catalogItemId);
      if (!baseModel) return;
      const isUpperModel = baseModel.categoria === "upper";
      const isPiModel = isPiBaseCabinetId(baseModel.id) || baseModel.grupoCatalogo === "pi";
      const piSettings = getSettings().modeloPI;
      const rightmostX_m = viewerSync.getRightmostX();
      updateProject(
        (prev) => {
          const { id: newBoxId } = getNextWorkspaceBoxId(prev.workspaceBoxes);
          const baseEspessuraDefault =
            prev.workspaceBoxes.find((box) => box.id === prev.selectedWorkspaceBoxId)?.espessura ??
            prev.material.espessura;
          const baseEspessura = isPiModel
            ? Math.max(10, Number(piSettings?.espessuraMadeiraMm) || baseEspessuraDefault)
            : baseEspessuraDefault;
          const dimensoes = {
            largura: baseModel.widthMm,
            altura: baseModel.heightMm,
            profundidade: baseModel.depthMm,
          };
          const selectedReference = prev.workspaceBoxes.find((box) => box.id === prev.selectedWorkspaceBoxId);
          const adjacentPlacement = selectedReference
            ? getAdjacentPlacementMm(selectedReference, dimensoes)
            : null;
          const spawn = getSpawnFromSelectedWall(dimensoes);
          const wallsCatalog = wallStore.getState().walls;
          const roomBoundsCatalog = hasPersistedRoomWalls(wallsCatalog) ? getFloorBoundsMmFromWalls(wallsCatalog) : null;
          const roomSpawnCatalog =
            !adjacentPlacement && roomBoundsCatalog
              ? getRoomGridSpawnMm(
                  prev.workspaceBoxes.length,
                  dimensoes.largura,
                  dimensoes.profundidade,
                  roomBoundsCatalog,
                  0
                )
              : null;
          const lowerBoxes = prev.workspaceBoxes.filter(isLowerCabinet);
          const upperBoxes = prev.workspaceBoxes.filter(isUpperCabinet);

          let posicaoX_mm =
            adjacentPlacement?.x_mm ??
            roomSpawnCatalog?.x_mm ??
            spawn?.posicaoX_mm ??
            rightmostX_m * 1000 + dimensoes.largura / 2;
          const posicaoZ_mm = adjacentPlacement?.z_mm ?? roomSpawnCatalog?.z_mm ?? spawn?.posicaoZ_mm ?? 0;
          if (isUpperModel && !adjacentPlacement) {
            if (upperBoxes.length > 0) {
              const rightmostUpper = upperBoxes.reduce(
                (max, box) => Math.max(max, getBoxRightMm(box)),
                Number.NEGATIVE_INFINITY
              );
              posicaoX_mm = rightmostUpper + dimensoes.largura / 2;
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
              gavetas: isPiModel ? 0 : baseModel.drawers,
              cabinetType: isUpperModel ? "upper" : "lower",
              feetEnabled: !isUpperModel,
              feetHeight: 100,
              feetOffsetFront: 100,
              drawerHeightMode: isPiModel ? "custom" : "equal",
            }
          );
          newBox.manualPosition = true;
          newBox.posicaoZ_mm = posicaoZ_mm;
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
              if (!spawn && !roomSpawnCatalog) {
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
          if (roomSpawnCatalog) {
            newBox.rotacaoY = roomSpawnCatalog.rotacaoY;
            newBox.rotacaoY_90 = Math.round(Math.abs(roomSpawnCatalog.rotacaoY) / (Math.PI / 2)) % 2 === 1;
          } else if (spawn) {
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
        },
        true
      );
    };

    a.duplicateBox = () => {
      updateProject(
        (prev) => {
          const selected = getSelectedWorkspaceBox(prev);
          if (!selected) return prev;
          const { id: newBoxId } = getNextWorkspaceBoxId(prev.workspaceBoxes);
          const adjacentPlacement = getAdjacentPlacementMm(selected, selected.dimensoes ?? { largura: 400 });
          const newBox: WorkspaceBox = {
            ...selected,
            id: newBoxId,
            nome: `${selected.nome} (cópia)`,
            posicaoX_mm: adjacentPlacement.x_mm,
            posicaoY_mm: selected.posicaoY_mm ?? (selected.dimensoes?.altura ?? 400) / 2,
            posicaoZ_mm: adjacentPlacement.z_mm,
            manualPosition: true,
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
        },
        true
      );
    };

    a.duplicateWorkspaceBox = () => {
      a.duplicateBox();
    };

    a.duplicateWorkspaceBoxAtOffset = (offsetXMm = 0) => {
      updateProject(
        (prev) => {
          const selected = getSelectedWorkspaceBox(prev);
          if (!selected) return prev;
          const { id: newBoxId } = getNextWorkspaceBoxId(prev.workspaceBoxes);
          const adjacentPlacement = getAdjacentPlacementMm(
            selected,
            selected.dimensoes ?? { largura: 400 },
            offsetXMm
          );
          const newBox: WorkspaceBox = {
            ...selected,
            id: newBoxId,
            nome: `${selected.nome} (cópia)`,
            posicaoX_mm: adjacentPlacement.x_mm,
            posicaoY_mm: selected.posicaoY_mm ?? (selected.dimensoes?.altura ?? 400) / 2,
            posicaoZ_mm: adjacentPlacement.z_mm,
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
        },
        true
      );
    };

    a.removeBox = () => {
      updateProject(
        (prev) => {
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
        },
        true
      );
    };

    a.removeWorkspaceBox = () => {
      // FIXED: was empty — now calls real remove logic
      a.removeBox();
    };

    a.removeWorkspaceBoxById = (boxId) => {
      updateProject(
        (prev) => {
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
        },
        true
      );
    };

    a.selectBox = (boxId) => {
      updateProject(
        (prev) => {
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
        },
        false
      );
    };

    a.clearSelection = () => {
      updateProject(
        (prev) =>
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
          ),
        false
      );
    };

    a.renameBox = (nome) => {
      updateProject(
        (prev) => {
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
        },
        true
      );
    };

    return a;
  }, [updateProject, viewerSync]);
}
