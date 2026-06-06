import { IndustrialLayout, IndustrialPlaceholderPanel, useIndustrialPageState } from '@/industrial/ui/components';

export default function IndustrialHomePage() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Industrial" description="Entrada operacional do PIMO-TRAK.">
      <IndustrialPlaceholderPanel module="Centro industrial" nextStep="Ligar navegação, KPIs e alertas na Fase 3C.2." />
    </IndustrialLayout>
  );
}
