import { Navigate } from 'react-router-dom';

import { useIndustrialPageState } from '@/industrial/ui/components';

export default function IndustrialMontagemOperationRoute() {
  useIndustrialPageState();
  return <Navigate to="/industrial/work-orders/montagem" replace />;
}
