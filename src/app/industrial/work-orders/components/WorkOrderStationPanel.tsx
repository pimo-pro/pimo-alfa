import { Navigate } from 'react-router-dom';

import type { IndustrialStation } from '@/industrial/work-orders/types';

interface WorkOrderStationPanelProps {
  station: IndustrialStation;
}

/** Redirecciona operações legadas para UI 2.0 das estações. */
export default function WorkOrderStationPanel({ station }: WorkOrderStationPanelProps) {
  return <Navigate to={`/industrial/work-orders/${station}`} replace />;
}
