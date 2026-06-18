import type { ProjectState } from "../../context/projectTypes";
import {
  createObjectGroupId,
  type ObjectGroupData,
  type ObjectGroupsState,
} from "./groupTypes";

export function createGroupInProject(
  project: ProjectState,
  memberIds: string[],
  name?: string
): (Pick<ProjectState, "objectGroups"> & { groupId: string }) | null {
  const unique = Array.from(
    new Set(memberIds.filter((id) => typeof id === "string" && id.trim().length > 0))
  );
  if (unique.length < 2) return null;

  const id = createObjectGroupId();
  const group: ObjectGroupData = {
    id,
    name: name?.trim() || `Grupo ${Object.keys(project.objectGroups ?? {}).length + 1}`,
    memberIds: unique,
    createdAt: Date.now(),
  };

  return {
    groupId: id,
    objectGroups: {
      ...(project.objectGroups ?? {}),
      [id]: group,
    },
  };
}

export function ungroupInProject(
  project: ProjectState,
  groupId: string
): Pick<ProjectState, "objectGroups"> | null {
  const groups = project.objectGroups ?? {};
  if (!groups[groupId]) return null;
  const next = { ...groups };
  delete next[groupId];
  return { objectGroups: next };
}

export function findGroupContainingMember(
  groups: ObjectGroupsState | undefined,
  encodedId: string
): ObjectGroupData | null {
  if (!groups) return null;
  for (const group of Object.values(groups)) {
    if (group.memberIds.includes(encodedId)) return group;
  }
  return null;
}

export function removeMemberFromAllGroups(
  groups: ObjectGroupsState | undefined,
  encodedId: string
): ObjectGroupsState {
  if (!groups) return {};
  const next: ObjectGroupsState = {};
  for (const [id, group] of Object.entries(groups)) {
    const memberIds = group.memberIds.filter((m) => m !== encodedId);
    if (memberIds.length >= 2) {
      next[id] = { ...group, memberIds };
    }
  }
  return next;
}
