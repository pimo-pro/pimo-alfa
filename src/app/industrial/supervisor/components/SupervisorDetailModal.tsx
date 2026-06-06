import { industrialBtnStyle } from '@/industrial/ui/layouts/industrialStyles';

interface SupervisorDetailModalProps {
  title: string;
  body: string;
  onClose: () => void;
}

export default function SupervisorDetailModal({ title, body, onClose }: SupervisorDetailModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(2,6,23,0.65)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(480px, 100%)',
          borderRadius: 10,
          border: '1px solid var(--border, #334155)',
          background: 'rgba(15,23,42,0.98)',
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{body}</p>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={industrialBtnStyle(false)}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
