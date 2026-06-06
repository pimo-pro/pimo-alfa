import { IndustrialLayout, useIndustrialPageState } from '@/industrial/ui/components';

import WorkOrderStationPanel from '@/app/industrial/work-orders/components/WorkOrderStationPanel';

export default function IndustrialEmbalagemOperationRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Operação Embalagem" description="Embalagem, QR e registo de execução.">
      <WorkOrderStationPanel station="embalagem" />
    </IndustrialLayout>
  );
}
