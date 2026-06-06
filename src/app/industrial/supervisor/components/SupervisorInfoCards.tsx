import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import IndustrialSpriteIcon from '@/components/icons/IndustrialSpriteIcon';
import { industrialCanvasShellStyle } from '@/industrial/ui/layouts/industrialStyles';
import { STATION_LABELS } from '@/industrial/work-orders/types';

import type { UseSupervisorDashboardReturn } from '../hooks/useSupervisorDashboard';

interface SupervisorInfoCardsProps {
  state: UseSupervisorDashboardReturn;
}

function Card({
  title,
  children,
  onClick,
}: {
  title: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <article
      onClick={onClick}
      onKeyDown={() => undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        padding: 14,
        borderRadius: 8,
        border: '1px solid var(--border, #334155)',
        background: 'rgba(255,255,255,0.04)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>{title}</h4>
      {children}
    </article>
  );
}

export default function SupervisorInfoCards({ state }: SupervisorInfoCardsProps) {
  const snapshot = state.snapshot;
  if (!snapshot) {
    return <div style={industrialCanvasShellStyle}>A carregar cartões…</div>;
  }

  return (
    <div
      style={{
        ...industrialCanvasShellStyle,
        height: 'auto',
        minHeight: 480,
        padding: 16,
        overflow: 'auto',
        display: 'grid',
        gap: 12,
        alignContent: 'start',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IndustrialSpriteIcon name="industrial-info" size={16} />
        <h3 style={{ margin: 0, fontSize: 14 }}>Informação operacional</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {snapshot.stationKpis.map((kpi) => (
          <Card
            key={kpi.station}
            title={`Estação · ${STATION_LABELS[kpi.station]}`}
            onClick={() => {
              state.setSelectedStation(kpi.station);
              state.openDetail(
                STATION_LABELS[kpi.station],
                `Pendentes ${kpi.pending} · Execução ${kpi.inProgress} · Concluídas ${kpi.completed} · Rejeitadas ${kpi.rejected}`,
              );
            }}
          >
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {kpi.pending} pend · {kpi.inProgress} exec · {kpi.completed} ok · {kpi.rejected} rej
            </div>
            <Link
              to={`/industrial/work-orders/${kpi.station}`}
              style={{ fontSize: 11, color: '#60a5fa', marginTop: 8, display: 'inline-block' }}
              onClick={(e) => e.stopPropagation()}
            >
              Abrir estação
            </Link>
          </Card>
        ))}

        {snapshot.projectKpis.map((project) => (
          <Card
            key={project.projectId}
            title={`Projeto · ${project.projectId}`}
            onClick={() => state.setSelectedProjectId(project.projectId)}
          >
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Progresso {project.progressPct}%</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Críticas: {project.criticalPieces.join(', ') || '—'}
            </div>
          </Card>
        ))}

        {state.alerts.slice(0, 6).map((alert) => (
          <Card
            key={alert.id}
            title={alert.title}
            onClick={() => state.openDetail(alert.title, alert.message)}
          >
            <div style={{ fontSize: 12, color: alert.level === 'success' ? '#4ade80' : '#94a3b8' }}>{alert.message}</div>
          </Card>
        ))}
      </div>

      <section>
        <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>Tarefas filtradas</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
              <th style={{ padding: 6 }}>Peça</th>
              <th style={{ padding: 6 }}>Operação</th>
              <th style={{ padding: 6 }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {state.filteredTasks.slice(0, 20).map((task) => (
              <tr
                key={task.id}
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                onClick={() => state.setSelectedTaskId(task.id)}
              >
                <td style={{ padding: 6 }}>
                  <Link to={`/industrial/piece/${task.pieceId}`} style={{ color: '#60a5fa' }} onClick={(e) => e.stopPropagation()}>
                    {task.pieceId}
                  </Link>
                </td>
                <td style={{ padding: 6 }}>{task.operationType}</td>
                <td style={{ padding: 6 }}>{task.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
