import { useMemo, useState } from "react";
import { useProject } from "../../context/useProject";
import { getCurrentProjectUser } from "../../core/projects/currentUser";
import {
  INDUSTRIAL_OPERATION_LABELS,
  type IndustrialOperationId,
} from "../../core/industrial/industrialPieceEditsTypes";
import Button from "../ui/Button";
import { ModalPortal } from "../ui/ModalPortal";

type Props = {
  operationId: IndustrialOperationId;
};

export default function PainelOperacaoSingle({ operationId }: Props) {
  const { project, actions } = useProject();
  const [notas, setNotas] = useState("");
  const [pending, setPending] = useState(false);

  const state = project.industrialOperacoes?.[operationId];
  const done = Boolean(state?.completedAt);
  const label = INDUSTRIAL_OPERATION_LABELS[operationId];
  const currentUser = getCurrentProjectUser();

  const confirmComplete = () => {
    actions.completeIndustrialOperacao(operationId, notas.trim() || undefined);
    setPending(false);
    setNotas("");
  };

  const cardStyle = useMemo(
    () => ({
      padding: 16,
      borderRadius: 8,
      border: "1px solid var(--card-border)",
      background: done ? "rgba(34, 197, 94, 0.12)" : "var(--card-bg)",
    }),
    [done]
  );

  return (
    <div className="bottom-info-hub__card" style={cardStyle}>
      <h3 className="bottom-info-hub__card-title">{label}</h3>
      <div style={{ fontSize: 12, display: "grid", gap: 6, marginBottom: 12 }}>
        <div>
          Estado: <strong>{done ? "Concluída" : "Pendente"}</strong>
        </div>
        <div>Funcionário: {state?.employeeName ?? state?.employeeId ?? "—"}</div>
        <div>
          Concluído em:{" "}
          {state?.completedAt ? new Date(state.completedAt).toLocaleString("pt-PT") : "—"}
        </div>
        <div>Notas: {state?.notas?.trim() || "—"}</div>
      </div>
      {!done ? (
        <Button variant="secondary" onClick={() => setPending(true)} style={{ fontSize: 12 }}>
          Concluir operação
        </Button>
      ) : null}

      {pending ? (
        <ModalPortal>
          <div className="modal-overlay" role="dialog" aria-modal onClick={() => setPending(false)}>
            <div className="modal-card" style={{ width: 400, padding: 16 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-title" style={{ marginBottom: 8 }}>
                Concluir — {label}
              </div>
              <p style={{ fontSize: 12, margin: "0 0 8px", color: "var(--text-muted)" }}>
                Funcionário: <strong>{currentUser.ownerName}</strong>
              </p>
              <label style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                Notas (opcional)
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  style={{ display: "block", width: "100%", marginTop: 4, resize: "vertical" }}
                />
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => setPending(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={confirmComplete}>
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
