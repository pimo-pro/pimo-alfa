import { IndustrialLayout, useIndustrialPageState } from '@/industrial/ui/components';

import WorkOrderStationPanel from '@/app/industrial/work-orders/components/WorkOrderStationPanel';

export default function IndustrialNestingOperationRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Operação Nesting" description="Fila de nesting, QR e registo de execução.">
      <WorkOrderStationPanel station="nesting" />
    </IndustrialLayout>
  );
}
