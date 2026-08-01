import { normalizeProjetosPageSlug } from '@/app/PROJETOS/projetosPageSlug';
import {
  isInternalProjectId,
  looksLikeWorkOrderUuid,
  resolveProjectIdentity,
} from '@/core/projects/projectIdentity';
import { INDUSTRIAL_STATIONS, type IndustrialStation } from '@/industrial/work-orders/types';

function isStation(value: string | undefined): value is IndustrialStation {
  return !!value && (INDUSTRIAL_STATIONS as readonly string[]).includes(value);
}

/**
 * Extrai o slug de projecto da rota industrial actual (se existir e nao for UUID/pimo-*).
 */
export function extractIndustrialProjectSlug(pathname: string): string | null {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] !== 'industrial') return null;

  if (parts[1] === 'supervisor' && parts[2]) {
    const key = decodeURIComponent(parts[2]);
    if (looksLikeWorkOrderUuid(key) || isInternalProjectId(key)) {
      return resolveProjectIdentity(key)?.slug ?? null;
    }
    return normalizeProjetosPageSlug(key) || null;
  }

  if (parts[1] === 'work-orders') {
    if (parts[2] === 'order' && parts[3]) {
      const key = decodeURIComponent(parts[3]);
      if (looksLikeWorkOrderUuid(key) || isInternalProjectId(key)) return null;
      return normalizeProjetosPageSlug(key) || null;
    }
    if (isStation(parts[2]) && parts[3]) {
      const key = decodeURIComponent(parts[3]);
      if (looksLikeWorkOrderUuid(key) || isInternalProjectId(key)) {
        return resolveProjectIdentity(key)?.slug ?? null;
      }
      return normalizeProjetosPageSlug(key) || null;
    }
  }

  return null;
}

/** SUP ? supervisor; restantes ? work-orders/{station} (com projecto se houver). */
export function industrialRailHref(
  station: IndustrialStation,
  projectSlug: string | null | undefined,
): string {
  const slug = projectSlug?.trim()
    ? encodeURIComponent(normalizeProjetosPageSlug(projectSlug))
    : '';

  if (station === 'warehouse') {
    return slug ? `/industrial/supervisor/${slug}` : '/industrial/supervisor';
  }

  return slug
    ? `/industrial/work-orders/${station}/${slug}`
    : `/industrial/work-orders/${station}`;
}

export function industrialSupervisorHref(projectSlug: string | null | undefined): string {
  return industrialRailHref('warehouse', projectSlug);
}

export function industrialOrderHubHref(projectSlug: string, hash?: string): string {
  const slug = encodeURIComponent(normalizeProjetosPageSlug(projectSlug));
  const base = `/industrial/work-orders/order/${slug}`;
  return hash ? `${base}#${hash}` : base;
}
