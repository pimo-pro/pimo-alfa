import { Navigate } from 'react-router-dom';

import { useIndustrialPageState } from '@/industrial/ui/components';

export default function IndustrialOrlarOperationRoute() {
  useIndustrialPageState();
  return <Navigate to="/industrial/work-orders/orlar" replace />;
}
