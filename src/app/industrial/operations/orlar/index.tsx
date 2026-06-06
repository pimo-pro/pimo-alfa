import { IndustrialLayout, useIndustrialPageState } from '@/industrial/ui/components';

import WorkOrderStationPanel from '@/app/industrial/work-orders/components/WorkOrderStationPanel';

export default function IndustrialOrlarOperationRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Operação Orlar" description="Orlagem, QR e registo de execução.">
      <WorkOrderStationPanel station="orlar" />
    </IndustrialLayout>
  );
}
