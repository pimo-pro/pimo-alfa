import { useMemo } from 'react';

import IndustrialSpriteIcon from '@/components/icons/IndustrialSpriteIcon';
import StationCanvas from '@/industrial/ui/components/StationCanvas';
import StationChatOverlay from '@/industrial/ui/components/StationChatOverlay';
import { industrialBtnStyle, industrialCanvasShellStyle } from '@/industrial/ui/layouts/industrialStyles';
import { STATION_LABELS } from '@/industrial/work-orders/types';

import type { UseSupervisorDashboardReturn } from '../hooks/useSupervisorDashboard';
import SupervisorInfoCards from './SupervisorInfoCards';
import SupervisorNotificationsOverlay from './SupervisorNotificationsOverlay';

interface SupervisorMainAreaProps {
  state: UseSupervisorDashboardReturn;
}

const MODES = [
  { id: 'canvas' as const, icon: 'industrial-canvas-3d' as const, label: '3D' },
  { id: 'chat' as const, icon: 'industrial-chat' as const, label: 'Chat' },
  { id: 'info' as const, icon: 'industrial-info' as const, label: 'Info' },
  { id: 'alerts' as const, icon: 'industrial-alerts' as const, label: 'Alertas' },
];

export default function SupervisorMainArea({ state }: SupervisorMainAreaProps) {
  const tasks = state.filteredTasks;
  const pieceIds = useMemo(() => Array.from(new Set(tasks.map((t) => t.pieceId))).slice(0, 24), [tasks]);

  const canvasPieces = useMemo(
    () =>
      pieceIds.map((id) => {
        const syncPiece = state.lastThreeSync?.pieceId === id ? state.lastThreeSync : null;
        const syncColor =
          syncPiece?.action === 'completed'
            ? '#16a34a'
            : syncPiece?.action === 'rejected'
              ? '#dc2626'
              : syncPiece?.action === 'rework'
                ? '#f59e0b'
                : undefined;
        return {
          id,
          label: id,
          widthMm: 600,
          heightMm: 400,
          thicknessMm: 18,
          highlighted: state.selectedTask?.pieceId === id,
          color: syncColor ?? (state.selectedTask?.pieceId === id ? '#38bdf8' : '#8b9cb3'),
        };
      }),
    [pieceIds, state.selectedTask?.pieceId, state.lastThreeSync, state.canvasRevision],
  );

  const conversations = useMemo(
    () => [
      {
        id: 'supervisor',
        title: 'Supervisor',
        messages: [
          {
            id: 'sys',
            author: 'Sistema',
            body: 'Dashboard supervisor activo. Seleccione uma estação ou projeto para detalhe.',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'floor',
        title: 'Chão de fábrica',
        messages: [] as Array<{ id: string; author: string; body: string; createdAt: string }>,
      },
    ],
    [],
  );

  const liveConversations = useMemo(
    () => state.mergeChatConversations(conversations),
    [conversations, state],
  );

  return (
    <div style={{ position: 'relative', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => state.setMainMode(mode.id)}
            style={{
              ...industrialBtnStyle(state.mainMode === mode.id),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <IndustrialSpriteIcon name={mode.icon} size={14} />
            {mode.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => state.setNotificationsOpen(!state.notificationsOpen)}
          style={{ ...industrialBtnStyle(state.notificationsOpen), marginLeft: 'auto' }}
        >
          <IndustrialSpriteIcon name="industrial-alerts" size={14} />
          Notificações
        </button>
        <button type="button" onClick={() => void state.reload()} style={industrialBtnStyle(false)}>
          Actualizar
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        {state.mainMode === 'canvas' ? (
          <StationCanvas
            pieces={canvasPieces}
            selectedPieceId={state.selectedTask?.pieceId ?? null}
            toolMode="select"
            onSelectPiece={(pieceId) => {
              const task = tasks.find((t) => t.pieceId === pieceId);
              if (task) state.setSelectedTaskId(task.id);
            }}
            onClearSelection={() => state.setSelectedTaskId(null)}
            notifications={[]}
            notificationsOpen={false}
            onToggleNotifications={() => state.setNotificationsOpen(true)}
            onDismissNotification={state.dismissAlert}
            chatOpen={false}
            onToggleChat={() => state.setMainMode('chat')}
            conversations={liveConversations}
            activeConversationId="supervisor"
            onSelectConversation={() => undefined}
            onSendChatMessage={(body) => {
              state.sendRealtimeChat({
                conversationId: 'supervisor',
                author: 'Supervisor',
                body,
                scope: 'supervisor',
                scopeId: 'supervisor',
              });
            }}
            stationLabel="Supervisor · Visão macro"
          />
        ) : null}

        {state.mainMode === 'chat' ? (
          <div style={industrialCanvasShellStyle}>
            <StationChatOverlay
              open
              conversations={liveConversations}
              activeConversationId="supervisor"
              onSelectConversation={() => undefined}
              onClose={() => state.setMainMode('canvas')}
              onSendMessage={(body, eventAttachment) => {
                state.sendRealtimeChat({
                  conversationId: 'supervisor',
                  author: 'Supervisor',
                  body,
                  scope: 'supervisor',
                  scopeId: 'supervisor',
                  eventAttachment,
                });
              }}
              enableSupervisor
            />
          </div>
        ) : null}

        {state.mainMode === 'info' ? (
          <SupervisorInfoCards state={state} />
        ) : null}

        {state.mainMode === 'alerts' ? (
          <div style={{ ...industrialCanvasShellStyle, padding: 16, overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Alertas detalhados</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {state.alerts.map((alert) => (
                <li
                  key={alert.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    borderLeft: `4px solid ${alert.level === 'success' ? '#16a34a' : alert.level === 'error' ? '#dc2626' : '#f59e0b'}`,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{alert.title}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{alert.message}</div>
                  {alert.station ? (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Estação: {STATION_LABELS[alert.station]}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <SupervisorNotificationsOverlay
          open={state.notificationsOpen}
          alerts={state.alerts}
          onClose={() => state.setNotificationsOpen(false)}
          onDismiss={state.dismissAlert}
        />
      </div>
    </div>
  );
}
