import { useMemo } from 'react';

import IndustrialSpriteIcon from '@/components/icons/IndustrialSpriteIcon';
import StationCanvas from '@/industrial/ui/components/StationCanvas';
import StationChatOverlay from '@/industrial/ui/components/StationChatOverlay';
import {
  industrialBtnStyle,
  industrialCanvasShellStyle,
  INDUSTRIAL_PANEL_MOTION_CLASS,
  ensureIndustrialInteractionStyles,
  industrialPanelDepthStyle,
  industrialSectionTitleStyle,
  industrialListItemStyle,
} from '@/industrial/ui/layouts/industrialStyles';
import {
  STATION_LABELS,
  type IndustrialWorkOrderTask,
} from '@/industrial/work-orders/types';
import { buildCanvasPieces } from '@/app/industrial/work-orders/utils/stationListData';

import type { UseSupervisorDashboardReturn } from '../hooks/useSupervisorDashboard';
import SupervisorInfoCards from './SupervisorInfoCards';
import SupervisorNotificationsOverlay from './SupervisorNotificationsOverlay';

/**
 * Área principal do supervisor: canvas 3D, chat, info e alertas reais.
 * Contagens derivadas de tarefas filtradas (Supabase/RTO) — sem engines/scores fictícios.
 */

interface SupervisorMainAreaProps {
  state: UseSupervisorDashboardReturn;
}

const MODES = [
  { id: 'canvas' as const, icon: 'industrial-canvas-3d' as const, label: '3D' },
  { id: 'chat' as const, icon: 'industrial-chat' as const, label: 'Chat' },
  { id: 'info' as const, icon: 'industrial-info' as const, label: 'Info' },
  { id: 'alerts' as const, icon: 'industrial-alerts' as const, label: 'Alertas' },
];

const STATUS_LABEL: Record<IndustrialWorkOrderTask['status'], string> = {
  pending: 'Pendente',
  in_progress: 'Em execução',
  completed: 'Concluído',
  rejected: 'Rejeitado',
};

export default function SupervisorMainArea({ state }: SupervisorMainAreaProps) {
  const tasks = state.filteredTasks;
  const orders = state.snapshot?.orders ?? [];

  const canvasPieces = useMemo(() => {
    const base = buildCanvasPieces(tasks, orders, state.selectedTask?.pieceId ?? null);
    return base.map((piece) => {
      const syncPiece = state.lastThreeSync?.pieceId === piece.id ? state.lastThreeSync : null;
      const syncColor =
        syncPiece?.action === 'completed'
          ? '#16a34a'
          : syncPiece?.action === 'rejected'
            ? '#dc2626'
            : syncPiece?.action === 'rework'
              ? '#f59e0b'
              : undefined;
      return {
        ...piece,
        color: syncColor ?? (state.selectedTask?.pieceId === piece.id ? '#38bdf8' : piece.color),
        highlighted: state.selectedTask?.pieceId === piece.id,
      };
    });
  }, [tasks, orders, state.selectedTask?.pieceId, state.lastThreeSync, state.canvasRevision]);

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

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').slice(0, 8),
    [tasks],
  );

  const woSummary = useMemo(() => {
    const pieceIds = new Set(tasks.map((t) => t.pieceId));
    return {
      total: pieceIds.size,
      activas: tasks.filter((t) => t.status === 'in_progress').length,
      concluidas: tasks.filter((t) => t.status === 'completed').length,
      bloqueadas: tasks.filter((t) => t.status === 'rejected').length,
      pendentes: tasks.filter((t) => t.status === 'pending').length,
    };
  }, [tasks]);

  const selected = state.selectedTask;
  ensureIndustrialInteractionStyles();

  const chip = (label: string, active = false, color = 'rgba(59,130,246,0.55)') => (
    <span
      style={{
        padding: '4px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.5,
        border: `1px solid ${active ? color : 'var(--border, #334155)'}`,
        background: active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        color: active ? '#f1f5f9' : '#a3b2c2',
      }}
    >
      {label}
    </span>
  );

  return (
    <div
      className={INDUSTRIAL_PANEL_MOTION_CLASS}
      style={{
        position: 'relative',
        minHeight: 0,
        color: '#f1f5f9',
        lineHeight: 1.5,
        ...industrialPanelDepthStyle,
        borderRadius: 8,
        padding: 8,
        transition: 'all 140ms ease-out',
      }}
    >
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={industrialSectionTitleStyle}>Resumo</span>
          {chip(state.snapshot ? 'dados carregados' : 'dados pendentes', Boolean(state.snapshot), '#16a34a')}
          {state.realtimeConnected ? chip('RTO live', true, '#38bdf8') : null}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {chip(`total ${woSummary.total}`, true)}
          {chip(`activas ${woSummary.activas}`, woSummary.activas > 0, '#38bdf8')}
          {chip(`concluídas ${woSummary.concluidas}`, woSummary.concluidas > 0, '#16a34a')}
          {chip(`bloqueadas ${woSummary.bloqueadas}`, woSummary.bloqueadas > 0, '#f87171')}
          {chip(`pendentes ${woSummary.pendentes}`, woSummary.pendentes > 0, '#f59e0b')}
        </div>

        <div style={{ display: 'grid', gap: 4 }}>
          <div style={industrialSectionTitleStyle}>Peças activas</div>
          {activeTasks.length === 0 ? (
            <div style={{ fontSize: 12, color: '#a3b2c2' }}>Sem peças activas no filtro actual.</div>
          ) : (
            <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
              {activeTasks.map((task) => (
                <li key={task.id} style={industrialListItemStyle}>
                  <div style={{ fontWeight: 600 }}>{task.pieceId}</div>
                  <div style={{ color: '#cbd5e1', fontSize: 11 }}>
                    {task.operationType} · {STATUS_LABEL[task.status]}
                    {state.selectedTask?.id === task.id ? ' · seleccionada' : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected ? (
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>
            Peça seleccionada: <strong style={{ color: '#f1f5f9' }}>{selected.pieceId}</strong>
            {' · '}
            {selected.operationType} · {STATUS_LABEL[selected.status]}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
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
              ...(state.mainMode === mode.id
                ? {
                    boxShadow: '0 0 0 2px rgba(59,130,246,0.45)',
                    transform: 'translateY(-2px)',
                    background: 'rgba(255,255,255,0.06)',
                  }
                : { opacity: 0.85 }),
              transition: 'all 140ms ease-out',
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

        {state.mainMode === 'info' ? <SupervisorInfoCards state={state} /> : null}

        {state.mainMode === 'alerts' ? (
          <div style={{ ...industrialCanvasShellStyle, padding: 16, overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }}>
              Alertas detalhados
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {state.alerts.map((alert) => (
                <li
                  key={alert.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    borderLeft: `4px solid ${
                      alert.level === 'success' ? '#16a34a' : alert.level === 'error' ? '#dc2626' : '#f59e0b'
                    }`,
                    minHeight: 28,
                    boxShadow:
                      '0 0 0 2px rgba(59,130,246,0.25), 0 0 0 1px #334155, 0 6px 18px rgba(0,0,0,0.55)',
                    transition: 'all 140ms ease-out',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }}>{alert.title}</div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4, lineHeight: 1.5 }}>{alert.message}</div>
                  {alert.station ? (
                    <div style={{ fontSize: 12, fontWeight: 400, color: '#a3b2c2', marginTop: 4, lineHeight: 1.5 }}>
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
