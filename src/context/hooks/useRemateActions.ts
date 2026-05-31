import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { applyResultados, appendChangelog } from "../projectState";
import { createRematePieces } from "../../core/remate/rematePieceFactory";
import { createRematesForBox } from "../../core/remate/remateFactory";
import { getMaterialByIdOrLabel } from "../../core/materials/service";
import type { RematePieceTipo } from "../../core/remate/rematePieceTypes";

export type RemateActions = Pick<
  ProjectActions,
  | "createRematePiece"
  | "createStandaloneRematePiece"
  | "createBoxRemate"
  | "updateRemate"
  | "removeRemate"
  | "selectRematePiece"
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

      createStandaloneRematePiece: (tipo: RematePieceTipo) => {
        updateProject(
          (prev) => {
            const materialPresetId = prev.materialId || prev.material.tipo;
            const material = getMaterialByIdOrLabel(materialPresetId);
            const thicknessMm = Number(material?.espessura ?? prev.material.espessura) || 19;
            const created = createRematePieces(
              { tipo, followBox: false },
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
              remates: (prev.remates ?? []).map((remate) =>
                remate.id === remateId ? { ...remate, ...patch } : remate
              ),
            }),
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
