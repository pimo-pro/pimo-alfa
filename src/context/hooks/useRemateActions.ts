import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { applyResultados, appendChangelog } from "../projectState";
import { createRematePieces, refreshRemateMountSnap } from "../../core/remate/rematePieceFactory";
import { createRematesForBox } from "../../core/remate/remateFactory";
import { getMaterialByIdOrLabel } from "../../core/materials/service";
import type { CreateRematePieceInput } from "../../core/remate/rematePieceTypes";
import { applyProductPatch, computeDimensionsForProduct, inferProductTypeFromLegacy, normalizeProductOptions } from "../../core/remate/remateProductRules";

export type RemateActions = Pick<
  ProjectActions,
  | "createRematePiece"
  | "createStandaloneRematePiece"
  | "createBoxRemate"
  | "updateRemate"
  | "removeRemate"
  | "selectRematePiece"
  | "resnapRemateToFace"
>;

function boxDimsFromWorkspace(box: import("../../core/types").WorkspaceBox) {
  return {
    widthM: Math.max(0.001, (box.dimensoes?.largura ?? 600) / 1000),
    heightM: Math.max(0.001, (box.dimensoes?.altura ?? 720) / 1000),
    depthM: Math.max(0.001, (box.dimensoes?.profundidade ?? 600) / 1000),
  };
}

