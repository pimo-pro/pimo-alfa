import { IndustrialLayout, IndustrialPlaceholderPanel, useIndustrialPageState } from '@/industrial/ui/components';

export default function IndustrialReworkRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Retrabalho" description="Pedidos, origem, destino e resolução de retrabalho.">
      <IndustrialPlaceholderPanel module="Rework" nextStep="Ligar fila de retrabalho e decisões de qualidade na Fase 3C.2." />
    </IndustrialLayout>
  );
}
