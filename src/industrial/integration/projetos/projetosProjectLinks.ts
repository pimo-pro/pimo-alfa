import { readOfflineProjects } from "@/core/projects/projectsOfflineStore";
import { toProjetosPageSlug } from "@/app/PROJETOS/projetosPageSlug";
import { buildProjetosPagePath } from "@/app/PROJETOS/projetosPageSlug";

export function resolveProjetosLinkForProjectId(projectId: string): {
  name: string;
  href: string;
} | null {
  const project = readOfflineProjects().find((p) => !p.deleted && (p.id === projectId || p.remoteId === projectId));
  if (!project?.name?.trim()) return null;
  return {
    name: project.name.trim(),
    href: buildProjetosPagePath({ name: project.name }),
  };
}

export function resolveProjectDisplayName(projectId: string): string {
  return resolveProjetosLinkForProjectId(projectId)?.name ?? projectId;
}

export function buildProjetosHrefFromProjectName(projectName: string): string {
  return buildProjetosPagePath({ name: toProjetosPageSlug(projectName) });
}
