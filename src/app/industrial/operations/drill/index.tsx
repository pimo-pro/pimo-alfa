import { IndustrialLayout, useIndustrialPageState } from '@/industrial/ui/components';

import WorkOrderStationPanel from '@/app/industrial/work-orders/components/WorkOrderStationPanel';

export default function IndustrialDrillOperationRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Operação Drill" description="Furação, QR e registo de execução.">
      <WorkOrderStationPanel station="drill" />
    </IndustrialLayout>
  );
}
