import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { runAutoRoomFillOnState } from "../../core/autoRoomFill";

export type AutoRoomFillActions = Pick<ProjectActions, "runAutoRoomFill">;

export function useAutoRoomFillActions(ctx: ProjectActionsExecutionContext): AutoRoomFillActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      runAutoRoomFill: () => {
        updateProject(
          (prev) => {
            if (!prev.room) return prev;
            const result = runAutoRoomFillOnState(prev);
            return result?.state ?? prev;
          },
          true
        );
      },
    }),
    [updateProject]
  );
}
