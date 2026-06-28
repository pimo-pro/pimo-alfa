import { IndustrialThreeColumnLayout } from '@/industrial/ui/layouts/IndustrialThreeColumnLayout';

import OperatorOperationsPanel from './components/OperatorOperationsPanel';
import OperatorRail from './components/OperatorRail';
import OperatorSessionPanel from './components/OperatorSessionPanel';
import { useOperatorPage } from './hooks/useOperatorPage';

export default function IndustrialOperadorPage() {
  const state = useOperatorPage();

  return (
    <IndustrialThreeColumnLayout
      title="Operador Industrial"
      description={`Sessão livre · modo ${state.mode === 'single' ? 'individual' : 'lote'} · ${state.sessionStats.pieceCount} peça(s)${state.realtimeConnected ? ' · RTO live' : ''}`}
      sidebarOpen={false}
      leftLeft={<OperatorRail />}
      left={<OperatorSessionPanel state={state} />}
      right={<OperatorOperationsPanel state={state} />}
    />
  );
}
