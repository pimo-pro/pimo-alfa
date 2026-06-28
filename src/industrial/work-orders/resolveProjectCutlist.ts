import type { SavedProjectRecord } from '@/core/projects/types';
import { readOfflineProjects } from '@/core/projects/projectsOfflineStore';
import { toSavedRecordFromOffline } from '@/core/projects/projectsMappers';

import { resolveProjectCutlistFromRecord } from './resolveProjectCutlistFromRecord';

export type { ProjectCutlistContext } from './resolveProjectCutlistFromRecord';

export function resolveProjectCutlist(projectId: string) {
  const project = readOfflineProjects().find((p) => !p.deleted && p.id === projectId);
  if (!project) return null;
  return resolveProjectCutlistFromRecord(toSavedRecordFromOffline(project));
}

/** @deprecated Preferir resolveProjectCutlistFromRecord — mantido para imports legados. */
export function resolveProjectCutlistFromProjectId(projectId: string) {
  return resolveProjectCutlist(projectId);
}

export function resolveProjectCutlistFromSavedRecord(record: SavedProjectRecord) {
  return resolveProjectCutlistFromRecord(record);
}
