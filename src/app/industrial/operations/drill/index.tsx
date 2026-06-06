import { Navigate } from 'react-router-dom';

import { useIndustrialPageState } from '@/industrial/ui/components';

export default function IndustrialDrillOperationRoute() {
  useIndustrialPageState();
  return <Navigate to="/industrial/work-orders/drill" replace />;
}
