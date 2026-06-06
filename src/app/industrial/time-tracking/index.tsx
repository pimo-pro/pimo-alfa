import { IndustrialLayout, IndustrialPlaceholderPanel, useIndustrialPageState } from '@/industrial/ui/components';

export default function IndustrialTimeTrackingRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Tempo de Operação" description="Registo de start/stop por estação e operador.">
      <IndustrialPlaceholderPanel module="Time Tracking" nextStep="Ligar timers operacionais na Fase 3C.2." />
    </IndustrialLayout>
  );
}
