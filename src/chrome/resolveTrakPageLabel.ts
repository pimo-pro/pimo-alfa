import { getStationPageTitle } from '@/app/industrial/work-orders/stationConfigs';
import {
  INDUSTRIAL_STATIONS,
  STATION_LABELS,
  type IndustrialStation,
} from '@/industrial/work-orders/types';

export type TrakPageLabelInfo = {
  label: string;
  station?: IndustrialStation;
  workOrderId?: string;
};

function isStation(value: string | undefined): value is IndustrialStation {
  return !!value && (INDUSTRIAL_STATIONS as readonly string[]).includes(value);
}

export function orderPageLabel(station: IndustrialStation): string {
  return `Ordem · ${STATION_LABELS[station]}`;
}

/**
 * Nome da página TRK a partir do pathname (stationName / ordemName).
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
    return { label: getStationPageTitle('warehouse'), station: 'warehouse' };
  }

  if (parts[1] === 'operador') {
    return { label: 'Estação · Operador' };
  }

  if (parts[1] === 'work-orders') {
    if (parts[2] === 'order' && parts[3]) {
      return { label: 'Ordem · …', workOrderId: parts[3] };
    }
    if (isStation(parts[2])) {
      return { label: getStationPageTitle(parts[2]), station: parts[2] };
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
      return { label: 'Operações · CNC' };
    }
    if (parts[2]) {
      return { label: `Operações · ${parts[2]}` };
    }
    return { label: 'Operações' };
  }

  if (parts[1] === 'piece') {
    return { label: 'Peça' };
  }

  const known: Record<string, string> = {
    tracking: 'Tracking',
    events: 'Eventos',
    quality: 'Qualidade',
    rework: 'Retrabalho',
    'time-tracking': 'Tempo',
    'release-notes': 'Release notes',
  };

  return { label: known[parts[1]] ?? `Industrial · ${parts[1]}` };
}
