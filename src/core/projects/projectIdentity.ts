/**
 * Identidade pùblica vs IDs internos de projecto.
 * Display / URLs ? slug (Antunes_Novo_Cozinha)
 * Persistùncia ? local-* / pimo-* / UUID (nunca como display)
 */

import {
  normalizeProjetosPageSlug,
  projectNameFromPageSlug,
  toProjetosPageSlug,
} from "@/app/PROJETOS/projetosPageSlug";
import { sanitizeIndustrialSegment } from "@/core/etiquetas/industrialDisplayName";
import { readOfflineProjects, type OfflineProjectRecord } from "@/core/projects/projectsOfflineStore";

function projectCodeFromName(projectName: string): string {
  return (sanitizeIndustrialSegment(projectName) || "PROJETO").toUpperCase();
}

export const PROJECT_DISPLAY_FALLBACK = "ù";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** ID interno (API pimo-*, local-*, UUID) ù nunca usar como nome/display. */
export function isInternalProjectId(value: string | null | undefined): boolean {
  const v = String(value ?? "").trim();
  if (!v) return false;
  if (/^pimo[-_]/i.test(v)) return true;
  if (/^local[-_]/i.test(v)) return true;
  if (UUID_RE.test(v)) return true;
  return false;
}

/** Alias canùnico pedido na unificaùùo. */
export function normalizeProjectName(name: string): string {
  return toProjetosPageSlug(name);
}

export type ProjectIdentity = {
  name: string;
  slug: string;
  projectCode: string;
  /** id local offline */
  localId: string;
  /** id remoto API (pimo-ù) se existir */
  remoteId: string | null;
  /** chave preferida para WOs / storage legado */
  persistenceId: string;
};

export function identityFromOffline(project: OfflineProjectRecord): ProjectIdentity {
  const name = project.name?.trim() || "Projeto";
  const localId = project.id;
  const remoteId = project.remoteId?.trim() || null;
  return {
    name,
    slug: toProjetosPageSlug(name),
    projectCode: projectCodeFromName(name),
    localId,
    remoteId,
    persistenceId: remoteId || localId,
  };
}

export function findOfflineProjectByAnyKey(key: string): OfflineProjectRecord | null {
  const raw = String(key ?? "").trim();
  if (!raw) return null;
  const slugNorm = normalizeProjetosPageSlug(raw);
  const codeNorm = projectCodeFromName(projectNameFromPageSlug(raw));

  for (const project of readOfflineProjects()) {
    if (project.deleted) continue;
    if (project.id === raw || project.remoteId === raw) return project;
    const name = project.name?.trim() || "";
    if (!name) continue;
    if (normalizeProjetosPageSlug(name) === slugNorm) return project;
    if (name === raw || name === projectNameFromPageSlug(raw)) return project;
    if (projectCodeFromName(name) === codeNorm) return project;
  }
  return null;
}

export function resolveProjectIdentity(key: string | null | undefined): ProjectIdentity | null {
  const raw = String(key ?? "").trim();
  if (!raw) return null;
  const offline = findOfflineProjectByAnyKey(raw);
  if (offline) return identityFromOffline(offline);
  if (isInternalProjectId(raw)) return null;
  // Slug/nome sem registo offline ù identidade pùblica mùnima
  const name = projectNameFromPageSlug(raw);
  return {
    name,
    slug: toProjetosPageSlug(name),
    projectCode: projectCodeFromName(name),
    localId: "",
    remoteId: null,
    persistenceId: toProjetosPageSlug(name),
  };
}

export function resolveProjectDisplayNameSafe(projectId: string): string {
  const identity = resolveProjectIdentity(projectId);
  if (identity?.name) return identity.name;
  return PROJECT_DISPLAY_FALLBACK;
}

export function buildRelatorioFinalPath(nameOrSlug: string): string {
  const identity = resolveProjectIdentity(nameOrSlug);
  const slug = identity?.slug || normalizeProjectName(nameOrSlug);
  return `/relatorio-final/${encodeURIComponent(slug)}`;
}

export function buildIndustrialStationPath(
  station: string,
  nameOrSlug: string,
): string {
  const identity = resolveProjectIdentity(nameOrSlug);
  const slug = identity?.slug || normalizeProjectName(nameOrSlug);
  return `/industrial/work-orders/${station}/${encodeURIComponent(slug)}`;
}

export function buildIndustrialOrderByProjectPath(nameOrSlug: string, hash?: string): string {
  const identity = resolveProjectIdentity(nameOrSlug);
  const slug = identity?.slug || normalizeProjectName(nameOrSlug);
  const base = `/industrial/work-orders/order/${encodeURIComponent(slug)}`;
  return hash ? `${base}#${hash}` : base;
}

export function buildIndustrialSupervisorPath(nameOrSlug?: string): string {
  if (!nameOrSlug?.trim()) return "/industrial/supervisor";
  const identity = resolveProjectIdentity(nameOrSlug);
  const slug = identity?.slug || normalizeProjectName(nameOrSlug);
  return `/industrial/supervisor/${encodeURIComponent(slug)}`;
}

export function buildWorkOrdersListPath(nameOrSlug?: string): string {
  if (!nameOrSlug?.trim()) return "/industrial/work-orders";
  const identity = resolveProjectIdentity(nameOrSlug);
  const code = identity?.projectCode || projectCodeFromName(nameOrSlug);
  return `/industrial/work-orders?project=${encodeURIComponent(code)}`;
}

/** Parece UUID de work order Supabase (nùo slug de projecto). */
export function looksLikeWorkOrderUuid(value: string | null | undefined): boolean {
  return UUID_RE.test(String(value ?? "").trim());
}
