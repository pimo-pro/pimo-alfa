import { useState } from 'react';

import StationCanvas, { type StationCanvasPiece } from '@/industrial/ui/components/StationCanvas';
import { useIndustrialPageState } from '@/industrial/ui/components';
import { IndustrialThreeColumnLayout } from '@/industrial/ui/layouts/IndustrialThreeColumnLayout';
import {
  industrialActionBtnStyle,
  industrialBtnStyle,
  industrialConfirmBtnStyle,
  industrialListItemStyle,
  industrialSectionTitleStyle,
} from '@/industrial/ui/layouts/industrialStyles';

const FAKE_PIECES: StationCanvasPiece[] = [
  { id: 'visual-1', label: 'Peça A', widthMm: 600, heightMm: 400, thicknessMm: 19, color: '#8b9cb3' },
  { id: 'visual-2', label: 'Peça B', widthMm: 450, heightMm: 720, thicknessMm: 16, color: '#64748b' },
  { id: 'visual-3', label: 'Peça C', widthMm: 300, heightMm: 300, thicknessMm: 10, color: '#94a3b8' },
];

const RAIL_ITEMS = [
  { id: 'hub', label: 'IND', title: 'Industrial' },
  { id: 'warehouse', label: 'SUP', title: 'Supervisor Geral' },
  { id: 'nesting', label: 'NES', title: 'Nesting' },
  { id: 'drill', label: 'DRI', title: 'Drill' },
  { id: 'orlar', label: 'ORL', title: 'Orlar' },
  { id: 'montagem', label: 'MON', title: 'Montagem' },
  { id: 'embalagem', label: 'EMB', title: 'Embalagem' },
] as const;

const noop = () => {};

export default function IndustrialHomePage() {
  useIndustrialPageState();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<'select' | 'move' | 'rotate'>('select');
  const [snapEnabled, setSnapEnabled] = useState(false);

  return (
    <IndustrialThreeColumnLayout
      title="Industrial · Principal"
      description="Base visual do módulo · sem operações"
      sidebarOpen={sidebarOpen}
      leftLeft={
        <nav style={{ display: 'grid', gap: 8, justifyItems: 'center' }} aria-label="Rail visual Industrial">
          {RAIL_ITEMS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              title={item.title}
              disabled
              style={{
                ...industrialBtnStyle(index === 0),
                width: 40,
                height: 40,
                padding: 0,
                display: 'grid',
                placeItems: 'center',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.3,
                opacity: index === 0 ? 1 : 0.55,
                cursor: 'default',
              }}
            >
              {item.label}
            </button>
          ))}
          <div style={{ height: 1, width: '100%', background: 'var(--border, #334155)', margin: '4px 0' }} />
          <button
            type="button"
            title="Notificações (visual)"
            disabled
            style={{ ...industrialBtnStyle(false), width: 40, height: 40, padding: 0, cursor: 'default', opacity: 0.55 }}
          >
            🔔
          </button>
          <button
            type="button"
            title="Chat (visual)"
            disabled
            style={{ ...industrialBtnStyle(false), width: 40, height: 40, padding: 0, cursor: 'default', opacity: 0.55 }}
          >
            💬
          </button>
        </nav>
      }
      history={
        <aside
          style={{
            display: 'grid',
            gap: 14,
            alignContent: 'start',
            overflow: 'auto',
            maxHeight: 'calc(100vh - 240px)',
            paddingRight: 4,
          }}
        >
          <section style={{ display: 'grid', gap: 6 }}>
            <h3 style={industrialSectionTitleStyle}>Fila visual</h3>
            <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
              {['Peça A · pendente', 'Peça B · em fila', 'Peça C · em fila'].map((label) => (
                <li key={label} style={industrialListItemStyle}>
                  {label}
                </li>
              ))}
            </ul>
          </section>
          <section style={{ display: 'grid', gap: 6 }}>
            <h3 style={industrialSectionTitleStyle}>Histórico visual</h3>
            <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
              {['Demo · concluído', 'Demo · rejeitado'].map((label) => (
                <li key={label} style={industrialListItemStyle}>
                  {label}
                </li>
              ))}
            </ul>
          </section>
          <section style={{ display: 'grid', gap: 6 }}>
            <h3 style={industrialSectionTitleStyle}>Eventos</h3>
            <div style={{ ...industrialListItemStyle, color: '#94a3b8' }}>Sem eventos (modo visual)</div>
          </section>
        </aside>
      }
      left={
        <section style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Industrial · Principal</h2>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Modo visual · sem operações</div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(
              [
                ['select', 'Selecionar'],
                ['move', 'Mover'],
                ['rotate', 'Rodar'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setToolMode(mode)}
                style={industrialBtnStyle(toolMode === mode)}
              >
                {label}
              </button>
            ))}
            <button type="button" onClick={() => setSnapEnabled((v) => !v)} style={industrialBtnStyle(snapEnabled)}>
              Snap
            </button>
            <button type="button" disabled style={{ ...industrialBtnStyle(false), cursor: 'default', opacity: 0.55 }}>
              Actualizar
            </button>
            <button
              type="button"
              title="Ocultar/mostrar histórico"
              onClick={() => setSidebarOpen((v) => !v)}
              style={industrialBtnStyle(sidebarOpen)}
            >
              Histórico
            </button>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <h3 style={industrialSectionTitleStyle}>QR / Código</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value=""
                readOnly
                disabled
                placeholder="PC-piece-id"
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border, #334155)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-main, #f8fafc)',
                  fontSize: 12,
                  opacity: 0.55,
                }}
              />
              <button
                type="button"
                disabled
                style={{
                  ...industrialConfirmBtnStyle,
                  background: '#334155',
                  padding: '8px 12px',
                  cursor: 'default',
                  opacity: 0.55,
                }}
              >
                Ler
              </button>
            </div>
          </div>

          <dl style={{ margin: 0, display: 'grid', gap: 6, fontSize: 12 }}>
            <div>
              <dt style={{ color: '#94a3b8' }}>Peça seleccionada</dt>
              <dd style={{ margin: 0 }}>{selectedPieceId ?? 'Nenhuma peça seleccionada'}</dd>
            </div>
          </dl>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" disabled style={{ ...industrialConfirmBtnStyle, cursor: 'default', opacity: 0.55 }}>
              Iniciar
            </button>
            <button type="button" disabled style={{ ...industrialActionBtnStyle, cursor: 'default', opacity: 0.55 }}>
              Rejeitar
            </button>
            <button type="button" disabled style={{ ...industrialConfirmBtnStyle, cursor: 'default', opacity: 0.55 }}>
              Concluir
            </button>
          </div>
        </section>
      }
      right={
        <StationCanvas
          pieces={FAKE_PIECES}
          selectedPieceId={selectedPieceId}
          toolMode={toolMode}
          onSelectPiece={setSelectedPieceId}
          onClearSelection={() => setSelectedPieceId(null)}
          notifications={[]}
          notificationsOpen={false}
          onToggleNotifications={noop}
          onDismissNotification={noop}
          chatOpen={false}
          onToggleChat={noop}
          conversations={[]}
          activeConversationId=""
          onSelectConversation={noop}
          onSendChatMessage={noop}
          enableSupervisorChat={false}
          stationLabel="Industrial"
        />
      }
    />
  );
}
