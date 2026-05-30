import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { applyResultados, appendChangelog } from "../projectState";
import { createRematesForBox } from "../../core/remate/remateFactory";
import { getMaterialByIdOrLabel } from "../../core/materials/service";

export type RemateActions = Pick<ProjectActions, "createBoxRemate" | "updateRemate" | "removeRemate">;

export function useRemateActions(ctx: ProjectActionsExecutionContext): RemateActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      createBoxRemate: (input) => {
        updateProject(
          (prev) => {
            const box = prev.workspaceBoxes.find((b) => b.id === prev.selectedWorkspaceBoxId);
            if (!box) return prev;
            const materialId = input.materialId || box.material || prev.materialId || prev.material.tipo;
            const material = getMaterialByIdOrLabel(materialId);
            const thicknessMm = Number(material?.espessura ?? box.espessura ?? prev.material.espessura) || 19;
            const created = createRematesForBox({
              box,
              input,
              materialId,
              thicknessMm,
              existingCount: prev.remates?.length ?? 0,
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
