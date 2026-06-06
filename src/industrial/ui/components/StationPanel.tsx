import type { FormEvent, ReactNode } from 'react';

import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';
import {
  industrialConfirmBtnStyle,
  industrialListItemStyle,
  industrialSectionTitleStyle,
} from '@/industrial/ui/layouts/industrialStyles';

import type { StationListSection } from './stationTypes';
import StationToolbar from './StationToolbar';
import type { StationToolMode } from './stationTypes';

interface StationPanelProps {
  title: string;
  description?: string;
  sections: StationListSection[];
  codeInput: string;
  onCodeInputChange: (value: string) => void;
  onCodeSubmit: (event: FormEvent) => void;
  selectedTask: IndustrialWorkOrderTask | null;
  confirmLabel: string;
  rejectLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onReject?: () => void;
  toolMode: StationToolMode;
  snapEnabled: boolean;
  onToolMode: (mode: StationToolMode) => void;
  onToggleSnap: () => void;
  onReload?: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  extra?: ReactNode;
}

const STATUS_LABEL: Record<IndustrialWorkOrderTask['status'], string> = {
  pending: 'Pendente',
  in_progress: 'Em execução',
  completed: 'Concluído',
  rejected: 'Rejeitado',
};

export default function StationPanel({
  title,
  description,
  sections,
  codeInput,
  onCodeInputChange,
  onCodeSubmit,
  selectedTask,
  confirmLabel,
  rejectLabel = 'Rejeitar',
  busy = false,
  error,
  onConfirm,
  onReject,
  toolMode,
  snapEnabled,
  onToolMode,
  onToggleSnap,
  onReload,
  onToggleSidebar,
  sidebarOpen,
  extra,
}: StationPanelProps) {
  return (
    <section style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h2>
        {description ? <div style={{ fontSize: 12, color: '#94a3b8' }}>{description}</div> : null}
        {busy ? <div style={{ fontSize: 11, color: '#38bdf8' }}>A processar…</div> : null}
      </div>

      <StationToolbar
        toolMode={toolMode}
        snapEnabled={snapEnabled}
        onToolMode={onToolMode}
        onToggleSnap={onToggleSnap}
        onReload={onReload}
        onToggleSidebar={onToggleSidebar}
        sidebarOpen={sidebarOpen}
      />

      <form onSubmit={onCodeSubmit} style={{ display: 'grid', gap: 8 }}>
        <h3 style={industrialSectionTitleStyle}>QR / Código</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={codeInput}
            onChange={(e) => onCodeInputChange(e.target.value)}
            placeholder="PC-piece-id"
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid var(--border, #334155)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-main, #f8fafc)',
              fontSize: 12,
            }}
          />
          <button type="submit" style={{ ...industrialConfirmBtnStyle, background: '#334155', padding: '8px 12px' }}>
            Ler
          </button>
        </div>
      </form>

      {selectedTask ? (
        <dl style={{ margin: 0, display: 'grid', gap: 6, fontSize: 12 }}>
          <div>
            <dt style={{ color: '#94a3b8' }}>Peça seleccionada</dt>
            <dd style={{ margin: 0 }}>{selectedTask.pieceId}</dd>
          </div>
          <div>
            <dt style={{ color: '#94a3b8' }}>Operação</dt>
            <dd style={{ margin: 0 }}>{selectedTask.operationType}</dd>
          </div>
          <div>
            <dt style={{ color: '#94a3b8' }}>Estado</dt>
            <dd style={{ margin: 0 }}>{STATUS_LABEL[selectedTask.status]}</dd>
          </div>
        </dl>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Leia o QR para seleccionar a tarefa.</p>
      )}

      {sections.map((section) => (
        <div key={section.title} style={{ display: 'grid', gap: 6 }}>
          <h3 style={industrialSectionTitleStyle}>{section.title}</h3>
          <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
            {section.items.length === 0 ? (
              <li style={{ fontSize: 12, color: '#94a3b8' }}>Sem itens.</li>
            ) : (
              section.items.map((item) => (
                <li key={item.id} style={industrialListItemStyle}>
                  <div style={{ fontWeight: 600 }}>{item.primary}</div>
                  {item.secondary ? <div style={{ color: '#94a3b8', marginTop: 2 }}>{item.secondary}</div> : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ))}

      {extra}

      {error ? <p style={{ margin: 0, color: '#f87171', fontSize: 12 }}>{error}</p> : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={!selectedTask || busy}
          onClick={onConfirm}
          style={{
            ...industrialConfirmBtnStyle,
            opacity: !selectedTask ? 0.5 : 1,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {confirmLabel}
        </button>
        {onReject ? (
          <button
            type="button"
            disabled={!selectedTask || busy}
            onClick={onReject}
            style={{
              padding: '10px 18px',
              borderRadius: 6,
              border: '1px solid #fca5a5',
              background: 'transparent',
              color: '#fca5a5',
              fontSize: 12,
              cursor: busy ? 'wait' : 'pointer',
              opacity: !selectedTask ? 0.5 : 1,
            }}
          >
            {rejectLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
