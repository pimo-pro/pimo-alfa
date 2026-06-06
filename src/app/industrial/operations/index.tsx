import { IndustrialLayout, IndustrialPlaceholderPanel, useIndustrialPageState } from '@/industrial/ui/components';

export default function IndustrialOperationsRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Operações" description="Estações de produção e filas operacionais.">
      <IndustrialPlaceholderPanel
        module="Operações industriais"
        nextStep="Seleccionar uma estação no menu industrial ou aceder directamente à rota da operação."
      />
    </IndustrialLayout>
  );
}
