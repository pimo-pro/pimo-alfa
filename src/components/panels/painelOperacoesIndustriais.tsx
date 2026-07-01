import { useMemo, useState } from "react";
import { useProject } from "../../context/useProject";
import { getCurrentProjectUser } from "../../core/projects/currentUser";
import {
  INDUSTRIAL_OPERATION_IDS,
  INDUSTRIAL_OPERATION_LABELS,
  type IndustrialOperationId,
} from "../../core/industrial/industrialPieceEditsTypes";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import { ModalPortal } from "../ui/ModalPortal";

export default function PainelOperacoesIndustriais({ embedded }: { embedded?: boolean } = {}) {
  const { project, actions } = useProject();
  const operacoes = project.industrialOperacoes ?? {};
  const [pendingOp, setPendingOp] = useState<IndustrialOperationId | null>(null);
  const [notas, setNotas] = useState("");

  const rows = useMemo(
    () =>
      INDUSTRIAL_OPERATION_IDS.map((id) => ({
        id,
        label: INDUSTRIAL_OPERATION_LABELS[id],
        state: operacoes[id],
      })),
    [operacoes]
  );

  const completedCount = rows.filter((r) => r.state?.completedAt).length;

  const openComplete = (id: IndustrialOperationId) => {
    setPendingOp(id);
    setNotas("");
  };

  const confirmComplete = () => {
    if (!pendingOp) return;
    actions.completeIndustrialOperacao(pendingOp, notas.trim() || undefined);
    setPendingOp(null);
    setNotas("");
  };

  const currentUser = getCurrentProjectUser();

  return (
    <Panel title={embedded ? undefined : "Operações Industriais"}>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0 }}>
        Registo de conclusão por operação (funcionário, timestamp, notas). Linha verde quando concluída.
        Sincroniza com o Painel Mestre e PIMO TRAK ao enviar para fábrica.
      </p>
      <div style={{ fontSize: 12, marginBottom: 10 }}>
        Progresso: <strong>{completedCount}</strong> / {rows.length} operações
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            {["Operação", "Estado", "Funcionário", "Concluído em", "Notas", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px", color: "var(--text-muted)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const done = Boolean(row.state?.completedAt);
            return (
              <tr
                key={row.id}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: done ? "rgba(34, 197, 94, 0.14)" : "transparent",
                }}
              >
                <td style={{ padding: "8px", fontWeight: 600 }}>{row.label}</td>
                <td style={{ padding: "8px" }}>{done ? "Concluída" : "Pendente"}</td>
                <td style={{ padding: "8px" }}>
                  {row.state?.employeeName ?? row.state?.employeeId ?? "—"}
                </td>
                <td style={{ padding: "8px" }}>
                  {row.state?.completedAt
                    ? new Date(row.state.completedAt).toLocaleString("pt-PT")
                    : "—"}
                </td>
                <td style={{ padding: "8px", maxWidth: 160, fontSize: 11 }}>
                  {row.state?.notas?.trim() || "—"}
                </td>
                <td style={{ padding: "8px" }}>
                  {!done ? (
                    <Button variant="secondary" onClick={() => openComplete(row.id)} style={{ fontSize: 11 }}>
                      Concluir
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pendingOp ? (
        <ModalPortal>
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal
            onClick={() => setPendingOp(null)}
          >
            <div className="modal-card" style={{ width: 400, padding: 16 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-title" style={{ marginBottom: 8 }}>
                Concluir — {INDUSTRIAL_OPERATION_LABELS[pendingOp]}
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
                  placeholder="Observações da operação..."
                />
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => setPendingOp(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={confirmComplete}>
                  Confirmar conclusão
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </Panel>
  );
}
