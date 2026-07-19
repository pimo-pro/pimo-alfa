import { useState, type FormEvent } from 'react';

import type { StationChatConversation } from './stationTypes';

interface StationChatOverlayProps {
  open: boolean;
  conversations: StationChatConversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onClose: () => void;
  onSendMessage: (body: string, eventAttachment?: string) => void;
  enableSupervisor?: boolean;
}

const EVENT_QUICK_ACTIONS = ['Peça danificada', 'Material em falta', 'Pedir supervisor', 'Pausa operacional'];

export default function StationChatOverlay({
  open,
  conversations,
  activeConversationId,
  onSelectConversation,
  onClose,
  onSendMessage,
  enableSupervisor = false,
}: StationChatOverlayProps) {
  const [draft, setDraft] = useState('');
  if (!open) return null;

  const active = conversations.find((c) => c.id === activeConversationId) ?? conversations[0];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onSendMessage(body);
    setDraft('');
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 320,
        maxHeight: '55%',
        zIndex: 5,
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto auto',
        borderRadius: 8,
        border: '1px solid var(--border, #334155)',
        background: 'rgba(2, 6, 23, 0.92)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 10px',
          borderBottom: '1px solid var(--border, #334155)',
          fontSize: 12,
          color: '#e2e8f0',
        }}
      >
        <span>{enableSupervisor ? 'Chat · Supervisor' : 'Chat industrial'}</span>
        <button type="button" onClick={onClose} style={overlayBtnStyle}>
          ✕
        </button>
      </header>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border, #334155)' }}>
        {conversations.map((conv) => (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelectConversation(conv.id)}
            style={{
              ...overlayBtnStyle,
              flex: 1,
              borderRadius: 0,
              background: conv.id === active?.id ? 'rgba(59,130,246,0.2)' : 'transparent',
              fontSize: 11,
            }}
          >
            {conv.title}
          </button>
        ))}
      </div>

      <div style={{ overflow: 'auto', padding: 10, display: 'grid', gap: 8 }}>
        {(active?.messages ?? []).map((msg) => (
          <div
            key={msg.id}
            style={{
              fontSize: 11,
              padding: '6px 8px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ color: '#94a3b8', marginBottom: 2 }}>
              {msg.author} · {new Date(msg.createdAt).toLocaleTimeString('pt-PT')}
            </div>
            <div style={{ color: '#f8fafc' }}>{msg.body}</div>
            {msg.eventAttachment ? (
              <div style={{ marginTop: 4, color: '#fbbf24', fontSize: 10 }}>Evento: {msg.eventAttachment}</div>
            ) : null}
          </div>
        ))}
      </div>

      <div style={{ padding: '6px 10px', display: 'flex', gap: 4, flexWrap: 'wrap', borderTop: '1px solid var(--border, #334155)' }}>
        {EVENT_QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            style={{ ...overlayBtnStyle, fontSize: 10 }}
            onClick={() => onSendMessage(action, action)}
          >
            {action}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid var(--border, #334155)' }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Mensagem…"
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid var(--border, #334155)',
            background: 'rgba(255,255,255,0.04)',
            color: '#f8fafc',
            fontSize: 11,
          }}
        />
        <button
          type="submit"
          style={{
            ...overlayBtnStyle,
            background: 'var(--pi-btn-primary-bg, #2563eb)',
            color: 'var(--pi-btn-on-accent-text, #fff)',
          }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

const overlayBtnStyle = {
  padding: '4px 8px',
  borderRadius: 'var(--pi-btn-radius, 6px)',
  border: '1px solid var(--border, #334155)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e2e8f0',
  cursor: 'pointer',
  fontSize: 12,
} as const;
