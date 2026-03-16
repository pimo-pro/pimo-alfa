/**
 * Hook que constrói o objeto ProjectActions (ações do projeto).
 * Extraído do ProjectProvider para reduzir acoplamento e manter o provider limpo.
 */

import { useMemo } from "react";
import type { BoxModelInstance, WorkspaceBox } from "../../core/types";
import { saveProfiles } from "../../core/rules/rulesProfilesStorage";
import { DEFAULT_PROFILE_ID } from "../../core/rules/rulesProfilesStorage";
import { defaultRulesConfig, normalizeRulesConfig, type RulesConfig } from "../../core/rules/rulesConfig";
import type { RulesProfile, RulesProfilesConfig } from "../../core/rules/rulesProfiles";
import type {
  ProjectActions,
  ProjectSnapshot,
  ProjectState,
  SavedProjectInfo,
  ViewerToolMode,
} from "../projectTypes";
import {
  applyResultados,
  appendChangelog,
  buildBoxesFromWorkspace,
  buildDesignState,
  createWorkspaceBox,
  defaultState,
  getModelUrlFromStorage,
  getSelectedWorkspaceBox,
  recomputeState,
} from "../projectState";
import { getTemplateById } from "../../templates/templatesIndex";
import { getBaseCabinetById, modelToPortaTipo } from "../../core/baseCabinets";
import { ensureBoxPanelIds } from "../../core/box/panelIds";
import { safeGetItem, safeParseJson, safeSetItem } from "../../utils/storage";
import {
  getSpawnFromSelectedWall,
  getNextWorkspaceBoxId,
  getSelectedOrFirstWorkspaceBox,
  isLowerCabinet,
  isUpperCabinet,
  getBoxLeftMm,
  getBoxRightMm,
  getBoxTopMm,
  UPPER_FLOOR_DEFAULT_MM,
  UPPER_STANDARD_GAP_MM,
  UPPER_COUNTERTOP_MM,
} from "../projectHelpers";
import {
  captureRoomSnapshot,
  serializeState,
  reviveState,
  MANUAL_BACKUPS_STORAGE_KEY,
  type ManualBackupEntry,
} from "../projectPersistence";
import {
  regenerateLayersForBox,
  createManualDoor,
  createManualDrawer,
  applyDrawerTypeRules,
} from "../../services/boxLayersService";
import { wallStore } from "../../stores/wallStore";
import { getCurrentProjectUser } from "../../core/projects/currentUser";
import {
  deleteProjectById,
  listProjects,
  loadProjectRecord,
  renameProjectById,
  saveProject,
} from "../../core/projects/projectsClient";

const MAX_HISTORY = 40;

