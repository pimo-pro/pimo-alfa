import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import { recomputeState } from "../projectState";
import { createGroupInProject, ungroupInProject } from "../../core/viewer/groupService";
import { historyManager } from "../../core/viewer/historyManager";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type GroupActions = Pick<ProjectActions, "createObjectGroup" | "ungroupObject">;

export function useGroupActions(ctx: ProjectActionsExecutionContext): GroupActions {
  const { updateProject } = ctx;

  return useMemo(() => {
    const a: GroupActions = {} as GroupActions;

    a.createObjectGroup = (memberIds, name) => {
      let createdId: string | null = null;
      updateProject(
        (prev) => {
          const patch = createGroupInProject(prev, memberIds, name);
          if (!patch) return prev;
          createdId = patch.groupId;
          historyManager.recordEvent("group.create", `Criar grupo (${memberIds.length} itens)`);
          const { groupId: _gid, ...statePatch } = patch;
          return recomputeState(prev, statePatch, true);
        },
        true
      );
      return createdId;
    };

    a.ungroupObject = (groupId) => {
      updateProject(
        (prev) => {
          const patch = ungroupInProject(prev, groupId);
          if (!patch) return prev;
          historyManager.recordEvent("group.ungroup", "Desagrupar");
          return { ...prev, ...patch };
        },
        true
      );
    };

    return a;
  }, [updateProject]);
}
