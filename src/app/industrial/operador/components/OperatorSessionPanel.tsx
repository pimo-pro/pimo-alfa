import type { CSSProperties } from 'react';

import {
  INDUSTRIAL_LIST_ITEM_CLASS,
  INDUSTRIAL_PANEL_MOTION_CLASS,
  INDUSTRIAL_VISION_ACTIVE_CLASS,
  INDUSTRIAL_VISION_SECONDARY_CLASS,
  ensureIndustrialInteractionStyles,
  industrialActionBtnStyle,
  industrialBtnStyle,
  industrialListItemStyle,
  industrialPanelDepthStyle,
  industrialSectionTitleStyle,
  industrialVisionActiveStyle,
  industrialVisionSecondaryStyle,
} from '@/industrial/ui/layouts/industrialStyles';
import { STATION_LABELS } from '@/industrial/work-orders/types';

import type { UseOperatorPageReturnExtended } from '../hooks/useOperatorPage';
import OperatorLogPanel from './OperatorLogPanel';
import OperatorMessagesPanel from './OperatorMessagesPanel';

/**
 * Painel operacional da sessão do operador:
 * sessão, QR/peça activa, stats reais, log, mensagens e ordens de trabalho.
 * Sem engines/scores/timelines decorativos.
 */

type Props = {
  state: UseOperatorPageReturnExtended;
};

function chipStyle(active: boolean, color?: string): CSSProperties {
  return {
    padding: '4px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1.5,
    border: `1px solid ${active ? color ?? 'rgba(59,130,246,0.55)' : 'var(--border, #334155)'}`,
    background: active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
    color: active ? '#f1f5f9' : '#a3b2c2',
    boxShadow: active ? `0 0 0 2px ${color ?? 'rgba(59,130,246,0.45)'}` : undefined,
    opacity: active ? 1 : 0.85,
    transition: 'all 140ms ease-out',
  };
}

