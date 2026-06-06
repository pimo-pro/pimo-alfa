import { Navigate, useParams } from 'react-router-dom';

import { INDUSTRIAL_STATIONS, type IndustrialStation } from '@/industrial/work-orders/types';

function isStation(value: string | undefined): value is IndustrialStation {
  return !!value && (INDUSTRIAL_STATIONS as readonly string[]).includes(value);
}

/** Alias legado → páginas canónicas em `/industrial/work-orders/{station}`. */
export default function StationExecutionPage() {
  const { station } = useParams<{ station: string }>();
  if (!isStation(station)) {
    return <Navigate to="/industrial/work-orders" replace />;
  }
  return <Navigate to={`/industrial/work-orders/${station}`} replace />;
}
