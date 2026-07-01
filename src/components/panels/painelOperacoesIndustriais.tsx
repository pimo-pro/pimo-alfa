import { useMemo } from "react";
import { useProject } from "../../context/useProject";
import {
  INDUSTRIAL_OPERATION_IDS,
  INDUSTRIAL_OPERATION_LABELS,
  type IndustrialOperationId,
} from "../../core/industrial/industrialPieceEditsTypes";
import Panel from "../ui/Panel";
import Button from "../ui/Button";

export default function PainelOperacoesIndustriais() {
  const { project, actions } = useProject();
  const operacoes = project.industrialOperacoes ?? {};

  const rows = useMemo(
    () =>
      INDUSTRIAL_OPERATION_IDS.map((id) => ({
        id,
        label: INDUSTRIAL_OPERATION_LABELS[id],
        state: operacoes[id],
      })),
    [operacoes]
  );

  const handleComplete = (id: IndustrialOperationId) => {
    actions.completeIndustrialOperacao(id);
  };

  return (
    <Panel title="Operações Industriais">
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0 }}>
        Registo de conclusão por operação (timestamp + funcionário placeholder). Linha verde quando concluída.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            {["Operação", "Estado", "Funcionário", "Concluído em", ""].map((h) => (
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
                <td style={{ padding: "8px" }}>{row.state?.employeeId ?? "—"}</td>
                <td style={{ padding: "8px" }}>
                  {row.state?.completedAt
                    ? new Date(row.state.completedAt).toLocaleString("pt-PT")
                    : "—"}
                </td>
                <td style={{ padding: "8px" }}>
                  {!done ? (
                    <Button variant="secondary" onClick={() => handleComplete(row.id)} style={{ fontSize: 11 }}>
                      Concluir
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
