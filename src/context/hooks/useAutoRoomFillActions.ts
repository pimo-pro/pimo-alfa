import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { runAutoRoomFillOnState } from "../../core/autoRoomFill";
import {
  EMPTY_ALLOW_UPPER,
  EMPTY_WALL_SELECTION,
} from "../../core/autoRoomFill/autoRoomFillTypes";

export type AutoRoomFillActions = Pick<
  ProjectActions,
  "runAutoRoomFill" | "setAutoFillWallSettings"
>;

export function useAutoRoomFillActions(ctx: ProjectActionsExecutionContext): AutoRoomFillActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      setAutoFillWallSettings: (patch) => {
        updateProject(
          (prev) => ({
            ...prev,
            autoFill: {
              lastRunAt: prev.autoFill?.lastRunAt ?? "",
              summary: prev.autoFill?.summary ?? "",
              createdBoxIds: prev.autoFill?.createdBoxIds ?? [],
              createdRemateIds: prev.autoFill?.createdRemateIds ?? [],
              createdHematiIds: prev.autoFill?.createdHematiIds ?? [],
              createdRodapeIds: prev.autoFill?.createdRodapeIds ?? [],
              wallSummaries: prev.autoFill?.wallSummaries ?? [],
              specialsPlaced: prev.autoFill?.specialsPlaced ?? [],
              wallSelection: {
                ...(prev.autoFill?.wallSelection ?? EMPTY_WALL_SELECTION),
                ...(patch.wallSelection ?? {}),
              },
              allowUpperModules: {
                ...(prev.autoFill?.allowUpperModules ?? EMPTY_ALLOW_UPPER),
                ...(patch.allowUpperModules ?? {}),
              },
            },
          }),
          false
        );
      },

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
