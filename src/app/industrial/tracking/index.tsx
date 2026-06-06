import { IndustrialLayout, IndustrialPlaceholderPanel, useIndustrialPageState } from '@/industrial/ui/components';

export default function IndustrialTrackingRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Tracking" description="Acompanhamento de peças, operações e progresso.">
      <IndustrialPlaceholderPanel module="Tracking" nextStep="Ligar snapshots de tracking e realtime na Fase 3C.2." />
    </IndustrialLayout>
  );
}
