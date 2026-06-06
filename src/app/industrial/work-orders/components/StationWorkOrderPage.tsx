import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/auth/useAuth';
import { parseBarcode } from '@/industrial/core/barcode/actions';
import {
  assignOperator,
  fetchStationTasks,
  fetchWorkOrders,
  finishTask,
  rejectTask,
  startTask,
} from '@/industrial/api/workOrderActions';
import { IndustrialLayout } from '@/industrial/ui/components';
import type { IndustrialStation, IndustrialWorkOrder, IndustrialWorkOrderTask } from '@/industrial/work-orders/types';
import { STATION_LABELS } from '@/industrial/work-orders/types';

import TaskExecutionList from './TaskExecutionList';

interface StationWorkOrderPageProps {
  station: IndustrialStation;
}

const STATUS_LABEL: Record<IndustrialWorkOrderTask['status'], string> = {
  pending: 'Pendente',
  in_progress: 'Em execução',
  completed: 'Concluído',
  rejected: 'Rejeitado',
};

export function StationWorkOrderContent({ station }: StationWorkOrderPageProps) {
  const { user } = useAuth();

  const [orders, setOrders] = useState<IndustrialWorkOrder[]>([]);
  const [tasks, setTasks] = useState<IndustrialWorkOrderTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [selectedTask, setSelectedTask] = useState<IndustrialWorkOrderTask | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRows, taskRows] = await Promise.all([
        fetchWorkOrders({ station }),
        fetchStationTasks(station),
      ]);
      setOrders(orderRows);
      setTasks(taskRows);
      setSelectedTask((current) => {
        if (!current) return null;
        return taskRows.find((t) => t.id === current.id) ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estação.');
    } finally {
      setLoading(false);
    }
  }, [station]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress'),
    [tasks],
  );

  const pieceIds = useMemo(() => Array.from(new Set(tasks.map((t) => t.pieceId))), [tasks]);
  const operationTypes = useMemo(() => Array.from(new Set(tasks.map((t) => t.operationType))), [tasks]);

  const resolveTaskFromCode = (raw: string): IndustrialWorkOrderTask | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const parsed = parseBarcode(trimmed);
    const pieceId = parsed?.entityType === 'piece' ? parsed.id : trimmed;

    return (
      activeTasks.find((t) => t.pieceId === pieceId) ??
      activeTasks.find((t) => t.pieceId.includes(pieceId) || pieceId.includes(t.pieceId)) ??
      null
    );
  };

  const handleCodeSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const match = resolveTaskFromCode(codeInput);
    if (!match) {
      setError('Nenhuma tarefa activa encontrada para este código nesta estação.');
      return;
    }
    setSelectedTask(match);
    if (user?.id) {
      void assignOperator(match.id, user.id).catch(() => undefined);
    }
  };

  const handleConfirmExecution = async () => {
    if (!selectedTask) {
      setError('Seleccione uma tarefa via QR/código antes de confirmar.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await finishTask(selectedTask.id, user?.id);
      setCodeInput('');
      setSelectedTask(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao confirmar execução.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTask) return;
    setBusy(true);
    setError(null);
    try {
      await rejectTask(selectedTask.id, 'Rejeitado na estação', user?.id);
      setCodeInput('');
      setSelectedTask(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao rejeitar tarefa.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
        <section
          style={{
            padding: 16,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            background: '#fff',
            display: 'grid',
            gap: 12,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14 }}>QR / Código</h3>
          <form onSubmit={handleCodeSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="PC-piece-id ou código QR"
              style={{
                flex: 1,
                minWidth: 220,
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: 'none',
                background: '#334155',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Localizar peça
            </button>
          </form>

          {selectedTask ? (
            <div
              style={{
                padding: 12,
                borderRadius: 6,
                background: 'rgba(37, 99, 235, 0.08)',
                fontSize: 13,
              }}
            >
              <div>
                <strong>Peça:</strong> {selectedTask.pieceId}
              </div>
              <div>
                <strong>Operação:</strong> {selectedTask.operationType}
              </div>
              <div>
                <strong>Estado:</strong> {STATUS_LABEL[selectedTask.status]}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              Leia ou cole o código da peça para seleccionar a tarefa.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={!selectedTask || busy}
              onClick={() => void handleConfirmExecution()}
              style={{
                padding: '10px 18px',
                borderRadius: 6,
                border: 'none',
                background: '#16a34a',
                color: '#fff',
                fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer',
                opacity: !selectedTask ? 0.5 : 1,
              }}
            >
              Confirmar execução
            </button>
            <button
              type="button"
              disabled={!selectedTask || busy}
              onClick={() => void handleReject()}
              style={{
                padding: '10px 18px',
                borderRadius: 6,
                border: '1px solid #fca5a5',
                background: '#fff',
                color: '#dc2626',
                cursor: busy ? 'wait' : 'pointer',
                opacity: !selectedTask ? 0.5 : 1,
              }}
            >
              Rejeitar
            </button>
          </div>
        </section>

        {error ? <p style={{ margin: 0, color: '#dc2626' }}>{error}</p> : null}
        {loading ? <p style={{ color: '#64748b' }}>A carregar…</p> : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <section style={listSectionStyle}>
            <h3 style={sectionTitleStyle}>Peças ({pieceIds.length})</h3>
            <ul style={listStyle}>
              {pieceIds.length === 0 ? (
                <li style={emptyStyle}>Sem peças</li>
              ) : (
                pieceIds.map((id) => (
                  <li key={id} style={listItemStyle}>
                    <Link to={`/industrial/piece/${id}`} style={{ color: '#2563eb' }}>
                      {id}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section style={listSectionStyle}>
            <h3 style={sectionTitleStyle}>Operações ({operationTypes.length})</h3>
            <ul style={listStyle}>
              {operationTypes.length === 0 ? (
                <li style={emptyStyle}>Sem operações</li>
              ) : (
                operationTypes.map((op) => (
                  <li key={op} style={listItemStyle}>
                    {op}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section style={listSectionStyle}>
            <h3 style={sectionTitleStyle}>Ordens ({orders.length})</h3>
            <ul style={listStyle}>
              {orders.length === 0 ? (
                <li style={emptyStyle}>Sem ordens</li>
              ) : (
                orders.map((order) => (
                  <li key={order.id} style={listItemStyle}>
                    <Link to={`/industrial/work-orders/order/${order.id}`} style={{ color: '#2563eb' }}>
                      {order.projectId}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        <section style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Tarefas activas ({activeTasks.length})</h3>
          <TaskExecutionList
            tasks={activeTasks}
            busyTaskId={busy ? selectedTask?.id : null}
            highlightPieceId={selectedTask?.pieceId ?? null}
            onStart={(task) => {
              setSelectedTask(task);
              void startTask(task.id, user?.id).then(() => reload());
            }}
            onComplete={(task) => {
              setSelectedTask(task);
              void finishTask(task.id, user?.id).then(() => reload());
            }}
            onReject={(task) => {
              setSelectedTask(task);
              void rejectTask(task.id, 'Rejeitado manualmente', user?.id).then(() => reload());
            }}
          />
        </section>
    </div>
  );
}

export default function StationWorkOrderPage({ station }: StationWorkOrderPageProps) {
  return (
    <IndustrialLayout
      title={`Work Orders · ${STATION_LABELS[station]}`}
      description="Lista de tarefas, leitura QR e confirmação de execução."
    >
      <div style={{ marginBottom: 12 }}>
        <Link to="/industrial/work-orders" style={{ fontSize: 13, color: '#2563eb' }}>
          ← Voltar à lista geral
        </Link>
      </div>
      <StationWorkOrderContent station={station} />
    </IndustrialLayout>
  );
}

const listSectionStyle = {
  padding: 14,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#fff',
} as const;

const sectionTitleStyle = { margin: '0 0 8px', fontSize: 13, fontWeight: 600 } as const;
const listStyle = { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 } as const;
const listItemStyle = { fontSize: 12, padding: '4px 0' } as const;
const emptyStyle = { fontSize: 12, color: '#94a3b8' } as const;
