import type { StationNotification } from './stationTypes';

interface StationNotificationsOverlayProps {
  open: boolean;
  notifications: StationNotification[];
  onClose: () => void;
  onDismiss: (id: string) => void;
}

const TYPE_COLOR: Record<StationNotification['type'], string> = {
  task: '#38bdf8',
  quality: '#f87171',
  time: '#fbbf24',
  supervisor: '#a78bfa',
};

const TYPE_LABEL: Record<StationNotification['type'], string> = {
  task: 'Tarefa',
  quality: 'Qualidade',
  time: 'Tempo',
  supervisor: 'Supervisor',
};

export default function StationNotificationsOverlay({
  open,
  notifications,
  onClose,
  onDismiss,
}: StationNotificationsOverlayProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 300,
        maxHeight: '45%',
        zIndex: 5,
        borderRadius: 8,
        border: '1px solid var(--border, #334155)',
        background: 'rgba(2, 6, 23, 0.92)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
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
        <span>Notificações ({notifications.length})</span>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '2px 8px',
            borderRadius: 6,
            border: '1px solid var(--border, #334155)',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </header>

      <ul style={{ listStyle: 'none', margin: 0, padding: 8, overflow: 'auto', display: 'grid', gap: 6 }}>
        {notifications.length === 0 ? (
          <li style={{ fontSize: 11, color: '#94a3b8', padding: 8 }}>Sem alertas activos.</li>
        ) : (
          notifications.map((item) => (
            <li
              key={item.id}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.05)',
                borderLeft: `3px solid ${TYPE_COLOR[item.type]}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 10, color: TYPE_COLOR[item.type], fontWeight: 700 }}>
                  {TYPE_LABEL[item.type]}
                </span>
                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: 10,
                  }}
                >
                  dispensar
                </button>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc', marginTop: 2 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{item.message}</div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
