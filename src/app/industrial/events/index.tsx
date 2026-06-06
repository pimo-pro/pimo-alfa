import { IndustrialLayout, IndustrialPlaceholderPanel, useIndustrialPageState } from '@/industrial/ui/components';

export default function IndustrialEventsRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title="Eventos" description="Histórico industrial e auditoria operacional.">
      <IndustrialPlaceholderPanel module="Eventos" nextStep="Ligar filtros e feed de eventos Supabase na Fase 3C.2." />
    </IndustrialLayout>
  );
}
