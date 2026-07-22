import type { CSSProperties } from "react";
import type {
  IndustrialOnlineAnalysisEditableColumn,
  IndustrialOnlineAnalysisRow,
} from "@/core/industrial/onlineAnalysis/industrialOnlineAnalysisViewTypes";

type Props = {
  title: string;
  modified?: boolean;
  columns: IndustrialOnlineAnalysisEditableColumn[];
  rows: IndustrialOnlineAnalysisRow[];
  editing?: boolean;
  onCellChange?: (rowId: string, fieldKey: string, value: string) => void;
  onDeleteRow?: (rowId: string) => void;
  onAddRow?: () => void;
};

const wrap: CSSProperties = {
  marginBottom: 28,
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  overflow: "hidden",
};

const titleStyle: CSSProperties = {
  margin: 0,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 600,
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#0f172a",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid #e2e8f0",
  background: "#f1f5f9",
  color: "#334155",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const emptyStyle: CSSProperties = {
  padding: 16,
  fontSize: 13,
  color: "#64748b",
};

const badge: CSSProperties = {
  display: "inline-block",
  fontSize: 10,
  fontWeight: 700,
  padding: "2px 6px",
  borderRadius: 999,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fcd34d",
};

const badgeNew: CSSProperties = {
  ...badge,
  background: "#dbeafe",
  color: "#1e40af",
  border: "1px solid #93c5fd",
};

function cellBg(row: IndustrialOnlineAnalysisRow, fieldKey: string): string | undefined {
  if (row.pendingDelete) return "#fef2f2";
  if (row.origin === "added") return "#eff6ff";
  if (row.modifiedFields.includes(fieldKey)) return "#fffbeb";
  if (row.modifiedFields.length > 0) return "#fffbeb88";
  return undefined;
}

export default function IndustrialOnlineAnalysisTable({
  title,
  modified,
  columns,
  rows,
  editing,
  onCellChange,
  onDeleteRow,
  onAddRow,
}: Props) {
  const visibleRows = editing ? rows : rows.filter((r) => !r.pendingDelete);

  return (
    <section style={wrap} aria-label={title}>
      <h2 style={titleStyle}>
        <span>{title}</span>
        {modified ? <span style={badge}>Modificado</span> : null}
        {editing && onAddRow ? (
          <button
            type="button"
            onClick={onAddRow}
            style={{
              marginLeft: "auto",
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Adicionar linha
          </button>
        ) : null}
      </h2>
      {visibleRows.length === 0 ? (
        <p style={emptyStyle} role="status">
          Sem linhas para este documento.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} style={thStyle} scope="col">
                    {c.label}
                  </th>
                ))}
                {editing ? (
                  <th style={thStyle} scope="col">
                    Ações
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.rowId}
                  data-row-id={row.rowId}
                  style={{
                    opacity: row.pendingDelete ? 0.55 : 1,
                    textDecoration: row.pendingDelete ? "line-through" : undefined,
                  }}
                >
                  {columns.map((c) => {
                    const bg = cellBg(row, c.key);
                    const value = row.cells[c.key] ?? "";
                    const canEdit = Boolean(editing && c.editable && !row.pendingDelete);
                    const inputId = `analise-${row.rowId}-${c.key}`;
                    return (
                      <td
                        key={c.key}
                        data-row-id={row.rowId}
                        data-field={c.key}
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid #f1f5f9",
                          color: "#1e293b",
                          verticalAlign: "top",
                          background: bg,
                          boxShadow: row.modifiedFields.includes(c.key)
                            ? "inset 3px 0 0 #f59e0b"
                            : undefined,
                        }}
                      >
                        {canEdit ? (
                          <>
                            <label htmlFor={inputId} className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                              {c.label}
                            </label>
                            <input
                              id={inputId}
                              aria-label={c.label}
                              value={value}
                              inputMode={c.key === "qtd" ? "numeric" : undefined}
                              onChange={(e) => onCellChange?.(row.rowId, c.key, e.target.value)}
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "4px 6px",
                                border: "1px solid #cbd5e1",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            />
                          </>
                        ) : (
                          <span>
                            {value || "—"}
                            {row.origin === "added" && c === columns[0] ? (
                              <span style={{ ...badgeNew, marginLeft: 6 }}>Nova</span>
                            ) : null}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {editing ? (
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9" }}>
                      <button
                        type="button"
                        aria-label={`Remover linha ${row.rowId}`}
                        onClick={() => onDeleteRow?.(row.rowId)}
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          borderRadius: 4,
                          border: "1px solid #fecaca",
                          background: "#fff",
                          color: "#b91c1c",
                          cursor: "pointer",
                        }}
                      >
                        Remover
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
