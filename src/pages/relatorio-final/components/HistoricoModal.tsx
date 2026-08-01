import { sortHistoryChronological, type ReportHistoryEntry } from "@/core/projectReport";
import {
  reportTable,
  reportTableWrap,
  reportTd,
  reportTh,
} from "../reportStyles";
import EditableModal from "./EditableModal";

type Props = {
  open: boolean;
  history: ReportHistoryEntry[];
  onClose: () => void;
};

function formatTs(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-PT");
  } catch {
    return iso;
  }
}

export default function HistoricoModal({ open, history, onClose }: Props) {
  const rows = sortHistoryChronological(history ?? [], true);

  return (
    <EditableModal open={open} title="Historico de alteracoes" onClose={onClose}>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-muted)" }}>
        Registo local das edicoes manuais do relatorio (mais recentes primeiro).
      </p>
      <div style={reportTableWrap}>
        <table style={reportTable}>
          <thead>
            <tr>
              <th style={reportTh}>Data</th>
              <th style={reportTh}>Utilizador</th>
              <th style={reportTh}>Campo</th>
              <th style={reportTh}>Antes</th>
              <th style={reportTh}>Depois</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id}>
                <td style={reportTd}>{formatTs(h.timestamp)}</td>
                <td style={reportTd}>{h.user}</td>
                <td style={reportTd}>{h.path}</td>
                <td style={{ ...reportTd, maxWidth: 160, wordBreak: "break-word" }}>
                  {h.oldValue || "-"}
                </td>
                <td style={{ ...reportTd, maxWidth: 160, wordBreak: "break-word" }}>
                  {h.newValue || "-"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={reportTd} colSpan={5}>
                  Sem alteracoes registadas ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </EditableModal>
  );
}
