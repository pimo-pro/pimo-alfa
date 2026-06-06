import type { CSSProperties } from 'react';

import type { PieceOperation } from '@/industrial/core/piece-operations/types';
import type { IndustrialPiece } from '@/industrial/core/pieces/types';
import type { QualityInspection } from '@/industrial/core/quality/types';
import type { TimeTrackingEntry } from '@/industrial/core/time-tracking/types';
import type { TrackingAction } from '@/industrial/persistence/tracking/updateTrackingState';
import type { QualityDecision } from '@/industrial/core/quality/types';
import type { PieceToolMode } from '../types';
import PieceLabel from './PieceLabel';

interface PieceControlPanelProps {
  piece: IndustrialPiece;
  operations: PieceOperation[];
  quality: QualityInspection[];
  timeEntries: TimeTrackingEntry[];
  qrPayload: string;
  projectName?: string;
  boxName?: string;
  toolMode: PieceToolMode;
  snapEnabled: boolean;
  saving?: boolean;
  selectedLabel?: string;
  onToolMode: (mode: PieceToolMode) => void;
  onToggleSnap: () => void;
  onReload: () => void;
  onResetTransform: () => void;
  onSavePosition?: () => void;
  onSaveRotation?: () => void;
  onSaveSelectedPart?: () => void;
  onTrackingAction?: (operationId: string, action: TrackingAction, reason?: string) => void;
  onQualityDecision?: (decision: QualityDecision, reason?: string) => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

function currentOperation(operations: PieceOperation[]): PieceOperation | undefined {
  return operations.find((op) => op.status === 'running') ?? operations.find((op) => op.status === 'queued');
}

function nextOperation(operations: PieceOperation[]): PieceOperation | undefined {
  const current = currentOperation(operations);
  if (!current) return undefined;
  const index = operations.findIndex((op) => op.id === current.id);
  return operations[index + 1];
}

function activeTimeEntry(entries: TimeTrackingEntry[]): TimeTrackingEntry | undefined {
  return entries.find((entry) => !entry.stoppedAt);
}

function latestQuality(quality: QualityInspection[]): QualityInspection | undefined {
  return quality[0];
}

export default function PieceControlPanel({
  piece,
  operations,
  quality,
  timeEntries,
  qrPayload,
  projectName,
  boxName,
  toolMode,
  snapEnabled,
  saving = false,
  selectedLabel,
  onToolMode,
  onToggleSnap,
  onReload,
  onResetTransform,
  onSavePosition,
  onSaveRotation,
  onSaveSelectedPart,
  onTrackingAction,
  onQualityDecision,
  onToggleSidebar,
  sidebarOpen = true,
}: PieceControlPanelProps) {
  const current = currentOperation(operations);
  const next = nextOperation(operations);
  const activeTime = activeTimeEntry(timeEntries);
  const latestQ = latestQuality(quality);

  return (
    <section style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Controlo da peça</h2>
        {selectedLabel ? (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Seleccionado: {selectedLabel}</div>
        ) : null}
        {saving ? <div style={{ fontSize: 11, color: '#38bdf8' }}>A guardar…</div> : null}
      </div>

      <dl style={{ margin: 0, display: 'grid', gap: 6, fontSize: 12 }}>
        <div><dt style={{ color: '#94a3b8' }}>Dimensões (W×H×D)</dt><dd style={{ margin: 0 }}>{piece.dimensions.widthMm} × {piece.dimensions.heightMm} × {piece.dimensions.thicknessMm} mm</dd></div>
        <div><dt style={{ color: '#94a3b8' }}>Material</dt><dd style={{ margin: 0 }}>{piece.material ?? '—'}</dd></div>
        <div><dt style={{ color: '#94a3b8' }}>Tipo</dt><dd style={{ margin: 0 }}>{String(piece.metadata?.tipo ?? piece.metadata?.panelId ?? 'Painel')}</dd></div>
        <div><dt style={{ color: '#94a3b8' }}>Estado</dt><dd style={{ margin: 0 }}>{piece.status}</dd></div>
        <div><dt style={{ color: '#94a3b8' }}>Operação actual</dt><dd style={{ margin: 0 }}>{current ? `${current.type} (${current.status})` : '—'}</dd></div>
        <div><dt style={{ color: '#94a3b8' }}>Operação seguinte</dt><dd style={{ margin: 0 }}>{next ? `${next.type} (${next.status})` : '—'}</dd></div>
        <div><dt style={{ color: '#94a3b8' }}>Tempo actual</dt><dd style={{ margin: 0 }}>{activeTime ? `Desde ${new Date(activeTime.startedAt).toLocaleTimeString('pt-PT')}` : '—'}</dd></div>
        <div><dt style={{ color: '#94a3b8' }}>Qualidade</dt><dd style={{ margin: 0 }}>{latestQ ? latestQ.decision : '—'}</dd></div>
        <div><dt style={{ color: '#94a3b8' }}>Operações</dt><dd style={{ margin: 0 }}>{piece.operations.join(', ') || '—'}</dd></div>
      </dl>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button type="button" onClick={() => onToolMode('move')} style={btnStyle(toolMode === 'move')}>Mover</button>
        <button type="button" onClick={() => onToolMode('rotate')} style={btnStyle(toolMode === 'rotate')}>Rodar</button>
        <button type="button" onClick={onToggleSnap} style={btnStyle(snapEnabled)}>Snap {snapEnabled ? 'ON' : 'OFF'}</button>
        {onSavePosition ? <button type="button" onClick={onSavePosition} style={btnStyle(false)}>Guardar posição</button> : null}
        {onSaveRotation ? <button type="button" onClick={onSaveRotation} style={btnStyle(false)}>Guardar rotação</button> : null}
        {onSaveSelectedPart ? <button type="button" onClick={onSaveSelectedPart} style={btnStyle(false)}>Guardar selecção</button> : null}
        <button type="button" onClick={onResetTransform} style={btnStyle(false)}>Apagar transform</button>
        <button type="button" onClick={onReload} style={btnStyle(false)}>Recarregar dados</button>
        {onToggleSidebar ? (
          <button type="button" onClick={onToggleSidebar} style={btnStyle(sidebarOpen)}>
            {sidebarOpen ? 'Ocultar histórico' : 'Mostrar histórico'}
          </button>
        ) : null}
      </div>

      {current && onTrackingAction ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Tracking</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button type="button" style={btnStyle(false)} onClick={() => onTrackingAction(current.id, 'start')}>Iniciar</button>
            <button type="button" style={btnStyle(false)} onClick={() => onTrackingAction(current.id, 'pause')}>Pausar</button>
            <button type="button" style={btnStyle(false)} onClick={() => onTrackingAction(current.id, 'finish')}>Finalizar</button>
            <button type="button" style={btnStyle(false)} onClick={() => onTrackingAction(current.id, 'reject', 'Rejeitada')}>Rejeitar</button>
            <button type="button" style={btnStyle(false)} onClick={() => onTrackingAction(current.id, 'rework', 'Rework')}>Rework</button>
          </div>
        </div>
      ) : null}

      {onQualityDecision ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Qualidade</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button type="button" style={btnStyle(false)} onClick={() => onQualityDecision('approved')}>Aprovado</button>
            <button type="button" style={btnStyle(false)} onClick={() => onQualityDecision('rejected', 'Rejeitado')}>Rejeitado</button>
            <button type="button" style={btnStyle(false)} onClick={() => onQualityDecision('rework', 'Rework necessário')}>Rework</button>
          </div>
        </div>
      ) : null}

      <PieceLabel piece={piece} qrPayload={qrPayload} projectName={projectName} boxName={boxName} />
    </section>
  );
}

function btnStyle(active: boolean): CSSProperties {
  return {
    padding: '6px 10px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid var(--border, #334155)',
    background: active ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.04)',
    color: 'var(--text-main, #f8fafc)',
    cursor: 'pointer',
  };
}
