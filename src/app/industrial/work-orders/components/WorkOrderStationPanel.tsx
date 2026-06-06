import { StationWorkOrderContent } from './StationWorkOrderPage';
import type { IndustrialStation } from '@/industrial/work-orders/types';

interface WorkOrderStationPanelProps {
  station: IndustrialStation;
}

/** Conteúdo de estação para páginas `/industrial/operations/*`. */
export default function WorkOrderStationPanel({ station }: WorkOrderStationPanelProps) {
  return <StationWorkOrderContent station={station} />;
}
