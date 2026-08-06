import type { CSSProperties } from "react";
import type {
  IndustrialOnlineAnalysisEditableColumn,
  IndustrialOnlineAnalysisRow,
} from "@/core/industrial/onlineAnalysis/industrialOnlineAnalysisViewTypes";

import Button from "@/components/ui/Button";

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
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  borderRadius: 8,
  overflow: "hidden",
};

const titleStyle: CSSProperties = {
  margin: 0,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 600,
  borderBottom: "1px solid var(--card-border)",
  background: "rgba(127,127,127,0.06)",
  color: "var(--text-main)",
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
  borderBottom: "1px solid var(--card-border)",
  background: "rgba(127,127,127,0.08)",
  color: "var(--text-main)",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const emptyStyle: CSSProperties = {
  padding: 16,
  fontSize: 13,
  color: "var(--text-muted)",
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
          <Button
            type="button"
            variant="secondary"
            onClick={onAddRow}
            style={{ marginLeft: "auto", fontSize: 12, padding: "4px 10px", minHeight: "auto" }}
          >
            Adicionar linha
          </Button>
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
                          borderBottom: "1px solid var(--border, rgba(127,127,127,0.15))",
                          color: "var(--text-main)",
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
                                border: "1px solid var(--input-border, var(--ui-color-input-border))",
                                borderRadius: 4,
                                fontSize: 12,
                                background: "var(--input-bg, var(--ui-color-input-bg))",
                                color: "var(--text-main)",
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
                    <td
                      style={{
                        padding: "7px 10px",
                        borderBottom: "1px solid var(--border, rgba(127,127,127,0.15))",
                      }}
                    >
                      <Button
                        type="button"
                        variant="danger"
                        aria-label={`Remover linha ${row.rowId}`}
                        onClick={() => onDeleteRow?.(row.rowId)}
                        style={{ fontSize: 11, padding: "4px 8px", minHeight: "auto" }}
                      >
                        Remover
                      </Button>
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
