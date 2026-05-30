import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { applyResultados, appendChangelog } from "../projectState";
import { createRodapesForBox } from "../../core/rodape/rodapeFactory";
import { getMaterialByIdOrLabel } from "../../core/materials/service";
import { RODAPE_DEFAULT_HEIGHT_MM, HEMATI_DEFAULT_THICKNESS_MM } from "../../core/kitchenFinish/finishTypes";

export type RodapeActions = Pick<
  ProjectActions,
  "createBoxRodape" | "updateRodape" | "removeRodape" | "setRodapeVisible"
>;

export function useRodapeActions(ctx: ProjectActionsExecutionContext): RodapeActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      createBoxRodape: (input) => {
        updateProject(
          (prev) => {
            const targetBoxId = input.parentBoxId ?? prev.selectedWorkspaceBoxId;
            const box = prev.workspaceBoxes.find((b) => b.id === targetBoxId);
            if (!box) return prev;

            if (input.kind !== "L" && input.kind !== "U") {
              const exists = (prev.rodapes ?? []).some(
                (r) => r.parentBoxId === box.id && r.kind === input.kind
              );
              if (exists) return prev;
            }

            const materialId = input.materialId || box.material || prev.materialId || prev.material.tipo;
            const material = getMaterialByIdOrLabel(materialId);
            const thicknessMm =
              input.thicknessMm ??
              (Number(material?.espessura ?? box.espessura ?? HEMATI_DEFAULT_THICKNESS_MM) || 19);
            const heightMm = input.heightMm ?? RODAPE_DEFAULT_HEIGHT_MM;
            const existingCount = (prev.rodapes ?? []).filter((r) => r.parentBoxId === box.id).length;
            const created = createRodapesForBox({
              box,
              allBoxes: prev.workspaceBoxes,
              room: prev.room,
              roomBoundsM: null,
              input,
              materialId,
              thicknessMm,
              heightMm,
              existingCount,
            });

            return applyResultados({
              ...prev,
              rodapes: [...(prev.rodapes ?? []), ...created],
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Roda pé: ${created.map((r) => r.name).join(", ")}`,
              }),
            });
          },
          true
        );
      },

      updateRodape: (rodapeId, patch) => {
        updateProject(
          (prev) =>
            applyResultados({
              ...prev,
              rodapes: (prev.rodapes ?? []).map((r) => (r.id === rodapeId ? { ...r, ...patch } : r)),
            }),
          true
        );
      },

      removeRodape: (rodapeId) => {
        updateProject(
          (prev) => {
            const removed = prev.rodapes?.find((r) => r.id === rodapeId);
            return applyResultados({
              ...prev,
              rodapes: (prev.rodapes ?? []).filter((r) => r.id !== rodapeId),
              changelog: removed
                ? appendChangelog(prev.changelog, {
                    timestamp: new Date(),
                    type: "box",
                    message: `Roda pé removido: ${removed.name}`,
                  })
                : prev.changelog,
            });
          },
          true
        );
      },

      setRodapeVisible: (rodapeId, visible) => {
        updateProject(
          (prev) =>
            applyResultados({
              ...prev,
              rodapes: (prev.rodapes ?? []).map((r) =>
                r.id === rodapeId ? { ...r, visible } : r
              ),
            }),
          true
        );
      },
    }),
    [updateProject]
  );
}
