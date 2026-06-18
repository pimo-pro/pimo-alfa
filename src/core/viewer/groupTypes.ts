/** Grupo de objetos do viewer — IDs codificados (box:, door:, remate:, etc.). */
export type ObjectGroupData = {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: number;
};

export type ObjectGroupsState = Record<string, ObjectGroupData>;

export type GroupBoundingBox = {
  center: { x: number; y: number; z: number };
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
};

export function createObjectGroupId(): string {
  return `grp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyObjectGroups(): ObjectGroupsState {
  return {};
}
