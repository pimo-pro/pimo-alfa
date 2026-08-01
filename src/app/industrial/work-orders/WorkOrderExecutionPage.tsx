import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { fetchWorkOrderDetail } from '@/industrial/api/workOrderActions';
import { IndustrialLayout, useIndustrialPageState } from '@/industrial/ui/components';
import { industrialUi, useIndustrialTone } from '@/industrial/ui/layouts/industrialTheme';
import type { IndustrialWorkOrder } from '@/industrial/work-orders/types';
import { INDUSTRIAL_STATIONS, type IndustrialStation } from '@/industrial/work-orders/types';

import StationPageShell from './components/StationPageShell';

function isStation(value: string | undefined): value is IndustrialStation {
  return !!value && (INDUSTRIAL_STATIONS as readonly string[]).includes(value);
}

/**
 * Página "Ordem · Estação" — usa o mesmo shell industrial das estações
 * (StationPageShell → StationPanel → useStationPage) com filtro à work order.
 */
export default function WorkOrderExecutionPage() {
  useIndustrialPageState();
  const tone = useIndustrialTone();
  const ui = industrialUi(tone);
  const { workOrderId } = useParams<{ workOrderId: string }>();

  const [order, setOrder] = useState<IndustrialWorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchWorkOrderDetail(workOrderId);
      setOrder(detail.order);
      if (!detail.order) setError('Ordem de trabalho não encontrada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ordem.');
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!workOrderId) {
    return (
      <IndustrialLayout title="Ordem de trabalho" description="Identificador em falta.">
        <p style={{ color: ui.textStrong }}>Ordem inválida.</p>
      </IndustrialLayout>
    );
  }

  if (loading && !order) {
    return (
      <IndustrialLayout title="Ordem de trabalho" description="A carregar…">
        <p style={{ color: ui.muted }}>A carregar ordem…</p>
      </IndustrialLayout>
    );
  }

  if (error || !order || !isStation(order.station)) {
    return (
      <IndustrialLayout title="Ordem de trabalho" description="Execução operacional">
        <div style={{ marginBottom: 12 }}>
          <Link to="/industrial/work-orders" style={{ fontSize: 13, color: ui.link }}>
            ← Voltar à lista
          </Link>
        </div>
        <p style={{ color: '#dc2626' }}>{error ?? 'Ordem de trabalho não encontrada.'}</p>
      </IndustrialLayout>
    );
  }

  return <StationPageShell station={order.station} workOrderId={order.id} />;
}
