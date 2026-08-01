import { getStationPageTitle } from '@/app/industrial/work-orders/stationConfigs';
import { looksLikeWorkOrderUuid } from '@/core/projects/projectIdentity';
import { normalizeProjetosPageSlug } from '@/app/PROJETOS/projetosPageSlug';
import {
  INDUSTRIAL_STATIONS,
  STATION_LABELS,
  type IndustrialStation,
} from '@/industrial/work-orders/types';

const DOT = '\u00b7';

export type TrakPageLabelInfo = {
  label: string;
  station?: IndustrialStation;
  workOrderId?: string;
  /** Slug publico do projecto (se presente na rota). */
  projectSlug?: string;
};

function isStation(value: string | undefined): value is IndustrialStation {
  return !!value && (INDUSTRIAL_STATIONS as readonly string[]).includes(value);
}

export function orderPageLabel(station: IndustrialStation): string {
  return `Ordem ${DOT} ${STATION_LABELS[station]}`;
}

/**
 * Nome da pagina TRK a partir do pathname (stationName / ordemName / projectSlug).
 */
export function resolveTrakPageLabel(pathname: string): TrakPageLabelInfo {
  const path = pathname.replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);

  if (parts[0] !== 'industrial') {
    return { label: 'Industrial' };
  }

  if (!parts[1]) {
    return { label: 'Hub Industrial' };
  }

  if (parts[1] === 'supervisor') {
    const projectSlug = parts[2] ? normalizeProjetosPageSlug(decodeURIComponent(parts[2])) : undefined;
    return {
      label: getStationPageTitle('warehouse'),
      station: 'warehouse',
      projectSlug: projectSlug || undefined,
    };
  }

  if (parts[1] === 'operador') {
    return { label: `Esta\u00e7\u00e3o ${DOT} Operador` };
  }

  if (parts[1] === 'work-orders') {
    if (parts[2] === 'order' && parts[3]) {
      const key = decodeURIComponent(parts[3]);
      if (looksLikeWorkOrderUuid(key)) {
        return { label: `Ordem ${DOT} \u2026`, workOrderId: key };
      }
      return {
        label: `Ordens ${DOT} Projecto`,
        projectSlug: normalizeProjetosPageSlug(key),
      };
    }
    if (isStation(parts[2])) {
      const projectSlug = parts[3]
        ? normalizeProjetosPageSlug(decodeURIComponent(parts[3]))
        : undefined;
      return {
        label: getStationPageTitle(parts[2]),
        station: parts[2],
        projectSlug: projectSlug || undefined,
      };
    }
    return { label: 'Ordens de trabalho' };
  }

  if (parts[1] === 'stations' && isStation(parts[2])) {
    return { label: getStationPageTitle(parts[2]), station: parts[2] };
  }

  if (parts[1] === 'operations') {
    if (isStation(parts[2])) {
      return { label: getStationPageTitle(parts[2]), station: parts[2] };
    }
    if (parts[2] === 'cnc') {
      return { label: `Opera\u00e7\u00f5es ${DOT} CNC` };
    }
    if (parts[2]) {
      return { label: `Opera\u00e7\u00f5es ${DOT} ${parts[2]}` };
    }
    return { label: 'Opera\u00e7\u00f5es' };
  }

  if (parts[1] === 'piece') {
    return { label: 'Pe\u00e7a' };
  }

  const known: Record<string, string> = {
    tracking: 'Tracking',
    events: 'Eventos',
    quality: 'Qualidade',
    rework: 'Retrabalho',
    'time-tracking': 'Tempo',
    'release-notes': 'Release notes',
  };

  return { label: known[parts[1]] ?? `Industrial ${DOT} ${parts[1]}` };
}
