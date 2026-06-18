import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import { recomputeState } from "../projectState";
import { applyScalingToProject, resolveScalableTargets } from "../../core/viewer/selectionTransformService";
import { maxLengthAcross } from "../../core/viewer/scalingModes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { applyMaterialToSelectedObjects } from "../../core/viewer/batchMaterialService";
import { historyManager } from "../../core/viewer/historyManager";
import { decodeSelectionId } from "../../core/viewer/selectionIds";
import { getAdjacentPlacementMm, getNextWorkspaceBoxId } from "../projectHelpers";
import type { WorkspaceBox } from "../../core/types";
import { ensureBoxPanelIds } from "../../core/box/panelIds";
import type { ProjectState } from "../projectTypes";

export type SelectionTransformActions = Pick<
  ProjectActions,
  | "scaleSelectedObjects"
  | "duplicateSelectedObjects"
  | "deleteSelectedObjects"
  | "rotateSelectedObjects"
  | "setSelectedObjectsMaterial"
>;

export function useSelectionTransformActions(ctx: ProjectActionsExecutionContext): SelectionTransformActions {
  const { updateProject } = ctx;

  return useMemo(() => {
    const a = {} as SelectionTransformActions;

    a.scaleSelectedObjects = (selectedObjectIds, newMaxLength, mode) => {
      if (!selectedObjectIds.length || !Number.isFinite(newMaxLength) || newMaxLength <= 0) return;
      historyManager.recordEvent("scaling", `Scaling ${mode}`);
      updateProject(
        (prev) => {
          const patch = applyScalingToProject(prev, selectedObjectIds, newMaxLength, mode);
          return recomputeState(prev, patch, true);
        },
        true
      );
    };

    a.duplicateSelectedObjects = (selectedObjectIds) => {
      if (!selectedObjectIds.length) return;
      updateProject(
        (prev) => {
          let workspaceBoxes = [...prev.workspaceBoxes];
          let remates = [...(prev.remates ?? [])];
          const rodapes = [...(prev.rodapes ?? [])];
          let lastBoxId: string | null = null;

          for (const encoded of selectedObjectIds) {
            const decoded = decodeSelectionId(encoded);
            if (!decoded) continue;

            if (decoded.kind === "box") {
              const selected = workspaceBoxes.find((b) => b.id === decoded.id);
              if (!selected) continue;
              const { id: newBoxId } = getNextWorkspaceBoxId(workspaceBoxes);
              const adjacentPlacement = getAdjacentPlacementMm(selected, selected.dimensoes ?? { largura: 400 });
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
              workspaceBoxes = [...workspaceBoxes, newBox];
              lastBoxId = newBoxId;
              continue;
            }

            if (decoded.kind === "remate") {
              const source = remates.find((r) => r.id === decoded.id);
              if (!source) continue;
              const copy = {
                ...source,
                id: `${source.id}-copy-${Date.now()}`,
                name: `${source.name} (cópia)`,
                position: {
                  ...source.position,
                  xMm: (source.position.xMm ?? 0) + 50,
                },
              };
              remates = [...remates, copy];
            }
          }

          return recomputeState(
            prev,
            {
              workspaceBoxes,
              remates,
              rodapes,
              ...(lastBoxId
                ? {
                    selectedWorkspaceBoxId: lastBoxId,
                    selectedCaixaId: lastBoxId,
                  }
                : {}),
            },
            true
          );
        },
        true
      );
    };

    a.deleteSelectedObjects = (selectedObjectIds) => {
      if (!selectedObjectIds.length) return;
      updateProject(
        (prev) => {
          const boxIds = new Set<string>();
          const remateIds = new Set<string>();
          const rodapeIds = new Set<string>();

          for (const encoded of selectedObjectIds) {
            const decoded = decodeSelectionId(encoded);
            if (!decoded) continue;
            if (decoded.kind === "box") boxIds.add(decoded.id);
            if (decoded.kind === "remate") remateIds.add(decoded.id);
            if (decoded.kind === "rodape") rodapeIds.add(decoded.id);
          }

          const workspaceBoxes = prev.workspaceBoxes.filter((b) => !boxIds.has(b.id));
          const remates = (prev.remates ?? []).filter((r) => !remateIds.has(r.id));
          const rodapes = (prev.rodapes ?? []).filter((r) => !rodapeIds.has(r.id));

          return recomputeState(prev, { workspaceBoxes, remates, rodapes }, true);
        },
        true
      );
    };

    a.rotateSelectedObjects = (selectedObjectIds) => {
      const boxIds = selectedObjectIds
        .map((encoded) => decodeSelectionId(encoded))
        .filter((d) => d?.kind === "box")
        .map((d) => d!.id);
      if (!boxIds.length) return;
      updateProject(
        (prev) => {
          const workspaceBoxes = prev.workspaceBoxes.map((boxItem) => {
            if (!boxIds.includes(boxItem.id) || boxItem.locked) return boxItem;
            const currentRad = boxItem.rotacaoY ?? 0;
            let nextRad = currentRad + Math.PI / 2;
            let deg = (nextRad * 180) / Math.PI;
            deg = Math.round(deg / 90) * 90;
            deg = ((deg % 360) + 360) % 360;
            if (deg === 360) deg = 0;
            nextRad = (deg * Math.PI) / 180;
            return {
              ...boxItem,
              rotacaoY_90: !boxItem.rotacaoY_90,
              rotacaoY: nextRad,
              autoRotateEnabled: false,
              manualPosition: true,
            };
          });
          return { ...prev, workspaceBoxes };
        },
        true
      );
    };

    a.setSelectedObjectsMaterial = (selectedObjectIds, materialId) => {
      if (!selectedObjectIds.length || !materialId?.trim()) return;
      historyManager.recordEvent("material.batch", "Material em lote");
      updateProject(
        (prev) => {
          const patch = applyMaterialToSelectedObjects(prev, selectedObjectIds, materialId);
          return recomputeState(prev, patch, true);
        },
        true
      );
    };

    return a;
  }, [updateProject]);
}

/** Utilitário para prompt de nova medida máxima. */
export function promptScalingNewLength(
  project: ProjectState,
  selectedObjectIds: string[]
): number | null {
  const targets = resolveScalableTargets(project, selectedObjectIds);
  if (!targets.length) return null;
  const currentMax = maxLengthAcross(...targets.map((t) => t.dimensions));
  const raw = window.prompt(
    `Novo comprimento máximo (mm) — atual: ${Math.round(currentMax)}`,
    String(Math.round(currentMax))
  );
  if (raw == null) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
