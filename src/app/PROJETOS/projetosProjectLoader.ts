import type { SavedProjectRecord } from "@/core/projects/types";
import { loadProjectRecord } from "@/core/projects/projectsClient";
import {
  readOfflineProjects,
  projectMatchesId,
  type OfflineProjectRecord,
} from "@/core/projects/projectsOfflineStore";
import { decodeProjetosPageSlug, toProjetosPageSlug } from "./projetosPageSlug";

function offlineRecordMatchesPageSlug(record: OfflineProjectRecord, pageSlug: string): boolean {
  return toProjetosPageSlug(record.name) === decodeProjetosPageSlug(pageSlug);
}

/** Carrega projecto pelo slug da URL (nome). Compatível com URLs antigas por id interno. */
export async function loadProjectRecordByPageSlug(pageSlug: string): Promise<SavedProjectRecord | null> {
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
  return loadProjectRecord(pageSlug);
}
