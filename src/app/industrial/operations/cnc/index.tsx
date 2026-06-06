import { IndustrialLayout, IndustrialPlaceholderPanel, useIndustrialPageState } from '@/industrial/ui/components';

export default function IndustrialCncOperationRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Operação CNC" description="Fila e execução CNC por peça.">
      <IndustrialPlaceholderPanel module="CNC" nextStep="Ligar operações CNC e estados de peça na Fase 3C.2." />
    </IndustrialLayout>
  );
}
