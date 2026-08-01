import type { SavedProjectRecord } from '@/core/projects/types';
import { findOfflineProjectByAnyKey } from '@/core/projects/projectIdentity';
import { toSavedRecordFromOffline } from '@/core/projects/projectsMappers';

import { resolveProjectCutlistFromRecord } from './resolveProjectCutlistFromRecord';

export type { ProjectCutlistContext } from './resolveProjectCutlistFromRecord';

export function resolveProjectCutlist(projectId: string) {
  const project = findOfflineProjectByAnyKey(projectId);
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
