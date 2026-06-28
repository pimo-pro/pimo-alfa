import {
  industrialActionBtnStyle,
  industrialBtnStyle,
  industrialListItemStyle,
  industrialSectionTitleStyle,
} from '@/industrial/ui/layouts/industrialStyles';
import { STATION_LABELS } from '@/industrial/work-orders/types';

import type { UseOperatorPageReturnExtended } from '../hooks/useOperatorPage';
import OperatorLogPanel from './OperatorLogPanel';
import OperatorMessagesPanel from './OperatorMessagesPanel';

type Props = {
  state: UseOperatorPageReturnExtended;
};

export default function OperatorSessionPanel({ state }: Props) {
  return (
    <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
      <header>
        <h2 style={{ ...industrialSectionTitleStyle, marginBottom: 4 }}>Operador (Sessão Livre)</h2>
        <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
          Sessão: {state.operatorSession}
          {state.realtimeConnected ? ' · RTO live' : ''}
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={industrialListItemStyle}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Peças na sessão</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{state.sessionStats.pieceCount}</div>
        </div>
        <div style={industrialListItemStyle}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Operações executadas</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{state.sessionStats.operationCount}</div>
        </div>
      </div>

      <OperatorLogPanel entries={state.operationsLog} />

      <OperatorMessagesPanel messages={state.messages} />

      <section>
        <h3 style={{ ...industrialSectionTitleStyle, marginBottom: 8 }}>Work Orders</h3>
        <button
          type="button"
          disabled={state.loading || state.loadingWorkOrders}
          onClick={() => void state.loadAllWorkOrderPieces()}
          style={industrialActionBtnStyle}
        >
          {state.loadingWorkOrders ? 'A carregar…' : 'Carregar peças do Work Order'}
        </button>

        {state.workOrderSummaries.length > 0 ? (
          <ul style={{ margin: '10px 0 0', padding: 0, display: 'grid', gap: 6, maxHeight: 160, overflow: 'auto' }}>
            {state.workOrderSummaries.slice(0, 8).map((summary) => (
              <li key={summary.order.id} style={industrialListItemStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>
                      {STATION_LABELS[summary.order.station] ?? summary.order.station}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                      {summary.pieceCount} peça(s) · {summary.pendingCount} pendente(s)
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={state.loading}
                    onClick={() => void state.loadFromWorkOrder(summary.order.id)}
                    style={industrialBtnStyle(false)}
                  >
                    Carregar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b' }}>
            Nenhum work order activo atribuído.
          </p>
        )}
      </section>

      <button type="button" onClick={state.clearSession} style={industrialBtnStyle(false)}>
        Limpar sessão
      </button>
    </div>
  );
}
