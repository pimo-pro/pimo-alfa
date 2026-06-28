import type { StationPageConfig } from '@/industrial/ui/components/stationTypes';
import type { IndustrialStation } from '@/industrial/work-orders/types';
import { STATION_LABELS } from '@/industrial/work-orders/types';

const BASE: Record<IndustrialStation, Omit<StationPageConfig, 'station'>> = {
  warehouse: {
    panelTitle: 'Supervisor Geral',
    confirmLabel: 'Confirmar entrega',
  },
  nesting: {
    panelTitle: 'Nesting',
    confirmLabel: 'Confirmar corte',
  },
  drill: {
    panelTitle: 'Drill',
    confirmLabel: 'Confirmar furação',
  },
  orlar: {
    panelTitle: 'Orlar',
    confirmLabel: 'Confirmar orlar',
  },
  montagem: {
    panelTitle: 'Montagem',
    confirmLabel: 'Confirmar montagem',
    enableSupervisorChat: true,
  },
  embalagem: {
    panelTitle: 'Embalagem',
    confirmLabel: 'Confirmar embalagem',
  },
};

export function getStationConfig(station: IndustrialStation): StationPageConfig {
  return { station, ...BASE[station] };
}

export function getStationPageTitle(station: IndustrialStation): string {
  return `Estação · ${STATION_LABELS[station]}`;
}
