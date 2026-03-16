// Modal de confirmação para criar novo projeto

export type ConfirmNewProjectModalProps = {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export default function ConfirmNewProjectModal({ open, onSave, onDiscard, onCancel }: ConfirmNewProjectModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Criar novo projeto</div>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Fechar">×</button>
        </div>
        <div style={{ marginBottom: 16, fontSize: 13 }}>
          Deseja guardar antes de criar um novo?
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="modal-action" onClick={onSave}>Guardar e criar novo</button>
          <button className="modal-action" style={{ background: '#f87171', borderColor: '#f87171' }} onClick={onDiscard}>Descartar e criar novo</button>
          <button className="modal-action" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
