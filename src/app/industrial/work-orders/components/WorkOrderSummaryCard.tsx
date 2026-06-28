import type { IndustrialWorkOrder, IndustrialWorkOrderTask } from '@/industrial/work-orders/types';
import { resolveOrderProjectCode } from '@/industrial/work-orders/resolveWorkOrderPiece';
import { STATION_LABELS } from '@/industrial/work-orders/types';

type Props = {
  order: IndustrialWorkOrder;
  tasks?: IndustrialWorkOrderTask[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em execução',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export default function WorkOrderSummaryCard({ order, tasks = [] }: Props) {
  const projectCode = resolveOrderProjectCode(order, tasks);
  const sampleNames = tasks
    .map((task) => task.display?.fullIndustrialName)
    .filter(Boolean)
    .slice(0, 3) as string[];

  return (
    <section
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        background: '#fff',
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Projecto</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{projectCode}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Estação</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{STATION_LABELS[order.station]}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Estado</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{STATUS_LABEL[order.status] ?? order.status}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Peças</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{order.pieceIds.length}</div>
        </div>
      </div>

      {sampleNames.length > 0 ? (
        <div style={{ fontSize: 12, color: '#475569' }}>
          <span style={{ fontWeight: 600 }}>Peças: </span>
          {sampleNames.join(' · ')}
          {tasks.length > sampleNames.length ? ` · +${tasks.length - sampleNames.length}` : ''}
        </div>
      ) : null}
    </section>
  );
}
