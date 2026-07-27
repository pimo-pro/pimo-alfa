import type { ReactNode } from 'react';

import { getWorkOrderPieceDisplay } from '@/industrial/work-orders/resolveWorkOrderPiece';
import type { IndustrialWorkOrder, IndustrialWorkOrderTask } from '@/industrial/work-orders/types';
import {
  INDUSTRIAL_LIST_ITEM_CLASS,
  ensureIndustrialInteractionStyles,
  industrialListItemStyle,
  industrialSectionTitleStyle,
} from '@/industrial/ui/layouts/industrialStyles';

interface StationHistorySidebarProps {
  tasks: IndustrialWorkOrderTask[];
  orders: IndustrialWorkOrder[];
  eventLog: Array<{ id: string; type: string; at: string }>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <h3 style={industrialSectionTitleStyle}>{title}</h3>
      {children}
    </section>
  );
}

function taskProjectId(task: IndustrialWorkOrderTask, orders: IndustrialWorkOrder[]): string {
  return orders.find((order) => order.id === task.workOrderId)?.projectId ?? '';
}

export default function StationHistorySidebar({ tasks, orders, eventLog }: StationHistorySidebarProps) {
  ensureIndustrialInteractionStyles();
  const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'rejected');

  const renderTask = (task: IndustrialWorkOrderTask) => {
    const display = getWorkOrderPieceDisplay(task, taskProjectId(task, orders));
    return (
      <>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{display.fullIndustrialName}</div>
        <div style={{ color: '#94a3b8', marginTop: 2, fontSize: 10, fontFamily: 'monospace' }}>
          {display.nqrCode} · {task.status}
        </div>
      </>
    );
  };

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
      <Section title="Tarefas activas">
        <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {tasks
            .filter((t) => t.status === 'pending' || t.status === 'in_progress')
            .map((task, index) => (
              <li
                key={task.id}
                className={INDUSTRIAL_LIST_ITEM_CLASS}
                style={{ ...industrialListItemStyle, animationDelay: `${index * 30}ms` }}
              >
                {renderTask(task)}
              </li>
            ))}
        </ul>
      </Section>

      <Section title="Concluídas / Rejeitadas">
        <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {completed.length === 0 ? (
            <li style={{ fontSize: 12, color: '#94a3b8' }}>Sem histórico.</li>
          ) : (
            completed.slice(0, 12).map((task, index) => (
              <li
                key={task.id}
                className={INDUSTRIAL_LIST_ITEM_CLASS}
                style={{ ...industrialListItemStyle, animationDelay: `${index * 30}ms` }}
              >
                {renderTask(task)}
              </li>
            ))
          )}
        </ul>
      </Section>

      <Section title="Eventos">
        <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {eventLog.length === 0 ? (
            <li style={{ fontSize: 12, color: '#94a3b8' }}>Sem eventos registados.</li>
          ) : (
            eventLog.slice(0, 10).map((event, index) => (
              <li
                key={event.id}
                className={INDUSTRIAL_LIST_ITEM_CLASS}
                style={{ ...industrialListItemStyle, animationDelay: `${index * 30}ms` }}
              >
                <div style={{ fontWeight: 600 }}>{event.type}</div>
                <div style={{ color: '#94a3b8', marginTop: 2 }}>
                  {new Date(event.at).toLocaleString('pt-PT')}
                </div>
              </li>
            ))
          )}
        </ul>
      </Section>
    </aside>
  );
}
