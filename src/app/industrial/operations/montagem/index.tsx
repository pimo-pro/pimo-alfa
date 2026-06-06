import { IndustrialLayout, useIndustrialPageState } from '@/industrial/ui/components';

import WorkOrderStationPanel from '@/app/industrial/work-orders/components/WorkOrderStationPanel';

export default function IndustrialMontagemOperationRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Operação Montagem" description="Montagem, QR e registo de execução.">
      <WorkOrderStationPanel station="montagem" />
    </IndustrialLayout>
  );
}
