import { useMemo } from "react";
import type { CornerOrientation } from "../../core/cornerCabinet/cornerCabinetRules";
import { isCornerDireitaInferiorV2Model } from "../../core/cornerCabinet/cornerCabinetRules";
import { applyCornerOrientationToBox } from "../../core/cornerCabinet/cornerOrientation";
import type { ProjectActions } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { appendChangelog, recomputeState } from "../projectState";

export type CornerOrientationActions = Pick<ProjectActions, "setCornerOrientation">;

export function useCornerOrientationActions(
  ctx: ProjectActionsExecutionContext
): CornerOrientationActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      setCornerOrientation: (boxId: string, orientation: CornerOrientation) => {
        updateProject(
          (prev) => {
            let changed = false;
            const workspaceBoxes = prev.workspaceBoxes.map((box) => {
              if (box.id !== boxId || !isCornerDireitaInferiorV2Model(box.baseCabinetId)) {
                return box;
              }
              if (box.orientation === orientation) {
                return box;
              }
              changed = true;
              return applyCornerOrientationToBox(box, orientation);
            });
            if (!changed) return prev;
            return recomputeState(
              prev,
              {
                workspaceBoxes,
                changelog: appendChangelog(prev.changelog, {
                  timestamp: new Date(),
                  type: "box",
                  message: `Orientação canto: ${orientation}`,
                }),
              },
              true
            );
          },
          true
        );
      },
    }),
    [updateProject]
  );
}
