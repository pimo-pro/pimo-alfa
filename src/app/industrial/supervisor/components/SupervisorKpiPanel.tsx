import { industrialSectionTitleStyle } from '@/industrial/ui/layouts/industrialStyles';
import { useRealtimeKpis } from '@/industrial/realtime';
import { taskPieceDisplay } from '@/industrial/persistence/supervisor/supervisorTaskDisplay';
import { STATION_LABELS } from '@/industrial/work-orders/types';
import type { SupervisorDashboardSnapshot } from '@/industrial/persistence/supervisor/types';

import type { UseSupervisorDashboardReturn } from '../hooks/useSupervisorDashboard';

interface SupervisorKpiPanelProps {
  snapshot: SupervisorDashboardSnapshot | null;
  state: UseSupervisorDashboardReturn;
}

function KpiBlock({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border, #334155)',
      }}
    >
      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {hint ? <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

export default function SupervisorKpiPanel({ snapshot, state }: SupervisorKpiPanelProps) {
  const liveKpis = useRealtimeKpis(snapshot);
  const productionPending = liveKpis.productionPending;
  const productionRunning = liveKpis.productionRunning;
  const selected = state.selectedTask;
  const selectedDisplay =
    selected && snapshot ? taskPieceDisplay(selected, snapshot.orders) : null;
  const stationStatuses = state.stationStatuses;

  return (
    <section style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
        KPIs Operacionais{state.realtimeConnected ? ' · live' : ''}
      </h2>

      <div style={{ display: 'grid', gap: 8 }}>
        <h3 style={industrialSectionTitleStyle}>Produção</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <KpiBlock label="Pendentes" value={productionPending} />
          <KpiBlock label="Em execução" value={productionRunning} />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <h3 style={industrialSectionTitleStyle}>Qualidade</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <KpiBlock label="Taxa rejeição" value={`${liveKpis.rejectionRatePct}%`} />
          <KpiBlock label="Rework" value={liveKpis.reworkEvents} />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <h3 style={industrialSectionTitleStyle}>Tempo</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <KpiBlock label="Sessões activas" value={liveKpis.activeSessions} />
          <KpiBlock label="Atrasos" value={liveKpis.delayedTasks} />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <h3 style={industrialSectionTitleStyle}>Por estação (pend / exec / ok)</h3>
        {(snapshot?.stationKpis ?? []).map((kpi) => {
          const load = liveKpis.stationLoad[kpi.station];
          const online = stationStatuses?.[kpi.station];
          return (
            <div key={kpi.station} style={{ fontSize: 12, color: '#cbd5e1' }}>
              {STATION_LABELS[kpi.station]}
              {online !== undefined ? (online ? ' · online' : ' · offline') : ''}: {load?.pending ?? kpi.pending} /{' '}
              {load?.inProgress ?? kpi.inProgress} / {kpi.completed}
              {load ? ` · carga ${load.loadPct}%` : ''}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <h3 style={industrialSectionTitleStyle}>Operadores</h3>
        {(snapshot?.operatorKpis ?? []).slice(0, 5).map((op) => (
          <div key={op.operatorId} style={{ fontSize: 12, color: '#cbd5e1' }}>
            {op.operatorId}: {op.completed} ok · {op.errors} erros
          </div>
        ))}
      </div>

      {selected && selectedDisplay ? (
        <div style={{ display: 'grid', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border, #334155)' }}>
          <h3 style={industrialSectionTitleStyle}>Selecção actual</h3>
          <dl style={{ margin: 0, fontSize: 12, display: 'grid', gap: 4 }}>
            <div><dt style={{ color: '#94a3b8' }}>Nome industrial</dt><dd style={{ margin: 0 }}>{selectedDisplay.fullIndustrialName}</dd></div>
            <div><dt style={{ color: '#94a3b8' }}>NQR</dt><dd style={{ margin: 0, fontFamily: 'monospace' }}>{selectedDisplay.nqrCode}</dd></div>
            <div><dt style={{ color: '#94a3b8' }}>Projecto</dt><dd style={{ margin: 0 }}>{selectedDisplay.projectCode}</dd></div>
            <div><dt style={{ color: '#94a3b8' }}>Caixa</dt><dd style={{ margin: 0 }}>{selectedDisplay.boxCode}</dd></div>
            <div><dt style={{ color: '#94a3b8' }}>Peça</dt><dd style={{ margin: 0 }}>{selectedDisplay.pieceCode}</dd></div>
            <div><dt style={{ color: '#94a3b8' }}>Operação</dt><dd style={{ margin: 0 }}>{selected.operationType}</dd></div>
            <div><dt style={{ color: '#94a3b8' }}>Estado</dt><dd style={{ margin: 0 }}>{selected.status}</dd></div>
            <div><dt style={{ color: '#94a3b8' }}>Operador</dt><dd style={{ margin: 0 }}>{selected.operatorId ?? '—'}</dd></div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
