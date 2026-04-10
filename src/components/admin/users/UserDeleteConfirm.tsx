import { useState } from "react";

import { deleteUserRemote, type RemoteUserPublic } from "../../../api/usersApi";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import PageHeader from "../../ui/PageHeader";
import "../../ui/ui.css";

export type UserDeleteConfirmProps = {
  open: boolean;
  user: RemoteUserPublic | null;
  onClose: () => void;
  onDeleted: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export default function UserDeleteConfirm({
  open,
  user,
  onClose,
  onDeleted,
  onError,
  onSuccess,
}: UserDeleteConfirmProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!open || !user) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteUserRemote(user.id);
      onSuccess("Utilizador removido.");
      onDeleted();
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erro ao remover");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ui-modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirmar remoção" onClick={onClose}>
      <div style={{ maxWidth: 440, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <Card>
          <PageHeader title="Remover utilizador" subtitle="Esta ação não pode ser anulada no painel." />
          <p style={{ marginTop: 0, fontSize: 15 }}>
            Remover <strong>{user.username}</strong> ({user.email}) — role <code>{user.role}</code>?
          </p>
          <div className="ui-inline-actions">
            <Button type="button" variant="danger" disabled={submitting} onClick={() => void handleDelete()}>
              {submitting ? "A remover…" : "Remover"}
            </Button>
            <Button type="button" disabled={submitting} onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
