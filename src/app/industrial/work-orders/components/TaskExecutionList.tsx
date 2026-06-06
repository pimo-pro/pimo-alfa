import { Link } from 'react-router-dom';

import type { IndustrialWorkOrderTask, WorkOrderTaskStatus } from '@/industrial/work-orders/types';

interface TaskExecutionListProps {
  tasks: IndustrialWorkOrderTask[];
  busyTaskId?: string | null;
  onStart?: (task: IndustrialWorkOrderTask) => void;
  onComplete?: (task: IndustrialWorkOrderTask) => void;
  onReject?: (task: IndustrialWorkOrderTask) => void;
  highlightPieceId?: string | null;
}

const STATUS_LABEL: Record<WorkOrderTaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em execução',
  completed: 'Concluído',
  rejected: 'Rejeitado',
};

const STATUS_COLOR: Record<WorkOrderTaskStatus, string> = {
  pending: '#64748b',
  in_progress: '#2563eb',
  completed: '#16a34a',
  rejected: '#dc2626',
};

export default function TaskExecutionList({
  tasks,
  busyTaskId,
  onStart,
  onComplete,
  onReject,
  highlightPieceId,
}: TaskExecutionListProps) {
  if (tasks.length === 0) {
    return <p style={{ color: '#64748b', fontSize: 13 }}>Sem tarefas nesta ordem.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
      {tasks.map((task) => {
        const highlighted = highlightPieceId && task.pieceId === highlightPieceId;
        return (
          <li
            key={task.id}
            style={{
              border: highlighted ? '2px solid #2563eb' : '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 12,
              background: highlighted ? 'rgba(37, 99, 235, 0.06)' : '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  <Link to={`/industrial/piece/${task.pieceId}`} style={{ color: '#0f172a' }}>
                    {task.pieceId}
                  </Link>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Operação: {task.operationType}
                </div>
                <div style={{ fontSize: 12, color: STATUS_COLOR[task.status], marginTop: 4, fontWeight: 600 }}>
                  {STATUS_LABEL[task.status]}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {task.status === 'pending' && onStart ? (
                  <button
                    type="button"
                    disabled={busyTaskId === task.id}
                    onClick={() => onStart(task)}
                    style={actionButtonStyle('#2563eb')}
                  >
                    Iniciar
                  </button>
                ) : null}
                {task.status === 'in_progress' && onComplete ? (
                  <button
                    type="button"
                    disabled={busyTaskId === task.id}
                    onClick={() => onComplete(task)}
                    style={actionButtonStyle('#16a34a')}
                  >
                    Concluir
                  </button>
                ) : null}
                {(task.status === 'pending' || task.status === 'in_progress') && onReject ? (
                  <button
                    type="button"
                    disabled={busyTaskId === task.id}
                    onClick={() => onReject(task)}
                    style={actionButtonStyle('#dc2626')}
                  >
                    Rejeitar
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function actionButtonStyle(background: string) {
  return {
    padding: '6px 10px',
    borderRadius: 6,
    border: 'none',
    background,
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  } as const;
}
