import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import type { ProjectRoomConfig } from "../../3d/viewer-engine/room/roomEngineTypes";
import {
  applyProjectRoomDimensions,
  applyProjectRoomToWallStore,
  createDefaultProjectRoom as buildDefaultProjectRoom,
  normalizeProjectRoom,
} from "../../3d/viewer-engine/room/RoomEngine";
import { wallStore } from "../../stores/wallStore";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { appendChangelog } from "../projectState";

export type RoomActions = Pick<
  ProjectActions,
  "setProjectRoom" | "updateProjectRoom" | "createDefaultProjectRoom" | "removeProjectRoom"
>;

export function useRoomActions(ctx: ProjectActionsExecutionContext): RoomActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      setProjectRoom: (room: ProjectRoomConfig | null) => {
        updateProject(
          (prev) => {
            if (!room) {
              wallStore.getState().clearRoom();
              return {
                ...prev,
                room: null,
                changelog: appendChangelog(prev.changelog, {
                  timestamp: new Date(),
                  type: "doc",
                  message: "Sala removida",
                }),
              };
            }
            const normalized = normalizeProjectRoom(room);
            if (!normalized) return prev;
            applyProjectRoomToWallStore(normalized);
            return {
              ...prev,
              room: normalized,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "doc",
                message: "Configurações da sala atualizadas",
              }),
            };
          },
          true
        );
      },

      updateProjectRoom: (patch: Partial<ProjectRoomConfig>) => {
        updateProject(
          (prev) => {
            const base = prev.room ?? buildDefaultProjectRoom();
            let merged = normalizeProjectRoom({ ...base, ...patch });
            if (!merged) return prev;
            if (
              patch.widthMm !== undefined ||
              patch.depthMm !== undefined ||
              patch.heightMm !== undefined
            ) {
              merged = applyProjectRoomDimensions(merged);
            }
            applyProjectRoomToWallStore(merged);
            return {
              ...prev,
              room: merged,
            };
          },
          true
        );
      },

      createDefaultProjectRoom: () => {
        updateProject(
          (prev) => {
            const room = buildDefaultProjectRoom();
            applyProjectRoomToWallStore(room);
            return {
              ...prev,
              room,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "doc",
                message: "Sala Room 2.0 criada",
              }),
            };
          },
          true
        );
      },

      removeProjectRoom: () => {
        updateProject(
          (prev) => {
            wallStore.getState().clearRoom();
            return {
              ...prev,
              room: null,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "doc",
                message: "Sala removida",
              }),
            };
          },
          true
        );
      },
    }),
    [updateProject]
  );
}
