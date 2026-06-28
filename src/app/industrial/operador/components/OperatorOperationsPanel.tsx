import { industrialPanelStyle } from '@/industrial/ui/layouts/industrialStyles';

import type { UseOperatorPageReturnExtended } from '../hooks/useOperatorPage';
import OperatorCodeInput from './OperatorCodeInput';
import OperatorOperationsGrid from './OperatorOperationsGrid';
import OperatorPiecesTable from './OperatorPiecesTable';
import OperatorViewerPanel from './OperatorViewerPanel';

type Props = {
  state: UseOperatorPageReturnExtended;
};

export default function OperatorOperationsPanel({ state }: Props) {
  const activePiece =
    state.mode === 'single'
      ? state.pieces.find((row) => row.pieceId === state.selectedPieceId) ??
        (state.pieces.length === 1 ? state.pieces[0]! : null)
      : null;

  return (
    <div style={{ display: 'grid', gap: 16, minHeight: 0 }}>
      {state.error ? (
        <div
          style={{
            ...industrialPanelStyle,
            borderColor: '#7f1d1d',
            background: 'rgba(127, 29, 29, 0.25)',
            color: '#fecaca',
            fontSize: 12,
          }}
        >
          {state.error}
        </div>
      ) : null}

      <div style={industrialPanelStyle}>
        <OperatorCodeInput state={state} />
      </div>

      <div style={industrialPanelStyle}>
        <OperatorPiecesTable state={state} />
      </div>

      <div style={industrialPanelStyle}>
        <OperatorOperationsGrid state={state} />
      </div>

      {state.mode === 'single' ? <OperatorViewerPanel piece={activePiece} /> : null}
    </div>
  );
}
