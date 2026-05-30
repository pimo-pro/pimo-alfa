import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { applyResultados, appendChangelog } from "../projectState";
import { createRematesForBox } from "../../core/remate/remateFactory";
import { getMaterialByIdOrLabel } from "../../core/materials/service";
import { positionToFaceKind } from "../../core/remate/remateTypes";

export type RemateActions = Pick<ProjectActions, "createBoxRemate" | "updateRemate" | "removeRemate">;

export function useRemateActions(ctx: ProjectActionsExecutionContext): RemateActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      createBoxRemate: (input) => {
        updateProject(
          (prev) => {
            const targetBoxId = input.parentBoxId ?? prev.selectedWorkspaceBoxId;
            const box = prev.workspaceBoxes.find((b) => b.id === targetBoxId);
            if (!box) return prev;
            const materialId = input.materialId || box.material || prev.materialId || prev.material.tipo;
            const material = getMaterialByIdOrLabel(materialId);
            const thicknessMm = Number(material?.espessura ?? box.espessura ?? prev.material.espessura) || 19;
            const targetFace = positionToFaceKind(input.position, input.type);
            if (targetFace !== "L") {
              const alreadyHasFace = (prev.remates ?? []).some(
                (r) => r.parentBoxId === box.id && r.faceKind === targetFace
              );
              if (alreadyHasFace) return prev;
            }

            const existingCount = (prev.remates ?? []).filter((r) => r.parentBoxId === box.id).length;
            const created = createRematesForBox({
              box,
              input,
              materialId,
              thicknessMm,
              existingCount,
            });
            const ids = created.map((remate) => remate.id);
            const workspaceBoxes = prev.workspaceBoxes.map((b) =>
              b.id === box.id ? { ...b, remateIds: [...(b.remateIds ?? []), ...ids] } : b
            );
            return applyResultados({
              ...prev,
              workspaceBoxes,
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
            return applyResultados({
              ...prev,
              remates: (prev.remates ?? []).filter((remate) => remate.id !== remateId),
              workspaceBoxes: prev.workspaceBoxes.map((box) => ({
                ...box,
                remateIds: (box.remateIds ?? []).filter((id) => id !== remateId),
              })),
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
    }),
    [updateProject]
  );
}
