import { useParams } from 'react-router-dom';

import { looksLikeWorkOrderUuid } from '@/core/projects/projectIdentity';

import ProjectOrderHubPage from './ProjectOrderHubPage';
import WorkOrderExecutionPage from './WorkOrderExecutionPage';

/**
 * /industrial/work-orders/order/:orderOrProject
 * - UUID Supabase ? execução de WO (legado)
 * - slug de projecto ? hub de ordens + anchors
 */
export default function WorkOrderOrProjectOrderPage() {
  const { orderOrProject, workOrderId } = useParams<{
    orderOrProject?: string;
    workOrderId?: string;
  }>();
  const key = (orderOrProject ?? workOrderId ?? '').trim();

  if (looksLikeWorkOrderUuid(key)) {
    return <WorkOrderExecutionPage />;
  }

  return <ProjectOrderHubPage />;
}
