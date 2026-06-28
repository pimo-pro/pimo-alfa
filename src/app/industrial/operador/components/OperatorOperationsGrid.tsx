import {
  industrialBtnStyle,
  industrialSectionTitleStyle,
} from '@/industrial/ui/layouts/industrialStyles';
import { PROJETOS_PIECE_OPERATIONS } from '@/industrial/integration/projetos/types';
import { resolveOperationUiStatus } from '@/industrial/operador/operationMapping';

import type { UseOperatorPageReturnExtended } from '../hooks/useOperatorPage';

type Props = {
  state: UseOperatorPageReturnExtended;
};

const STATUS_COLOR: Record<string, string> = {
  idle: 'rgba(255,255,255,0.04)',
  queued: 'rgba(234, 179, 8, 0.2)',
  running: 'rgba(59, 130, 246, 0.25)',
  done: 'rgba(22, 163, 74, 0.25)',
};

export default function OperatorOperationsGrid({ state }: Props) {
  const targetCount =
    state.mode === 'batch'
      ? state.selectedPieceIds.length || state.pieces.length
      : state.selectedPieceId
        ? 1
        : state.pieces.length === 1
          ? 1
          : 0;

  const referencePiece =
    state.mode === 'single'
      ? state.pieces.find((row) => row.pieceId === state.selectedPieceId) ?? state.pieces[0] ?? null
      : null;

  return (
    <section>
      <h3 style={{ ...industrialSectionTitleStyle, marginBottom: 8 }}>Operações industriais</h3>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: '#64748b' }}>
        {state.mode === 'batch'
          ? `${targetCount} peça(s) alvo · clique esquerdo = início · clique direito = concluir`
          : 'Modo individual · clique esquerdo = início · clique direito = concluir'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
        {PROJETOS_PIECE_OPERATIONS.map((operation) => {
          const uiStatus = referencePiece
            ? resolveOperationUiStatus(referencePiece.operations, referencePiece.tasks, operation.id)
            : 'idle';

          return (
            <button
              key={operation.id}
              type="button"
              disabled={state.loading || targetCount === 0 || state.executingOperation !== null}
              onClick={() => void state.executeOperation(operation.id, uiStatus === 'running' ? 'complete' : 'start')}
              onContextMenu={(event) => {
                event.preventDefault();
                void state.executeOperation(operation.id, 'complete');
              }}
              title={`${operation.label} · ${uiStatus}`}
              style={{
                ...industrialBtnStyle(state.executingOperation === operation.id),
                minHeight: 48,
                fontWeight: 700,
                letterSpacing: 0.4,
                background: STATUS_COLOR[uiStatus] ?? STATUS_COLOR.idle,
                display: 'grid',
                gap: 2,
                alignContent: 'center',
              }}
            >
              <span>{operation.label}</span>
              {referencePiece ? (
                <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.85, textTransform: 'uppercase' }}>
                  {uiStatus}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {targetCount > 0 ? (
        <p style={{ margin: '10px 0 0', fontSize: 10, color: '#64748b' }}>
          Registo em industrial_piece_operations, industrial_piece_time_entries e industrial_work_order_events.
        </p>
      ) : null}
    </section>
  );
}
