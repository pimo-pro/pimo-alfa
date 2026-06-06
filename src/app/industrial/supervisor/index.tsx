import { IndustrialThreeColumnLayout } from '@/industrial/ui/layouts/IndustrialThreeColumnLayout';

import SupervisorDetailModal from './components/SupervisorDetailModal';
import SupervisorFiltersPanel from './components/SupervisorFiltersPanel';
import SupervisorKpiPanel from './components/SupervisorKpiPanel';
import SupervisorMainArea from './components/SupervisorMainArea';
import SupervisorRail from './components/SupervisorRail';
import { useSupervisorDashboard } from './hooks/useSupervisorDashboard';

export default function IndustrialSupervisorDashboardPage() {
  const state = useSupervisorDashboard();

  if (state.loading && !state.snapshot) {
    return (
      <IndustrialThreeColumnLayout
        title="Supervisor Industrial"
        description="A carregar KPIs e filas operacionais…"
        sidebarOpen={false}
        leftLeft={<div />}
        left={<div style={{ color: '#94a3b8', fontSize: 13 }}>A carregar…</div>}
        right={<div />}
      />
    );
  }

  return (
    <>
      <IndustrialThreeColumnLayout
        title="Supervisor Industrial"
        description={
          state.error ??
          `Design C · ${state.snapshot?.tasks.length ?? 0} tarefas · ${state.realtimeConnected ? 'RTO live · ' : ''}actualizado ${state.snapshot ? new Date(state.snapshot.loadedAt).toLocaleTimeString('pt-PT') : '—'}`
        }
        sidebarOpen
        leftLeft={
          <SupervisorRail
            activeView={state.railView}
            onSelect={state.selectRail}
            alertCount={state.alerts.length}
          />
        }
        history={<SupervisorFiltersPanel snapshot={state.snapshot} state={state} />}
        left={<SupervisorKpiPanel snapshot={state.snapshot} state={state} />}
        right={<SupervisorMainArea state={state} />}
      />

      {state.detailModal ? (
        <SupervisorDetailModal
          title={state.detailModal.title}
          body={state.detailModal.body}
          onClose={() => state.setDetailModal(null)}
        />
      ) : null}
    </>
  );
}