function logProjectProvider(_event: string, _data?: object): void {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.debug("[ProjectProvider]", _event, _data);
  }
}

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
  const {
    updateProject,
    setProject,
    viewerSync,
    exportActions,
    undoStackRef,
    redoStackRef,
    projectRef,
  } = params;

  return useMemo(() => {
    const a = {} as ProjectActions;
    const buildGeneratedState = (prev: ProjectState): ProjectState => {
      let prevAdjusted = prev;
      if (!prev.workspaceBoxes || prev.workspaceBoxes.length === 0) {
        const { id: newBoxId } = getNextWorkspaceBoxId(prev.workspaceBoxes);
        const newBox = createWorkspaceBox(
          newBoxId,
          "Caixa 1",
          prev.dimensoes,
          prev.material.espessura,
          0,
          []
        );
        prevAdjusted = {
          ...prev,
          workspaceBoxes: [newBox],
          selectedWorkspaceBoxId: newBox.id,
          selectedCaixaId: newBox.id,
          selectedBoxId: newBox.id,
        };
      }
      const boxes = buildBoxesFromWorkspace(prevAdjusted);
      const selectedWorkspace = getSelectedWorkspaceBox(prevAdjusted);
      const selectedBoxId =
        boxes.find((box) => box.id === selectedWorkspace?.id)?.id ?? boxes[0]?.id ?? "";
      const nextState = {
        ...prevAdjusted,
        boxes,
        selectedBoxId,
        dimensoes:
          selectedWorkspace?.dimensoes ??
          boxes.find((box) => box.id === selectedBoxId)?.dimensoes ??
          prevAdjusted.dimensoes,
      };
      return {
        ...nextState,
        ...buildDesignState(nextState),
        changelog: appendChangelog(prev.changelog, {
          timestamp: new Date(),
          type: "calc",
          message: prev.workspaceBoxes?.length
            ? "Caixotes recalculados e projeto guardado"
            : "Nova caixa criada, design gerado e projeto guardado",
        }),
      };
    };
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
          prev.workspaceBoxes.find((box) => box.id === prev.selectedWorkspaceBoxId)
            ?.espessura ?? prev.material.espessura;
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
            const rightmostUpper = upperBoxes.reduce((max, box) => Math.max(max, getBoxRightMm(box)), Number.NEGATIVE_INFINITY);
            posicaoX_mm = rightmostUpper + 100 + dimensoes.largura / 2;
          } else if (lowerBoxes.length > 0) {
            const firstLowerLeft = lowerBoxes.reduce((min, box) => Math.min(min, getBoxLeftMm(box)), Number.POSITIVE_INFINITY);
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
            const lowerTopMm = lowerBoxes.reduce((max, box) => Math.max(max, getBoxTopMm(box)), Number.NEGATIVE_INFINITY);
            const upperBottomMm = lowerTopMm + UPPER_COUNTERTOP_MM + UPPER_STANDARD_GAP_MM;
            newBox.posicaoY_mm = upperBottomMm + dimensoes.altura / 2;
            if (!spawn) {
              const anchorLower = lowerBoxes.reduce((best, box) => (getBoxLeftMm(box) < getBoxLeftMm(best) ? box : best), lowerBoxes[0]);
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
        const filtered = prev.workspaceBoxes.filter(
          (box) => box.id !== prev.selectedWorkspaceBoxId
        );
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
      // Removido: actions.removeBox() não existe no escopo
      // Se necessário, implemente lógica de remoção aqui
      // Por ora, função vazia
      return;
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
        // Módulo de chão (lower): ativar pés por padrão e fixar posição Y para nunca descer ao trocar seleção
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

    /** Cria uma nova caixa no workspace contendo apenas o modelo CAD (cada modelo CAD = uma caixa completa). Dimensões placeholder até o GLB carregar. */
    a.addCadModelAsNewBox = (cadModelId) => {
      const rightmostX_m = viewerSync.getRightmostX();
      updateProject((prev) => {
        const { id: newBoxId, index: nextIndex } = getNextWorkspaceBoxId(prev.workspaceBoxes);
        const instanceId = `${newBoxId}-model-${Date.now()}`;
        const instance: BoxModelInstance = { id: instanceId, modelId: cadModelId };
        const baseEspessura =
          prev.workspaceBoxes[0]?.espessura ?? prev.material.espessura;
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
              prev.workspaceBoxes.find((b) => b.id === boxId)?.models?.find((m) => m.id === modelInstanceId)?.modelId
            ) ?? null
          : null,
      }));
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

    a.setPrateleiras = (quantidade) => {
      const valor = Math.max(0, Math.floor(quantidade));
      updateProject((prev) => {
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === prev.selectedWorkspaceBoxId
            ? {
                ...box,
                prateleiras: valor,
                gavetas: valor > 0 ? 0 : box.gavetas,
                drawersLayer: valor > 0 ? [] : box.drawersLayer,
                panelIds: ensureBoxPanelIds(box.panelIds, {
                  ...box,
                  prateleiras: valor,
                  gavetas: valor > 0 ? 0 : box.gavetas,
                }),
              }
            : box
        );
        return recomputeState(
          prev,
          {
            workspaceBoxes,
            changelog: appendChangelog(prev.changelog, {
              timestamp: new Date(),
              type: "box",
              message: `Prateleiras ajustadas para ${valor}`,
            }),
          },
          true
        );
      });
    };

    a.setGavetas = (quantidade) => {
      const valor = Math.max(0, Math.floor(quantidade));
      updateProject((prev) => {
        const workspaceBoxes = prev.workspaceBoxes.map((box) => {
          if (box.id === prev.selectedWorkspaceBoxId) {
            const updatedBox = {
              ...box,
              gavetas: valor,
              portaTipo: valor > 0 ? "sem_porta" : box.portaTipo,
              prateleiras: valor > 0 ? 0 : box.prateleiras,
              doorsLayer: valor > 0 ? [] : box.doorsLayer,
              panelIds: ensureBoxPanelIds(box.panelIds, {
                ...box,
                gavetas: valor,
                portaTipo: valor > 0 ? "sem_porta" : box.portaTipo,
                prateleiras: valor > 0 ? 0 : box.prateleiras,
              }),
            };
            // Regenerar layers quando gavetas mudam
            const layers = regenerateLayersForBox(updatedBox);
            return { ...updatedBox, ...layers };
          }
          return box;
        });
        return recomputeState(
          prev,
          {
            workspaceBoxes,
            changelog: appendChangelog(prev.changelog, {
              timestamp: new Date(),
              type: "box",
              message: `Gavetas ajustadas para ${valor}`,
            }),
          },
          true
        );
      });
    };

    a.setDrawerHeightMode = (mode) => {
      updateProject((prev) => {
        const workspaceBoxes = prev.workspaceBoxes.map((box) => {
          if (box.id !== prev.selectedWorkspaceBoxId) return box;
          const updatedBox = { ...box, drawerHeightMode: mode };
          const layers = regenerateLayersForBox(updatedBox);
          return { ...updatedBox, ...layers };
        });
        return recomputeState(prev, { workspaceBoxes }, true);
      });
    };

    a.setPortaTipo = (portaTipo) => {
      updateProject((prev) => {
        const workspaceBoxes = prev.workspaceBoxes.map((box) => {
          if (box.id === prev.selectedWorkspaceBoxId) {
            const updatedBox = {
              ...box,
              portaTipo,
              gavetas: portaTipo === "sem_porta" ? box.gavetas : 0,
              drawersLayer: portaTipo === "sem_porta" ? box.drawersLayer : [],
              panelIds: ensureBoxPanelIds(box.panelIds, {
                ...box,
                portaTipo,
                gavetas: portaTipo === "sem_porta" ? box.gavetas : 0,
              }),
            };
            // Regenerar layers quando portaTipo muda
            const layers = regenerateLayersForBox(updatedBox);
            return { ...updatedBox, ...layers };
          }
          return box;
        });
        return recomputeState(prev, { workspaceBoxes }, true);
      });
    };

    a.setTipoBorda = (tipoBorda) => {
      updateProject((prev) => {
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === prev.selectedWorkspaceBoxId ? { ...box, tipoBorda } : box
        );
        return recomputeState(prev, { workspaceBoxes }, true);
      });
    };

    a.setTipoFundo = (tipoFundo) => {
      updateProject((prev) => {
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === prev.selectedWorkspaceBoxId ? { ...box, tipoFundo } : box
        );
        return recomputeState(prev, { workspaceBoxes }, true);
      });
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

    a.setLayoutWarnings = (warnings) => {
      updateProject((prev) => ({ ...prev, layoutWarnings: warnings }));
    };

    a.updateWorkspacePosition = (boxId, posicaoX_mm) => {
      updateProject(
        (prev) => {
          const box = prev.workspaceBoxes.find((b) => b.id === boxId);
          if (box?.locked) return prev;
          const workspaceBoxes = prev.workspaceBoxes.map((b) =>
            b.id === boxId ? { ...b, posicaoX_mm } : b
          );
          return { ...prev, workspaceBoxes };
        },
        false
      );
    };

    a.updateWorkspaceBoxTransform = (boxId, partial) => {
      updateProject((prev) => {
        const box = prev.workspaceBoxes.find((b) => b.id === boxId);
        if (box?.locked) return prev;
        const workspaceBoxes = prev.workspaceBoxes.map((box) => {
          if (box.id !== boxId) return box;
          const next = { ...box };
          if (partial.x_mm !== undefined) next.posicaoX_mm = partial.x_mm;
          if (partial.y_mm !== undefined) next.posicaoY_mm = partial.y_mm;
          if (partial.z_mm !== undefined) next.posicaoZ_mm = partial.z_mm ?? 0;
          if (partial.rotacaoX_rad !== undefined) next.rotacaoX = partial.rotacaoX_rad;
          if (partial.rotacaoY_rad !== undefined) next.rotacaoY = partial.rotacaoY_rad;
          if (partial.rotacaoZ_rad !== undefined) next.rotacaoZ = partial.rotacaoZ_rad;
          if (partial.manualPosition !== undefined) next.manualPosition = partial.manualPosition;
          if (partial.autoRotateEnabled !== undefined) next.autoRotateEnabled = partial.autoRotateEnabled;
          if (partial.feetEnabled !== undefined) next.feetEnabled = partial.feetEnabled;
          if (partial.feetHeight !== undefined) {
            const feetHeight = Math.max(40, partial.feetHeight);
            next.feetHeight = feetHeight;
            next.pe_cm = feetHeight / 10;
          }
          if (partial.feetOffsetFront !== undefined) {
            next.feetOffsetFront = Math.max(0, partial.feetOffsetFront);
          }

          return next;
        });
        return { ...prev, workspaceBoxes };
      }, false);
    };

    /** Atualiza dimensões: se houver módulo selecionado, atualiza a workspace box (regenera portas/gavetas e layout);
     * o useCalculadoraSync envia ao viewer um updateBox completo com drillMarkersByPanel recalculados (furações paramétricas). */
    a.setDimensoes = (dimensoes) => {
      updateProject((prev) => {
        const boxId = prev.selectedWorkspaceBoxId;
        if (boxId) {
          const box = prev.workspaceBoxes.find((b) => b.id === boxId);
          if (box?.locked) return prev;
          const workspaceBoxes = prev.workspaceBoxes.map((b) => {
            if (b.id !== boxId) return b;
            const updatedBox = { ...b, dimensoes: { ...b.dimensoes, ...dimensoes } };
            const layers = regenerateLayersForBox(updatedBox);
            return { ...updatedBox, ...layers };
          });
          return recomputeState(prev, { workspaceBoxes }, true);
        }
        return recomputeState(prev, { dimensoes: { ...prev.dimensoes, ...dimensoes } }, true);
      });
    };

    a.setWorkspaceBoxDimensoes = (boxId, dimensoes) => {
      updateProject((prev) => {
        const box = prev.workspaceBoxes.find((b) => b.id === boxId);
        if (box?.locked) return prev;
        const workspaceBoxes = prev.workspaceBoxes.map((box) => {
          if (box.id !== boxId) return box;
          const updatedBox = { ...box, dimensoes: { ...box.dimensoes, ...dimensoes } };
          const layers = regenerateLayersForBox(updatedBox);
          return { ...updatedBox, ...layers };
        });
        return recomputeState(prev, { workspaceBoxes }, true);
      });
    };

    a.setWorkspaceBoxNome = (boxId, nome) => {
      updateProject((prev) => {
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === boxId ? { ...box, nome } : box
        );
        return { ...prev, workspaceBoxes };
      });
    };

    a.setWorkspaceBoxMaterial = (boxId, materialId) => {
      updateProject((prev) => {
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === boxId ? { ...box, material: materialId } : box
        );
        return { ...prev, workspaceBoxes };
      });
    };

    a.setWorkspaceBoxLocked = (boxId, locked) => {
      updateProject((prev) => {
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === boxId ? { ...box, locked } : box
        );
        return { ...prev, workspaceBoxes };
      });
    };

    a.alignFrontWithNeighbor = (boxId) => {
      updateProject((prev) => {
        const selected = prev.workspaceBoxes.find((b) => b.id === boxId);
        if (!selected?.dimensoes?.profundidade || selected.locked) return prev;
        const others = prev.workspaceBoxes.filter((b) => b.id !== boxId && b.dimensoes?.profundidade != null);
        if (others.length === 0) return prev;
        const selectedX = selected.posicaoX_mm ?? 0;
        let nearest = others[0];
        let minDistX = Math.abs((nearest.posicaoX_mm ?? 0) - selectedX);
        for (let i = 1; i < others.length; i++) {
          const distX = Math.abs((others[i].posicaoX_mm ?? 0) - selectedX);
          if (distX < minDistX) {
            minDistX = distX;
            nearest = others[i];
          }
        }
        const neighborProf = nearest.dimensoes?.profundidade ?? 0;
        const neighborFrontZ = (nearest.posicaoZ_mm ?? 0) + neighborProf / 2;
        const selectedProf = selected.dimensoes.profundidade ?? 0;
        const newZ = neighborFrontZ - selectedProf / 2;
        const workspaceBoxes = prev.workspaceBoxes.map((b) =>
          b.id === boxId ? { ...b, posicaoZ_mm: newZ, manualPosition: true } : b
        );
        return { ...prev, workspaceBoxes };
      }, false);
    };

    a.setDoorMaterial = (boxId, doorLayerId, material) => {
      if (import.meta.env.DEV) {
        console.log("[DOOR-MAT] 3 ProjectProvider.setDoorMaterial ENTRADA", { boxId, doorLayerId, material });
      }
      updateProject((prev) => {
        const box = prev.workspaceBoxes.find((b) => b.id === boxId);
        if (import.meta.env.DEV && box) {
          const doorIds = (box.doorsLayer ?? []).map((d) => d.id);
          console.debug("[ProjectProvider.setDoorMaterial] doorLayerId (comparar com viewer)", {
            boxId,
            doorLayerId,
            material,
            doorIdsNoBox: doorIds,
            match: doorIds.includes(doorLayerId),
          });
        }
        if (!box) return prev;
        const doorBefore = (box.doorsLayer ?? []).find((d) => d.id === doorLayerId);
        if (import.meta.env.DEV) {
          console.log("[DOOR-MAT] 4 ProjectProvider.setDoorMaterial door ANTES", {
            boxId,
            doorLayerId,
            materialAntes: doorBefore?.material ?? doorBefore?.materialId,
            materialNovo: material,
          });
        }
        // Atualizar DoorLayerItem (fonte de verdade): material e materialId para persistir em rebuilds/sync.
        const doorsLayer = (box.doorsLayer ?? []).map((door) =>
          door.id === doorLayerId ? { ...door, material, materialId: material } : door
        );
        const workspaceBoxes = prev.workspaceBoxes.map((b) =>
          b.id === boxId ? { ...b, doorsLayer } : b
        );
        if (import.meta.env.DEV) {
          const doorAfter = doorsLayer.find((d) => d.id === doorLayerId);
          console.log("[DOOR-MAT] 5 ProjectProvider.setDoorMaterial door DEPOIS (estado que será commitado)", {
            boxId,
            doorLayerId,
            materialEmDoorsLayer: doorAfter?.material ?? doorAfter?.materialId,
          });
        }
        return { ...prev, workspaceBoxes };
      });
      if (import.meta.env.DEV) {
        console.log("[DOOR-MAT] 6 ProjectProvider.setDoorMaterial updateProject callback agendado");
      }
    };

    a.setDrawerMaterial = (boxId, drawerLayerId, material) => {
      updateProject((prev) => {
        const box = prev.workspaceBoxes.find((b) => b.id === boxId);
        if (!box) return prev;
        const drawersLayer = (box.drawersLayer ?? []).map((drawer) =>
          drawer.id === drawerLayerId ? { ...drawer, material } : drawer
        );
        const workspaceBoxes = prev.workspaceBoxes.map((b) =>
          b.id === boxId ? { ...b, drawersLayer } : b
        );
        return { ...prev, workspaceBoxes };
      });
    };

    a.toggleWorkspaceRotation = (boxId) => {
      updateProject((prev) => {
        const box = prev.workspaceBoxes.find((b) => b.id === boxId);
        if (box?.locked) return prev;
        const workspaceBoxes = prev.workspaceBoxes.map((box) => {
          if (box.id !== boxId) return box;
          const currentRad = box.rotacaoY ?? 0;
          let nextRad = currentRad + Math.PI / 2;
          let deg = (nextRad * 180) / Math.PI;
          deg = Math.round(deg / 90) * 90;
          deg = ((deg % 360) + 360) % 360;
          if (deg === 360) deg = 0;
          nextRad = (deg * Math.PI) / 180;
          return {
            ...box,
            rotacaoY_90: !box.rotacaoY_90,
            rotacaoY: nextRad,
            autoRotateEnabled: false,
            manualPosition: true,
          };
        });
        return { ...prev, workspaceBoxes };
      });
    };

    a.rotateWorkspaceBox = (boxId) => {
      a.toggleWorkspaceRotation(boxId);
    };

    a.gerarDesign = () => {
      updateProject((prev) => {
        try {
          return buildGeneratedState(prev);
        } catch (error) {
          return {
            ...prev,
            design: null,
            cutList: null,
            cutListComPreco: null,
            estrutura3D: null,
            acessorios: null,
            precoTotalPecas: null,
            precoTotalAcessorios: null,
            precoTotalProjeto: null,
            estaCarregando: false,
            erro: error instanceof Error ? error.message : "Erro ao gerar design",
          };
        }
      });
    };

    a.gerarESalvarDesign = async () => {
      let generatedState: ProjectState | null = null;
      updateProject((prev) => {
        try {
          const next = buildGeneratedState(prev);
          generatedState = next;
          return next;
        } catch (error) {
          return {
            ...prev,
            erro: error instanceof Error ? error.message : "Erro ao gerar design",
          };
        }
      });

      if (!generatedState) return;

      let thumbnailDataUrl: string | null = null;
      try {
        const render = await viewerSync.renderScene({
          size: "small",
          background: "white",
          mode: "pbr",
          preset: "iso1",
          watermark: false,
          shadowIntensity: 1,
          format: "jpg",
          quality: 0.72,
          advancedRealism: false,
        });
        thumbnailDataUrl = render?.dataUrl ?? null;
      } catch {
        thumbnailDataUrl = null;
      }

      const snapshot: ProjectSnapshot = {
        projectState: serializeState(generatedState),
        viewerSnapshot: viewerSync.saveViewerSnapshot(),
        roomSnapshot: captureRoomSnapshot(),
      };
      const currentUser = getCurrentProjectUser();
      const saved = await saveProject({
        name: generatedState.projectName,
        ownerId: currentUser.ownerId,
        ownerName: currentUser.ownerName,
        snapshot,
        thumbnailDataUrl,
      });
      if (!saved) return;
      setProject((prev) => ({ ...prev, lastAutosaveTime: saved.updatedAt }));
    };

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

    a.setActiveTool = (mode: ViewerToolMode) => {
      updateProject((prev) => ({ ...prev, activeViewerTool: mode }), false);
      viewerSync.setActiveTool(mode);
    };

    a.setViewerSettings = (partial) => {
      updateProject(
        (prev) => ({
          ...prev,
          viewerSettings: {
            ...prev.viewerSettings,
            ...partial,
          },
        }),
        false
      );
    };

    a.toggleHighlight = () => {
      updateProject(
        (prev) => ({
          ...prev,
          viewerSettings: {
            ...prev.viewerSettings,
            highlightEnabled: !prev.viewerSettings.highlightEnabled,
          },
        }),
        false
      );
    };

    a.toggleRuler = () => {
      updateProject(
        (prev) => ({
          ...prev,
          viewerSettings: {
            ...prev.viewerSettings,
            rulerEnabled: !prev.viewerSettings.rulerEnabled,
          },
        }),
        false
      );
    };

    a.updateRules = (rules: RulesConfig) => {
      updateProject((prev) => {
        const normalizedRules = normalizeRulesConfig(rules);
        const profiles = prev.rulesProfiles;
        const idx = profiles.perfis.findIndex((p) => p.id === profiles.perfilAtivoId);
        if (idx < 0) return { ...prev, rules: normalizedRules };
        const nextPerfis = [...profiles.perfis];
        nextPerfis[idx] = { ...nextPerfis[idx], rules: normalizedRules };
        const nextConfig = { ...profiles, perfis: nextPerfis };
        saveProfiles(nextConfig);
        return applyResultados({ ...prev, rulesProfiles: nextConfig, rules: normalizedRules });
      }, false);
    };

    a.setActiveRulesProfile = (id: string) => {
      updateProject((prev) => {
        const profiles = prev.rulesProfiles;
        if (!profiles.perfis.some((p) => p.id === id)) return prev;
        const nextConfig = { ...profiles, perfilAtivoId: id };
        const perfil = nextConfig.perfis.find((p) => p.id === id);
        const rules = normalizeRulesConfig(perfil?.rules ?? prev.rules);
        saveProfiles(nextConfig);
        return applyResultados({ ...prev, rulesProfiles: nextConfig, rules });
      }, false);
    };

    a.updateRulesInProfile = (profileId: string, rules: RulesConfig) => {
      updateProject((prev) => {
        const normalizedRules = normalizeRulesConfig(rules);
        const profiles = prev.rulesProfiles;
        const idx = profiles.perfis.findIndex((p) => p.id === profileId);
        if (idx < 0) return prev;
        const nextPerfis = [...profiles.perfis];
        nextPerfis[idx] = { ...nextPerfis[idx], rules: normalizedRules };
        const nextConfig = { ...profiles, perfis: nextPerfis };
        const isActive = profiles.perfilAtivoId === profileId;
        const nextRules = isActive ? normalizedRules : prev.rules;
        saveProfiles(nextConfig);
        return applyResultados({ ...prev, rulesProfiles: nextConfig, rules: nextRules });
      }, false);
    };

    a.addRulesProfile = (profile: { nome: string; descricao?: string; rules?: RulesConfig }) => {
      updateProject((prev) => {
        const id = `profile-${Date.now()}`;
        const newProfile: RulesProfile = {
          id,
          nome: profile.nome,
          descricao: profile.descricao,
          rules: normalizeRulesConfig(profile.rules ?? JSON.parse(JSON.stringify(defaultRulesConfig))),
        };
        const nextConfig = {
          ...prev.rulesProfiles,
          perfis: [...prev.rulesProfiles.perfis, newProfile],
        };
        saveProfiles(nextConfig);
        return { ...prev, rulesProfiles: nextConfig };
      }, false);
    };

    a.setRulesProfilesConfig = (config: RulesProfilesConfig) => {
      updateProject((prev) => {
        const perfil = config.perfis.find((p) => p.id === config.perfilAtivoId);
        const normalizedConfig: RulesProfilesConfig = {
          ...config,
          perfis: config.perfis.map((p) => ({ ...p, rules: normalizeRulesConfig(p.rules) })),
        };
        const normalizedActive = normalizedConfig.perfis.find((p) => p.id === normalizedConfig.perfilAtivoId);
        const rules = normalizeRulesConfig(normalizedActive?.rules ?? perfil?.rules ?? prev.rules);
        return applyResultados({ ...prev, rulesProfiles: normalizedConfig, rules });
      }, false);
    };

    a.setProjectRulesProfile = (id: string) => {
      updateProject((prev) => {
        const perfil = prev.rulesProfiles.perfis.find((p) => p.id === id);
        if (!perfil) return prev;
        return applyResultados({
          ...prev,
          rulesProfileId: id,
          rules: normalizeRulesConfig(perfil.rules),
        });
      }, false);
    };

    a.removeRulesProfile = (id: string) => {
      if (id === DEFAULT_PROFILE_ID) return;
      updateProject((prev) => {
        const profiles = prev.rulesProfiles;
        const nextPerfis = profiles.perfis.filter((p) => p.id !== id);
        if (nextPerfis.length === 0) return prev;
        const newActiveId =
          profiles.perfilAtivoId === id ? nextPerfis[0].id : profiles.perfilAtivoId;
        const nextConfig = {
          perfis: nextPerfis,
          perfilAtivoId: newActiveId,
        };
        const perfil = nextPerfis.find((p) => p.id === newActiveId);
        const rules = normalizeRulesConfig(perfil?.rules ?? prev.rules);
        saveProfiles(nextConfig);
        return applyResultados({ ...prev, rulesProfiles: nextConfig, rules });
      }, false);
    };

    a.recalculateAllBoxes = () => {
      updateProject((prev) => {
        return applyResultados(prev);
      });
    };

    a.undo = () => {
      updateProject(
        (prev) => {
          if (undoStackRef.current.length === 0) return prev;
          const [next, ...rest] = undoStackRef.current;
          undoStackRef.current = rest;
          const currentSnapshot = reviveState(serializeState(prev)) ?? prev;
          redoStackRef.current = [currentSnapshot, ...redoStackRef.current].slice(0, MAX_HISTORY);
          viewerSync.restoreViewerSnapshot(null);
          return applyResultados(next);
        },
        false
      );
    };

    a.redo = () => {
      updateProject(
        (prev) => {
          if (redoStackRef.current.length === 0) return prev;
          const [next, ...rest] = redoStackRef.current;
          redoStackRef.current = rest;
          const currentSnapshot = reviveState(serializeState(prev)) ?? prev;
          undoStackRef.current = [currentSnapshot, ...undoStackRef.current].slice(0, MAX_HISTORY);
          viewerSync.restoreViewerSnapshot(null);
          return applyResultados(next);
        },
        false
      );
    };

    a.saveProjectSnapshot = () => {
      const snapshot: ProjectSnapshot = {
        projectState: serializeState(projectRef.current),
        viewerSnapshot: viewerSync.saveViewerSnapshot(),
        roomSnapshot: captureRoomSnapshot(),
      };
      const currentUser = getCurrentProjectUser();
      void saveProject({
        name: projectRef.current.projectName?.trim() || "Projeto",
        ownerId: currentUser.ownerId,
        ownerName: currentUser.ownerName,
        snapshot,
        thumbnailDataUrl: null,
      });
    };

    a.saveManualBackupSnapshot = () => {
      const snapshot: ProjectSnapshot = {
        projectState: serializeState(projectRef.current),
        viewerSnapshot: viewerSync.saveViewerSnapshot(),
        roomSnapshot: captureRoomSnapshot(),
      };
      const savedAt = new Date().toISOString();
      const backup: ManualBackupEntry = {
        id: `backup-${Date.now()}`,
        name: projectRef.current.projectName?.trim() || "Projeto",
        savedAt,
        snapshot,
      };
      const existing = safeParseJson<ManualBackupEntry[]>(safeGetItem(MANUAL_BACKUPS_STORAGE_KEY));
      const next = Array.isArray(existing) ? [backup, ...existing].slice(0, 100) : [backup];
      safeSetItem(MANUAL_BACKUPS_STORAGE_KEY, JSON.stringify(next));
      setProject((prev) => ({ ...prev, lastAutosaveTime: savedAt }));
    };

    a.loadProjectSnapshot = async (id) => {
      const entry = await loadProjectRecord(id);
      if (!entry) {
        logProjectProvider("load-project-miss", { id });
        return;
      }
      viewerSync.restoreViewerSnapshot((entry.snapshot.viewerSnapshot ?? null) as ProjectSnapshot["viewerSnapshot"]);
      const restored = reviveState(entry.snapshot.projectState);
      if (!restored) return;
      logProjectProvider("project-loaded", { id, boxes: restored.workspaceBoxes?.length ?? 0 });
      if (entry.snapshot.roomSnapshot !== undefined) {
        if (entry.snapshot.roomSnapshot) {
          wallStore.getState().loadRoomConfig(entry.snapshot.roomSnapshot as import("../projectTypes").RoomSnapshot);
        } else {
          wallStore.getState().clearRoom();
        }
      }
      updateProject(() => applyResultados(restored));
    };

    a.loadProjectFromTemplate = (templateId) => {
      const template = getTemplateById(templateId);
      if (!template || !template.boxes.length) return;
      const espessura = template.materialPadrao?.espessura ?? 19;
      const workspaceBoxes = template.boxes.map((b) => {
        const prateleiras = b.prateleiras ?? 0;
        const portaTipo = (b.portaTipo ?? "porta_simples") as WorkspaceBox["portaTipo"];
        const gavetas = b.gavetas ?? 0;
        return {
          id: b.id,
          nome: b.nome,
          dimensoes: b.dimensoes,
          espessura: b.espessura ?? espessura,
          tipoBorda: "reta" as const,
          tipoFundo: "recuado" as const,
          models: [],
          prateleiras,
          portaTipo,
          gavetas,
          alturaGaveta: 200,
          posicaoX_mm: b.posicaoX_mm,
          posicaoY_mm: b.posicaoY_mm ?? 0,
          posicaoZ_mm: b.posicaoZ_mm ?? 0,
          rotacaoY_90: false,
          rotacaoY: 0,
          manualPosition: true,
          panelIds: ensureBoxPanelIds(undefined, { prateleiras, portaTipo, gavetas }),
          doorsLayer: [],
          drawersLayer: [],
        };
      });
      const firstId = workspaceBoxes[0].id;
      const nextState = {
        ...defaultState,
        projectName: template.nome,
        material: template.materialPadrao
          ? { tipo: "mdf_branco", espessura: 19, precoPorM2: 25, ...template.materialPadrao }
          : defaultState.material,
        workspaceBoxes,
        selectedWorkspaceBoxId: firstId,
        selectedCaixaId: firstId,
        selectedBoxId: "",
        selectedCaixaModelUrl: null,
        selectedModelInstanceId: null,
        extractedPartsByBoxId: {},
        modelPositionsByBoxId: {},
        layoutWarnings: { collisions: [], outOfBounds: [] },
      };
      const applied = applyResultados(nextState);
      undoStackRef.current = [];
      redoStackRef.current = [];
      updateProject(() => applied, false);
    };

    a.addTemplateAsNewBox = (templateId) => {
      const template = getTemplateById(templateId);
      if (!template || !template.boxes.length) return;
      updateProject((prev) => {
        const baseEspessura = template.materialPadrao?.espessura ?? prev.material.espessura;
        const stamp = Date.now();
        const usedIds = new Set(prev.workspaceBoxes.map((box) => box.id));
        const nextBoxes = template.boxes.map((b, index) => {
          let candidateIndex = prev.workspaceBoxes.length + index + 1;
          let id = `box-${candidateIndex}-${stamp}`;
          while (usedIds.has(id)) {
            candidateIndex += 1;
            id = `box-${candidateIndex}-${stamp}`;
          }
          usedIds.add(id);
          const espessura = b.espessura ?? baseEspessura;
          const prateleiras = b.prateleiras ?? 0;
          const portaTipo = (b.portaTipo ?? "porta_simples") as WorkspaceBox["portaTipo"];
          const gavetas = b.gavetas ?? 0;
          const newBox = createWorkspaceBox(
            id,
            b.nome,
            b.dimensoes,
            espessura,
            b.posicaoX_mm ?? 0,
            [],
            "reta",
            "recuado",
            undefined,
            { prateleiras, portaTipo, gavetas }
          );
          newBox.posicaoY_mm = b.posicaoY_mm ?? 0;
          newBox.posicaoZ_mm = b.posicaoZ_mm ?? 0;
          newBox.manualPosition = true;
          return newBox;
        });
        const nextWorkspaceBoxes = [...prev.workspaceBoxes, ...nextBoxes];
        const nextPrev = { ...prev, workspaceBoxes: nextWorkspaceBoxes };
        const boxes = buildBoxesFromWorkspace(nextPrev);
        const lastId = nextBoxes[nextBoxes.length - 1]?.id ?? prev.selectedWorkspaceBoxId;
        return recomputeState(
          prev,
          {
            workspaceBoxes: nextWorkspaceBoxes,
            boxes,
            selectedWorkspaceBoxId: lastId,
            selectedCaixaId: lastId,
            selectedCaixaModelUrl: null,
            selectedModelInstanceId: null,
            changelog: appendChangelog(prev.changelog, {
              timestamp: new Date(),
              type: "box",
              message: `Template adicionado: ${template.nome}`,
            }),
          },
          true
        );
      });
    };

    a.listSavedProjects = async (scope = "mine"): Promise<SavedProjectInfo[]> => {
      const currentUser = getCurrentProjectUser();
      const ownerId = scope === "mine" ? currentUser.ownerId : undefined;
      return listProjects(scope, ownerId);
    };

    a.createNewProject = async () => {
      const freshState = applyResultados(defaultState);
      const snapshot: ProjectSnapshot = {
        projectState: serializeState(freshState),
        viewerSnapshot: null,
        roomSnapshot: null,
      };
      const currentUser = getCurrentProjectUser();
      const saved = await saveProject({
        name: freshState.projectName,
        ownerId: currentUser.ownerId,
        ownerName: currentUser.ownerName,
        snapshot,
        thumbnailDataUrl: null,
      });
      if (!saved) return null;

      viewerSync.restoreViewerSnapshot(null);
      wallStore.getState().clearRoom();
      undoStackRef.current = [];
      redoStackRef.current = [];
      updateProject(() => ({ ...freshState, lastAutosaveTime: saved.updatedAt }), false);
      return saved;
    };

    a.renameProject = async (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      await renameProjectById(id, { name: trimmed });
    };

    a.deleteProject = async (id) => {
      await deleteProjectById(id);
    };

    a.addDoorLayerItem = () => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const newDoor = createManualDoor(selected);
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? {
                ...box,
                gavetas: 0,
                portaTipo: box.portaTipo === "sem_porta" ? "porta_simples" : box.portaTipo,
                drawersLayer: [],
                doorsLayer: [...(box.doorsLayer ?? []), newDoor],
                panelIds: ensureBoxPanelIds(box.panelIds, {
                  ...box,
                  gavetas: 0,
                  portaTipo: box.portaTipo === "sem_porta" ? "porta_simples" : box.portaTipo,
                }),
              }
            : box
        );
        return {
          ...prev,
          workspaceBoxes,
          changelog: appendChangelog(prev.changelog, {
            timestamp: new Date(),
            type: "box",
            message: "Porta adicionada",
          }),
        };
      });
    };

    a.addDrawerLayerItem = () => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const newDrawer = createManualDrawer(selected);
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? {
                ...box,
                portaTipo: "sem_porta" as const,
                prateleiras: 0,
                doorsLayer: [],
                gavetas: (box.drawersLayer?.length ?? 0) + 1,
                drawersLayer: [...(box.drawersLayer ?? []), newDrawer],
                panelIds: ensureBoxPanelIds(box.panelIds, {
                  ...box,
                  portaTipo: "sem_porta" as const,
                  prateleiras: 0,
                  gavetas: (box.drawersLayer?.length ?? 0) + 1,
                }),
              }
            : box
        );
        return {
          ...prev,
          workspaceBoxes,
          changelog: appendChangelog(prev.changelog, {
            timestamp: new Date(),
            type: "box",
            message: "Gaveta adicionada",
          }),
        };
      });
    };

    a.removeDoorLayerItem = (id) => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? { ...box, doorsLayer: (box.doorsLayer ?? []).filter((item) => item.id !== id) }
            : box
        );
        return {
          ...prev,
          workspaceBoxes,
          changelog: appendChangelog(prev.changelog, {
            timestamp: new Date(),
            type: "box",
            message: "Porta removida",
          }),
        };
      });
    };

    a.removeDrawerLayerItem = (id) => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? (() => {
                const nextDrawers = (box.drawersLayer ?? []).filter((item) => item.id !== id);
                return {
                  ...box,
                  drawersLayer: nextDrawers,
                  gavetas: nextDrawers.length,
                  panelIds: ensureBoxPanelIds(box.panelIds, {
                    ...box,
                    gavetas: nextDrawers.length,
                  }),
                };
              })()
            : box
        );
        return {
          ...prev,
          workspaceBoxes,
          changelog: appendChangelog(prev.changelog, {
            timestamp: new Date(),
            type: "box",
            message: "Gaveta removida",
          }),
        };
      });
    };

    a.updateDoorLayerItem = (id, partial) => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? {
                ...box,
                doorsLayer: (box.doorsLayer ?? []).map((item) =>
                  item.id === id ? { ...item, ...partial } : item
                ),
              }
            : box
        );
        return {
          ...prev,
          workspaceBoxes,
          changelog: appendChangelog(prev.changelog, {
            timestamp: new Date(),
            type: "box",
            message: "Porta atualizada",
          }),
        };
      });
    };

    a.updateDrawerLayerItem = (id, partial) => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? {
                ...box,
                drawersLayer: (() => {
                  const updated = (box.drawersLayer ?? []).map((item) =>
                    item.id === id ? { ...item, ...partial } : item
                  );
                  const heightChanged = "height" in partial;
                  const mode = box.drawerHeightMode ?? "equal";
                  let next = updated.map((item) =>
                    item.id === id ? applyDrawerTypeRules(box, item) : item
                  );
                  if (heightChanged && mode === "custom") {
                    let offsetY = 0;
                    const availableHeight = Math.max(1, box.dimensoes.altura - 10);
                    next = next.map((item) => {
                      const height = Number.isFinite(item.height) && item.height > 0
                        ? item.height
                        : availableHeight / Math.max(1, next.length);
                      const posY = -box.dimensoes.altura / 2 + 10 + offsetY + height / 2;
                      offsetY += height;
                      return { ...item, height, posY };
                    });
                  }
                  return next;
                })(),
              }
            : box
        );
        return {
          ...prev,
          workspaceBoxes,
          changelog: appendChangelog(prev.changelog, {
            timestamp: new Date(),
            type: "box",
            message: "Gaveta atualizada",
          }),
        };
      });
    };

    a.setDoorLayerItemOpen = (id, isOpen) => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const target = (selected.doorsLayer ?? []).find((item) => item.id === id);
        const isDoubleDoor = selected.portaTipo === "porta_dupla" || target?.groupType === "dupla";
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? {
                ...box,
                doorsLayer: (box.doorsLayer ?? []).map((item) =>
                  isDoubleDoor ? { ...item, isOpen } : item.id === id ? { ...item, isOpen } : item
                ),
              }
            : box
        );
        return {
          ...prev,
          workspaceBoxes,
        };
      });
    };

    a.setDrawerLayerItemOpen = (id, isOpen) => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? {
                ...box,
                drawersLayer: (box.drawersLayer ?? []).map((item) =>
                  item.id === id ? applyDrawerTypeRules(box, { ...item, isOpen }) : item
                ),
              }
            : box
        );
        return {
          ...prev,
          workspaceBoxes,
        };
      });
    };

    a.setDoorLayerItemMaterial = (id, materialId) => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? {
                ...box,
                doorsLayer: (box.doorsLayer ?? []).map((item) =>
                  item.id === id ? { ...item, materialId } : item
                ),
              }
            : box
        );
        return {
          ...prev,
          workspaceBoxes,
          changelog: appendChangelog(prev.changelog, {
            timestamp: new Date(),
            type: "box",
            message: "Material da porta atualizado",
          }),
        };
      });
    };

    a.setDrawerLayerItemMaterial = (id, materialId) => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? {
                ...box,
                drawersLayer: (box.drawersLayer ?? []).map((item) =>
                  item.id === id ? { ...item, materialId } : item
                ),
              }
            : box
        );
        return {
          ...prev,
          workspaceBoxes,
          changelog: appendChangelog(prev.changelog, {
            timestamp: new Date(),
            type: "box",
            message: "Material da gaveta atualizado",
          }),
        };
      });
    };

    a.setDoorLayerItemDirection = (id, direction) => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? {
                ...box,
                doorsLayer: (box.doorsLayer ?? []).map((item) =>
                  item.id === id
                    ? (() => {
                        const currentCenterX =
                          item.pivot === "left-edge"
                            ? item.posX + item.width / 2
                            : item.pivot === "right-edge"
                              ? item.posX - item.width / 2
                              : item.posX;
                        const currentCenterY =
                          item.pivot === "top-edge"
                            ? item.posY - item.height / 2
                            : item.pivot === "bottom-edge"
                              ? item.posY + item.height / 2
                              : item.posY;

                        const nextHingeSide: "left" | "right" | "top" | "bottom" =
                          direction === "left" || direction === "right"
                            ? direction
                            : direction === "up"
                              ? "top"
                              : direction === "down"
                                ? "bottom"
                                : (item.hingeSide ?? "left");
                        const nextPivot: "left-edge" | "right-edge" | "top-edge" | "bottom-edge" =
                          direction === "left"
                            ? "left-edge"
                            : direction === "right"
                              ? "right-edge"
                              : direction === "up"
                                ? "top-edge"
                                : "bottom-edge";
                        const nextPosX =
                          direction === "left"
                            ? currentCenterX - item.width / 2
                            : direction === "right"
                              ? currentCenterX + item.width / 2
                              : currentCenterX;
                        const nextPosY =
                          direction === "up"
                            ? currentCenterY + item.height / 2
                            : direction === "down"
                              ? currentCenterY - item.height / 2
                              : currentCenterY;

                        return {
                          ...item,
                          openDirection: direction,
                          hingeSide: nextHingeSide,
                          pivot: nextPivot,
                          posX: nextPosX,
                          posY: nextPosY,
                        };
                      })()
                    : item
                ),
              }
            : box
        );
        const nextPrev = {
          ...prev,
          workspaceBoxes,
          changelog: appendChangelog(prev.changelog, {
            timestamp: new Date(),
            type: "box",
            message: "Direção de abertura da porta atualizada",
          }),
        };
        /* Recalcular design 3D (caixas, cutlist, furos) para que os furos da caixa (cima/fundo/laterais) atualizem imediatamente com o novo hingeSide. */
        const boxes = buildBoxesFromWorkspace(nextPrev);
        const selectedWorkspace = getSelectedWorkspaceBox(nextPrev);
        const selectedBoxId =
          boxes.find((box) => box.id === selectedWorkspace?.id)?.id ?? boxes[0]?.id ?? "";
        const nextState = {
          ...nextPrev,
          boxes,
          selectedBoxId,
          dimensoes:
            selectedWorkspace?.dimensoes ??
            boxes.find((box) => box.id === selectedBoxId)?.dimensoes ??
            nextPrev.dimensoes,
        };
        return {
          ...nextState,
          ...buildDesignState(nextState),
        };
      });
    };

    a.regenerateBoxLayersForSelectedBox = () => {
      updateProject((prev) => {
        const selected = getSelectedOrFirstWorkspaceBox(prev);
        if (!selected) return prev;
        const normalized = {
          ...selected,
          ...(selected.gavetas > 0
            ? { portaTipo: "sem_porta" as const, prateleiras: 0, doorsLayer: [] }
            : selected.portaTipo !== "sem_porta"
              ? { gavetas: 0, drawersLayer: [] }
              : selected.prateleiras > 0
                ? { gavetas: 0, drawersLayer: [] }
                : null),
        };
        const layers = regenerateLayersForBox(normalized);
        const workspaceBoxes = prev.workspaceBoxes.map((box) =>
          box.id === selected.id
            ? { ...box, ...normalized, ...layers }
            : box
        );
        return {
          ...prev,
          workspaceBoxes,
          changelog: appendChangelog(prev.changelog, {
            timestamp: new Date(),
            type: "box",
            message: "Portas e gavetas regeneradas automaticamente",
          }),
        };
      });
    };

    return a;
  }, [updateProject, viewerSync, exportActions, setProject, undoStackRef, redoStackRef, projectRef]);
}