export function useRemateActions(ctx: ProjectActionsExecutionContext): RemateActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      createRematePiece: (input) => {
        updateProject(
          (prev) => {
            const box = input.parentBoxId
              ? prev.workspaceBoxes.find((b) => b.id === input.parentBoxId)
              : null;
            const materialPresetId =
              input.materialPresetId || box?.material || prev.materialId || prev.material.tipo;
            const material = getMaterialByIdOrLabel(materialPresetId);
            const thicknessMm =
              Number(material?.espessura ?? box?.espessura ?? prev.material.espessura) || 19;
            const created = createRematePieces(input, {
              box,
              allBoxes: prev.workspaceBoxes,
              materialPresetId,
              thicknessMm,
              boxDimsM: box ? boxDimsFromWorkspace(box) : undefined,
            });
            return applyResultados({
              ...prev,
              remates: [...(prev.remates ?? []), ...created],
              selectedWorkspaceBoxId: input.parentBoxId ?? prev.selectedWorkspaceBoxId,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Remate criado: ${created.map((r) => r.name).join(", ")}`,
              }),
            });
          },
          true
        );
      },

      createStandaloneRematePiece: (input: CreateRematePieceInput) => {
        updateProject(
          (prev) => {
            const materialPresetId = prev.materialId || prev.material.tipo;
            const material = getMaterialByIdOrLabel(materialPresetId);
            const thicknessMm = Number(material?.espessura ?? prev.material.espessura) || 19;
            const created = createRematePieces(
              { ...input, followBox: false },
              {
                allBoxes: prev.workspaceBoxes,
                materialPresetId,
                thicknessMm,
              }
            );
            return applyResultados({
              ...prev,
              remates: [...(prev.remates ?? []), ...created],
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Remate standalone: ${created.map((r) => r.name).join(", ")}`,
              }),
            });
          },
          true
        );
      },

      createBoxRemate: (input) => {
        updateProject(
          (prev) => {
            const targetBoxId = input.parentBoxId ?? prev.selectedWorkspaceBoxId;
            const box = prev.workspaceBoxes.find((b) => b.id === targetBoxId);
            if (!box) return prev;
            const materialId = input.materialId || box.material || prev.materialId || prev.material.tipo;
            const material = getMaterialByIdOrLabel(materialId);
            const thicknessMm = Number(material?.espessura ?? box.espessura ?? prev.material.espessura) || 19;
            const existingCount = (prev.remates ?? []).filter((r) => r.parentBoxId === box.id).length;
            const created = createRematesForBox({
              box,
              input,
              materialId,
              thicknessMm,
              existingCount,
            });
            return applyResultados({
              ...prev,
              remates: [...(prev.remates ?? []), ...created],
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Remate criado: ${created.map((r) => r.name).join(", ")}`,
              }),
            });
          },
          true
        );
      },

      updateRemate: (remateId, patch) => {
        updateProject(
          (prev) =>
            applyResultados({
              ...prev,
              remates: (prev.remates ?? []).map((remate) => {
                if (remate.id !== remateId) return remate;
                let next = applyProductPatch(remate, patch);
                // Recalculate depth (and width/height if driven by rules) when
                // material, productOptions, or productType change — depth is not
                // user-editable and must always reflect the rules + material.
                const shouldRecalcDims =
                  patch.materialPresetId != null ||
                  patch.productOptions != null ||
                  patch.productType != null ||
                  patch.mountSlot != null;
                if (shouldRecalcDims && !patch.depth) {
                  const box = next.parentBoxId
                    ? prev.workspaceBoxes.find((b) => b.id === next.parentBoxId)
                    : null;
                  const mat = getMaterialByIdOrLabel(next.materialPresetId);
                  const thicknessMm =
                    Number(mat?.espessura ?? box?.espessura ?? prev.material.espessura) || 19;
                  const productType = next.productType ?? inferProductTypeFromLegacy(next);
                  const opts = normalizeProductOptions(productType, next.productOptions);
                  const dims = computeDimensionsForProduct({
                    box: box ?? null,
                    productType,
                    mountSlot: next.mountSlot ?? "FRENTE",
                    thicknessMm,
                    productOptions: opts,
                    partRole: next.partRole,
                    partIndex: next.partIndex,
                  });
                  next = { ...next, depth: dims.depth };
                }
                const shouldResnap =
                  (patch.tipo != null ||
                    patch.mountSlot != null ||
                    patch.productType != null ||
                    patch.productOptions != null) &&
                  next.followBox &&
                  next.placementMode !== "FREE";
                if (shouldResnap && next.parentBoxId) {
                  const box = prev.workspaceBoxes.find((b) => b.id === next.parentBoxId);
                  if (box) {
                    next = refreshRemateMountSnap(next, box, boxDimsFromWorkspace(box));
                  }
                }
                return next;
              }),
            }),
          true
        );
      },

      resnapRemateToFace: (remateId) => {
        updateProject(
          (prev) => {
            const remate = prev.remates?.find((r) => r.id === remateId);
            if (!remate?.parentBoxId) return prev;
            const box = prev.workspaceBoxes.find((b) => b.id === remate.parentBoxId);
            if (!box) return prev;
            const groupId = remate.parentGroupId;
            const idsToSnap = groupId
              ? (prev.remates ?? []).filter((r) => r.parentGroupId === groupId).map((r) => r.id)
              : [remateId];
            return applyResultados({
              ...prev,
              remates: (prev.remates ?? []).map((r) => {
                if (!idsToSnap.includes(r.id)) return r;
                return refreshRemateMountSnap(r, box, boxDimsFromWorkspace(box));
              }),
            });
          },
          true
        );
      },

      removeRemate: (remateId) => {
        updateProject(
          (prev) => {
            const removed = prev.remates?.find((remate) => remate.id === remateId);
            const groupId = removed?.parentGroupId;
            return applyResultados({
              ...prev,
              remates: (prev.remates ?? []).filter(
                (remate) =>
                  remate.id !== remateId && (groupId ? remate.parentGroupId !== groupId : true)
              ),
              changelog: removed
                ? appendChangelog(prev.changelog, {
                    timestamp: new Date(),
                    type: "box",
                    message: `Remate removido: ${removed.name}`,
                  })
                : prev.changelog,
            });
          },
          true
        );
      },

      selectRematePiece: () => {
        // Seleção UI via viewer; noop no estado persistido.
      },
    }),
    [updateProject]
  );
}
