import { readOfflineProjects } from "@/core/projects/projectsOfflineStore";
import {
  PROJECT_DISPLAY_FALLBACK,
  resolveProjectDisplayNameSafe,
  resolveProjectIdentity,
} from "@/core/projects/projectIdentity";
import { toProjetosPageSlug } from "@/app/PROJETOS/projetosPageSlug";
import { buildProjetosPagePath } from "@/app/PROJETOS/projetosPageSlug";

export function resolveProjetosLinkForProjectId(projectId: string): {
  name: string;
  href: string;
} | null {
  const identity = resolveProjectIdentity(projectId);
  if (!identity?.name || identity.name === PROJECT_DISPLAY_FALLBACK) {
    const project = readOfflineProjects().find(
      (p) => !p.deleted && (p.id === projectId || p.remoteId === projectId),
    );
    if (!project?.name?.trim()) return null;
    return {
      name: project.name.trim(),
      href: buildProjetosPagePath({ name: project.name }),
    };
  }
  return {
    name: identity.name,
    href: buildProjetosPagePath({ name: identity.name }),
  };
}

/** Nome legível — nunca devolve pimo-* / local-* / UUID. */
export function resolveProjectDisplayName(projectId: string): string {
  return resolveProjectDisplayNameSafe(projectId);
}

export function buildProjetosHrefFromProjectName(projectName: string): string {
  return buildProjetosPagePath({ name: toProjetosPageSlug(projectName) });
}
