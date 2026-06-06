import { Link } from 'react-router-dom';

import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';

interface PieceWorkOrderTasksProps {
  tasks: IndustrialWorkOrderTask[];
  loading?: boolean;
  error?: string | null;
}

const STATUS_LABEL: Record<IndustrialWorkOrderTask['status'], string> = {
  pending: 'Pendente',
  in_progress: 'Em execução',
  completed: 'Concluído',
  rejected: 'Rejeitado',
};

export default function PieceWorkOrderTasks({ tasks, loading, error }: PieceWorkOrderTasksProps) {
  if (loading) return <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>A carregar work orders…</p>;
  if (error) return <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>;
  if (tasks.length === 0) {
    return <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Sem tarefas de work order.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
      {tasks.map((task) => (
        <li
          key={task.id}
          style={{
            padding: '6px 8px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 600 }}>{task.operationType}</div>
          <div style={{ color: '#94a3b8', marginTop: 2 }}>{STATUS_LABEL[task.status]}</div>
          <Link
            to={`/industrial/work-orders/order/${task.workOrderId}`}
            style={{ color: '#60a5fa', marginTop: 4, display: 'inline-block' }}
          >
            Abrir ordem
          </Link>
        </li>
      ))}
    </ul>
  );
}
