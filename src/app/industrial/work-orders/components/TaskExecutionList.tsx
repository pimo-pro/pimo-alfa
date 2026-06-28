import type { IndustrialWorkOrderTask, WorkOrderTaskStatus } from '@/industrial/work-orders/types';

import WorkOrderPieceRow from './WorkOrderPieceRow';

interface TaskExecutionListProps {
  tasks: IndustrialWorkOrderTask[];
  projectId: string;
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
  projectId,
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
        const highlighted = Boolean(highlightPieceId && task.pieceId === highlightPieceId);
        return (
          <li key={task.id}>
            <WorkOrderPieceRow
              task={task}
              projectId={projectId}
              highlighted={highlighted}
              secondary={
                <>
                  Operação: {task.operationType} ·{' '}
                  <span style={{ color: STATUS_COLOR[task.status], fontWeight: 600 }}>
                    {STATUS_LABEL[task.status]}
                  </span>
                </>
              }
              style={{ background: highlighted ? 'rgba(37, 99, 235, 0.06)' : '#fff', borderColor: highlighted ? '#2563eb' : '#e2e8f0' }}
              actions={
                <>
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
                </>
              }
            />
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
