import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '@/auth/useAuth';
import { fetchWorkOrderDetail, finishTask, rejectTask, startTask } from '@/industrial/api/workOrderActions';
import { IndustrialLayout, useIndustrialPageState } from '@/industrial/ui/components';
import type { IndustrialWorkOrder, IndustrialWorkOrderTask } from '@/industrial/work-orders/types';
import { STATION_LABELS } from '@/industrial/work-orders/types';

import QrScannerPanel from './components/QrScannerPanel';
import TaskExecutionList from './components/TaskExecutionList';

export default function WorkOrderExecutionPage() {
  useIndustrialPageState();
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const { user } = useAuth();

  const [order, setOrder] = useState<IndustrialWorkOrder | null>(null);
  const [tasks, setTasks] = useState<IndustrialWorkOrderTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [highlightPieceId, setHighlightPieceId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchWorkOrderDetail(workOrderId);
      setOrder(detail.order);
      setTasks(detail.tasks);
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

  const runTaskAction = async (
    task: IndustrialWorkOrderTask,
    action: 'start' | 'complete' | 'reject',
  ) => {
    setBusyTaskId(task.id);
    setError(null);
    try {
      if (action === 'start') await startTask(task.id, user?.id);
      else if (action === 'complete') await finishTask(task.id, user?.id);
      else await rejectTask(task.id, 'Rejeitado na ordem', user?.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na execução da tarefa.');
    } finally {
      setBusyTaskId(null);
    }
  };

  if (!workOrderId) {
    return (
      <IndustrialLayout title="Ordem de trabalho" description="Identificador em falta.">
        <p>Ordem inválida.</p>
      </IndustrialLayout>
    );
  }

  return (
    <IndustrialLayout
      title={order ? `Ordem · ${STATION_LABELS[order.station]}` : 'Ordem de trabalho'}
      description={order ? `Projeto ${order.projectId} · Estado ${order.status}` : 'Execução operacional'}
    >
      <div style={{ marginBottom: 12 }}>
        <Link to="/industrial/work-orders" style={{ fontSize: 13, color: '#2563eb' }}>
          ← Voltar à lista
        </Link>
      </div>

      {loading ? <p style={{ color: '#64748b' }}>A carregar…</p> : null}
      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

      {order ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <section style={{ display: 'grid', gap: 6, fontSize: 13, color: '#475569' }}>
            <div>Peças: {order.pieceIds.length}</div>
            <div>Operações: {order.operationTypes.join(', ')}</div>
          </section>

          <QrScannerPanel onPieceScanned={setHighlightPieceId} />

          <TaskExecutionList
            tasks={tasks}
            busyTaskId={busyTaskId}
            highlightPieceId={highlightPieceId}
            onStart={(task) => void runTaskAction(task, 'start')}
            onComplete={(task) => void runTaskAction(task, 'complete')}
            onReject={(task) => void runTaskAction(task, 'reject')}
          />
        </div>
      ) : null}
    </IndustrialLayout>
  );
}