export default function OperatorSessionPanel({ state }: Props) {
  ensureIndustrialInteractionStyles();
  const hasPieces = state.sessionStats.pieceCount > 0;
  const activePiece =
    state.pieces.find((p) => p.pieceId === state.selectedPieceId) ??
    state.pieces.find((p) => p.selected) ??
    null;
  const qrVisual: 'válido' | 'inválido' | 'pendente' = state.error
    ? 'inválido'
    : activePiece || state.codeInput.trim()
      ? activePiece
        ? 'válido'
        : 'pendente'
      : 'pendente';
  const qrColor = qrVisual === 'válido' ? '#16a34a' : qrVisual === 'inválido' ? '#f87171' : '#f59e0b';
  const activeTask =
    activePiece?.tasks?.find((t) => t.status === 'in_progress') ?? activePiece?.tasks?.[0] ?? null;
  const dataReady = hasPieces || state.workOrderSummaries.length > 0;

  return (
    <div
      className={INDUSTRIAL_PANEL_MOTION_CLASS}
      style={{
        display: 'grid',
        gap: 14,
        alignContent: 'start',
        color: '#f1f5f9',
        lineHeight: 1.5,
        ...industrialPanelDepthStyle,
        borderRadius: 8,
        padding: 8,
      }}
    >
      <header className={INDUSTRIAL_VISION_ACTIVE_CLASS} style={industrialVisionActiveStyle}>
        <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }}>
          Operador · Sessão livre
        </h2>
        <p style={{ margin: '10px 0 0', fontSize: 12, fontWeight: 400, color: '#a3b2c2', lineHeight: 1.5 }}>
          Sessão: {state.operatorSession}
          {state.realtimeConnected ? ' · RTO live' : ''}
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gap: 8,
          borderLeft: `2px solid ${qrColor}`,
          paddingLeft: 8,
          ...(qrVisual === 'válido' ? industrialVisionActiveStyle : industrialVisionSecondaryStyle),
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <h3 style={industrialSectionTitleStyle}>QR activo</h3>
          <span style={chipStyle(true, qrColor)}>QR {qrVisual}</span>
        </div>
        <div style={{ fontSize: 12, color: '#f1f5f9', fontFamily: 'monospace' }}>
          {activePiece?.qrPayload || state.codeInput.trim() || activePiece?.pieceId || '— sem código —'}
        </div>
        {activePiece ? (
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>
            Peça actual: {activePiece.pieceId}
            {activePiece.pieceName ? ` · ${activePiece.pieceName}` : ''}
            {activeTask ? ` · ${activeTask.operationType} · ${activeTask.status}` : ''}
            {state.executingOperation ? ` · a executar ${state.executingOperation}` : ''}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#a3b2c2' }}>Nenhuma peça seleccionada</div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span style={chipStyle(dataReady, '#16a34a')}>
          {dataReady ? 'dados carregados' : 'dados pendentes'}
        </span>
        {state.executingOperation ? (
          <span style={chipStyle(true, '#38bdf8')}>em execução</span>
        ) : null}
        {state.realtimeConnected ? <span style={chipStyle(true, '#38bdf8')}>RTO live</span> : null}
      </div>

      <div
        className={hasPieces ? INDUSTRIAL_VISION_ACTIVE_CLASS : INDUSTRIAL_VISION_SECONDARY_CLASS}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          ...(hasPieces ? industrialVisionActiveStyle : industrialVisionSecondaryStyle),
        }}
      >
        <div style={industrialListItemStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#a3b2c2', textTransform: 'uppercase', lineHeight: 1.5 }}>
            Peças na sessão
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{state.sessionStats.pieceCount}</div>
        </div>
        <div style={industrialListItemStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#a3b2c2', textTransform: 'uppercase', lineHeight: 1.5 }}>
            Operações executadas
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{state.sessionStats.operationCount}</div>
        </div>
      </div>

      <OperatorLogPanel entries={state.operationsLog} />

      <OperatorMessagesPanel messages={state.messages} />

      <section
        className={
          state.workOrderSummaries.length > 0 ? INDUSTRIAL_VISION_ACTIVE_CLASS : INDUSTRIAL_VISION_SECONDARY_CLASS
        }
        style={
          state.workOrderSummaries.length > 0 ? industrialVisionActiveStyle : industrialVisionSecondaryStyle
        }
      >
        <h3 style={{ ...industrialSectionTitleStyle, marginBottom: 8 }}>Ordens de trabalho</h3>
        <button
          type="button"
          disabled={state.loading || state.loadingWorkOrders}
          onClick={() => void state.loadAllWorkOrderPieces()}
          style={industrialActionBtnStyle}
        >
          {state.loadingWorkOrders ? 'A carregar…' : 'Carregar peças da ordem'}
        </button>

        {state.workOrderSummaries.length > 0 ? (
          <ul style={{ margin: '10px 0 0', padding: 0, display: 'grid', gap: 6, maxHeight: 160, overflow: 'auto' }}>
            {state.workOrderSummaries.slice(0, 8).map((summary, index) => (
              <li
                key={summary.order.id}
                className={INDUSTRIAL_LIST_ITEM_CLASS}
                style={{ ...industrialListItemStyle, animationDelay: `${index * 30}ms` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }}>
                      {STATION_LABELS[summary.order.station] ?? summary.order.station}
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                      {summary.pieceCount} peça(s) · {summary.pendingCount} pendente(s)
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={state.loading}
                    onClick={() => void state.loadFromWorkOrder(summary.order.id)}
                    style={{
                      ...industrialBtnStyle(false),
                      opacity: state.loading ? 0.4 : 1,
                    }}
                  >
                    Carregar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: '10px 0 0', fontSize: 12, fontWeight: 400, color: '#a3b2c2', lineHeight: 1.5 }}>
            Nenhuma ordem de trabalho activa atribuída.
          </p>
        )}
      </section>

      {state.error ? <p style={{ margin: 0, color: '#f87171', fontSize: 12 }}>{state.error}</p> : null}

      <button type="button" onClick={state.clearSession} style={industrialBtnStyle(false)}>
        Limpar sessão
      </button>
    </div>
  );
}
