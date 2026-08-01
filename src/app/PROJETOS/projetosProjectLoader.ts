import type { SavedProjectRecord } from "@/core/projects/types";
import { loadProjectRecord } from "@/core/projects/projectsClient";
import {
  readOfflineProjects,
  projectMatchesId,
  type OfflineProjectRecord,
} from "@/core/projects/projectsOfflineStore";
import {
  normalizeProjetosPageSlug,
  projectNameFromPageSlug,
  toProjetosPageSlug,
} from "./projetosPageSlug";

function offlineRecordMatchesPageSlug(record: OfflineProjectRecord, pageSlug: string): boolean {
  return toProjetosPageSlug(record.name) === normalizeProjetosPageSlug(pageSlug);
}

/** Carrega projecto pelo slug da URL (nome). Compativel com URLs antigas (espacos / id). */
export async function loadProjectRecordByPageSlug(pageSlug: string): Promise<SavedProjectRecord | null> {
  const projectName = projectNameFromPageSlug(pageSlug);
  const projects = readOfflineProjects();
  const byName = projects.find(
    (project) => !project.deleted && offlineRecordMatchesPageSlug(project, pageSlug)
  );
  if (byName) {
    return loadProjectRecord(byName.remoteId ?? byName.id);
  }
  const byLegacyId = projects.find(
    (project) => !project.deleted && projectMatchesId(project, pageSlug)
  );
  if (byLegacyId) {
    return loadProjectRecord(byLegacyId.remoteId ?? byLegacyId.id);
  }
  return loadProjectRecord(projectName);
}
