import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { applyResultados, appendChangelog } from "../projectState";
import { createHematisForBox } from "../../core/hemati/hematiFactory";
import { getMaterialByIdOrLabel } from "../../core/materials/service";
import { HEMATI_DEFAULT_THICKNESS_MM } from "../../core/kitchenFinish/finishTypes";

export type HematiActions = Pick<
  ProjectActions,
  "createBoxHemati" | "updateHemati" | "removeHemati" | "setHematiVisible"
>;

export function useHematiActions(ctx: ProjectActionsExecutionContext): HematiActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      createBoxHemati: (input) => {
        updateProject(
          (prev) => {
            const targetBoxId = input.parentBoxId ?? prev.selectedWorkspaceBoxId;
            const box = prev.workspaceBoxes.find((b) => b.id === targetBoxId);
            if (!box) return prev;

            if (input.kind !== "L" && input.kind !== "U") {
              const exists = (prev.hematis ?? []).some(
                (h) => h.parentBoxId === box.id && h.kind === input.kind
              );
              if (exists) return prev;
            }

            const materialId = input.materialId || box.material || prev.materialId || prev.material.tipo;
            const material = getMaterialByIdOrLabel(materialId);
            const thicknessMm =
              input.thicknessMm ??
              (Number(material?.espessura ?? box.espessura ?? HEMATI_DEFAULT_THICKNESS_MM) || 19);
            const existingCount = (prev.hematis ?? []).filter((h) => h.parentBoxId === box.id).length;
            const created = createHematisForBox({
              box,
              allBoxes: prev.workspaceBoxes,
              room: prev.room,
              roomBoundsM: null,
              input,
              materialId,
              thicknessMm,
              existingCount,
            });

            return applyResultados({
              ...prev,
              hematis: [...(prev.hematis ?? []), ...created],
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Remate: ${created.map((h) => h.name).join(", ")}`,
              }),
            });
          },
          true
        );
      },

      updateHemati: (hematiId, patch) => {
        updateProject(
          (prev) =>
            applyResultados({
              ...prev,
              hematis: (prev.hematis ?? []).map((h) => (h.id === hematiId ? { ...h, ...patch } : h)),
            }),
          true
        );
      },

      removeHemati: (hematiId) => {
        updateProject(
          (prev) => {
            const removed = prev.hematis?.find((h) => h.id === hematiId);
            return applyResultados({
              ...prev,
              hematis: (prev.hematis ?? []).filter((h) => h.id !== hematiId),
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

      setHematiVisible: (hematiId, visible) => {
        updateProject(
          (prev) =>
            applyResultados({
              ...prev,
              hematis: (prev.hematis ?? []).map((h) =>
                h.id === hematiId ? { ...h, visible } : h
              ),
            }),
          true
        );
      },
    }),
    [updateProject]
  );
}
