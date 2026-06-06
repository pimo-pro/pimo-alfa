import { IndustrialLayout, IndustrialPlaceholderPanel, useIndustrialPageState } from '@/industrial/ui/components';

export default function IndustrialQualityRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Qualidade" description="Inspeções, bloqueios e decisões de qualidade.">
      <IndustrialPlaceholderPanel module="Qualidade" nextStep="Ligar inspeções e rework automático na Fase 3C.2." />
    </IndustrialLayout>
  );
}
