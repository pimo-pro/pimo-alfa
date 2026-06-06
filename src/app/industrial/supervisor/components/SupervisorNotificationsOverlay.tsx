import { useEffect } from 'react';

import { useToast } from '@/context/ToastContext';
import IndustrialSpriteIcon from '@/components/icons/IndustrialSpriteIcon';
import type { SupervisorAlertItem } from '@/industrial/persistence/supervisor/types';

interface SupervisorNotificationsOverlayProps {
  open: boolean;
  alerts: SupervisorAlertItem[];
  onClose: () => void;
  onDismiss: (id: string) => void;
}

const LEVEL_COLOR: Record<SupervisorAlertItem['level'], string> = {
  success: '#16a34a',
  error: '#dc2626',
  warning: '#f59e0b',
  info: '#38bdf8',
};

const LEVEL_TOAST: Record<SupervisorAlertItem['level'], 'success' | 'error' | 'warning' | 'info'> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

/**
 * Overlay de notificações do Supervisor — mesmo padrão visual do ToastContext do site.
 * Sucesso → verde; erro → vermelho; aviso → laranja.
 */
export default function SupervisorNotificationsOverlay({
  open,
  alerts,
  onClose,
  onDismiss,
}: SupervisorNotificationsOverlayProps) {
  const { showToast } = useToast();

  useEffect(() => {
    if (!open || alerts.length === 0) return;
    const latest = alerts[0];
    if (latest.level === 'success') {
      showToast(latest.message, LEVEL_TOAST.success, 4200);
    }
  }, [open, alerts, showToast]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 320,
        maxHeight: '50%',
        zIndex: 6,
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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IndustrialSpriteIcon name="industrial-alerts" size={14} />
          Alertas ({alerts.length})
        </span>
        <button type="button" onClick={onClose} style={closeBtnStyle}>
          ✕
        </button>
      </header>

      <ul style={{ listStyle: 'none', margin: 0, padding: 8, overflow: 'auto', display: 'grid', gap: 6 }}>
        {alerts.length === 0 ? (
          <li style={{ fontSize: 11, color: '#94a3b8', padding: 8 }}>Sem alertas activos.</li>
        ) : (
          alerts.map((item) => (
            <li
              key={item.id}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.05)',
                borderLeft: `3px solid ${LEVEL_COLOR[item.level]}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 10, color: LEVEL_COLOR[item.level], fontWeight: 700 }}>
                  {item.title}
                </span>
                <button type="button" onClick={() => onDismiss(item.id)} style={dismissBtnStyle}>
                  dispensar
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#f8fafc', marginTop: 4 }}>{item.message}</div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

const closeBtnStyle = {
  padding: '2px 8px',
  borderRadius: 6,
  border: '1px solid var(--border, #334155)',
  background: 'transparent',
  color: '#94a3b8',
  cursor: 'pointer',
} as const;

const dismissBtnStyle = {
  border: 'none',
  background: 'transparent',
  color: '#64748b',
  cursor: 'pointer',
  fontSize: 10,
} as const;
