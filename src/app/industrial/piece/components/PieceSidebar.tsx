import type { CSSProperties, ReactNode } from 'react';

import type { IndustrialSystemEvent } from '@/industrial/infra/supabase/events';
import type { PieceOperation } from '@/industrial/core/piece-operations/types';
import type { QualityInspection } from '@/industrial/core/quality/types';
import type { ReworkRequest } from '@/industrial/core/rework/types';
import type { TimeTrackingEntry } from '@/industrial/core/time-tracking/types';
import type { TrackingSnapshot } from '@/industrial/core/tracking/types';
import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';

import PieceWorkOrderTasks from './PieceWorkOrderTasks';

interface PieceSidebarProps {
  operations: PieceOperation[];
  events: IndustrialSystemEvent[];
  tracking: TrackingSnapshot | null;
  timeEntries: TimeTrackingEntry[];
  quality: QualityInspection[];
  rework: ReworkRequest[];
  workOrderTasks?: IndustrialWorkOrderTask[];
  workOrderTasksLoading?: boolean;
  workOrderTasksError?: string | null;
  saving?: boolean;
  onStartTime?: (operationId?: string) => void;
  onStopTime?: () => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#94a3b8' }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function ListItem({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <li style={{ listStyle: 'none', padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', fontSize: 12 }}>
      <div style={{ fontWeight: 600 }}>{primary}</div>
      {secondary ? <div style={{ color: '#94a3b8', marginTop: 2 }}>{secondary}</div> : null}
    </li>
  );
}

export default function PieceSidebar({
  operations,
  events,
  tracking,
  timeEntries,
  quality,
  rework,
  workOrderTasks = [],
  workOrderTasksLoading = false,
  workOrderTasksError,
  saving = false,
  onStartTime,
  onStopTime,
}: PieceSidebarProps) {
  const history = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const runningOp = operations.find((op) => op.status === 'running') ?? operations.find((op) => op.status === 'queued');
  const activeTime = timeEntries.find((entry) => !entry.stoppedAt);

  return (
    <aside
      style={{
        display: 'grid',
        gap: 14,
        alignContent: 'start',
        overflow: 'auto',
        maxHeight: 'calc(100vh - 240px)',
        paddingRight: 4,
      }}
    >
      <Section title="Operações">
        <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {operations.length
            ? operations.map((op) => (
                <ListItem
                  key={op.id}
                  primary={`${op.type.toUpperCase()} — ${op.status}`}
                  secondary={op.stationId ? `Estação ${op.stationId}` : undefined}
                />
              ))
            : <li style={{ fontSize: 12, color: '#94a3b8' }}>Sem operações.</li>}
        </ul>
      </Section>

      <Section title="Work Orders">
        <PieceWorkOrderTasks
          tasks={workOrderTasks}
          loading={workOrderTasksLoading}
          error={workOrderTasksError}
        />
      </Section>

      <Section title="Tracking">
        {tracking ? (
          <ListItem
            primary={`${tracking.completedTasks}/${tracking.totalTasks} tarefas`}
            secondary={`${tracking.progress.toFixed(0)}% — ${tracking.status}`}
          />
        ) : (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Sem ordem de trabalho ligada.</div>
        )}
      </Section>

      <Section title="Tempos">
        {onStartTime || onStopTime ? (
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {onStartTime ? (
              <button
                type="button"
                disabled={saving || !!activeTime}
                onClick={() => onStartTime(runningOp?.id)}
                style={actionBtnStyle}
              >
                Iniciar tempo
              </button>
            ) : null}
            {onStopTime ? (
              <button
                type="button"
                disabled={saving || !activeTime}
                onClick={onStopTime}
                style={actionBtnStyle}
              >
                Parar tempo
              </button>
            ) : null}
          </div>
        ) : null}
        <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {timeEntries.length
            ? timeEntries.map((entry) => (
                <ListItem
                  key={entry.id}
                  primary={entry.operationId ?? entry.stationId ?? 'Operação'}
                  secondary={
                    entry.durationMs
                      ? `${Math.round(entry.durationMs / 1000)}s`
                      : `Início ${new Date(entry.startedAt).toLocaleString('pt-PT')}`
                  }
                />
              ))
            : <li style={{ fontSize: 12, color: '#94a3b8' }}>Sem registos de tempo.</li>}
        </ul>
      </Section>

      <Section title="Qualidade">
        <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {quality.length
            ? quality.map((item) => (
                <ListItem key={item.id} primary={item.decision} secondary={item.reason ?? item.createdAt} />
              ))
            : <li style={{ fontSize: 12, color: '#94a3b8' }}>Sem inspecções.</li>}
        </ul>
      </Section>

      <Section title="Rework">
        <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {rework.length
            ? rework.map((item) => (
                <ListItem key={item.id} primary={item.status} secondary={item.reason} />
              ))
            : <li style={{ fontSize: 12, color: '#94a3b8' }}>Sem pedidos de rework.</li>}
        </ul>
      </Section>

      <Section title="Eventos">
        <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {events.length
            ? events.slice(0, 8).map((event) => (
                <ListItem
                  key={event.id}
                  primary={event.type}
                  secondary={new Date(event.created_at).toLocaleString('pt-PT')}
                />
              ))
            : <li style={{ fontSize: 12, color: '#94a3b8' }}>Sem eventos.</li>}
        </ul>
      </Section>

      <Section title="Histórico completo">
        <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {history.length
            ? history.map((event) => (
                <ListItem
                  key={`hist-${event.id}`}
                  primary={event.type}
                  secondary={`${new Date(event.created_at).toLocaleString('pt-PT')} · ${event.work_order_id ?? '—'}`}
                />
              ))
            : <li style={{ fontSize: 12, color: '#94a3b8' }}>Histórico vazio.</li>}
        </ul>
      </Section>
    </aside>
  );
}

const actionBtnStyle: CSSProperties = {
  padding: '5px 8px',
  fontSize: 11,
  borderRadius: 6,
  border: '1px solid var(--border, #334155)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--text-main, #f8fafc)',
  cursor: 'pointer',
};
