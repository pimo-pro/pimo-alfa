import type { CSSProperties } from "react";

type Props = {
  selectedCount: number;
  modifiedCount: number;
  hasAnyOverrides: boolean;
  busy: boolean;
  message: string | null;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onGenerateSelected: () => void;
  onGenerateModified: () => void;
  onGenerateAll: () => void;
  onGenerateOriginals: () => void;
};

const bar: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginBottom: 16,
  padding: 12,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#fff",
};

const row: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const btn: CSSProperties = {
  padding: "7px 11px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
  color: "#0f172a",
};

const btnPrimary: CSSProperties = {
  ...btn,
  border: "none",
  background: "#0f172a",
  color: "#fff",
};

export default function IndustrialOnlineAnalysisDownloadBar({
  selectedCount,
  modifiedCount,
  hasAnyOverrides,
  busy,
  message,
  onSelectAll,
  onClearSelection,
  onGenerateSelected,
  onGenerateModified,
  onGenerateAll,
  onGenerateOriginals,
}: Props) {
  return (
    <section style={bar} aria-label="Download de PDFs industriais" aria-busy={busy}>
      {hasAnyOverrides ? (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "#92400e",
            background: "#fffbeb",
            padding: "8px 10px",
            borderRadius: 6,
          }}
          role="status"
        >
          Existem edições documentais. Os downloads em modo efetivo (e o ZIP clássico nos PDFs)
          reflectem-nas. A cutlist editada também alimenta as etiquetas UEE (material/obs/qtd/peça/caixa).
          CNC/TCN/drill não são alterados. Este pacote não é o «arquivo completo».
        </p>
      ) : null}

      <div style={row}>
        <button type="button" disabled={busy} onClick={onSelectAll} style={btn}>
          Selecionar todos
        </button>
        <button type="button" disabled={busy || selectedCount === 0} onClick={onClearSelection} style={btn}>
          Limpar seleção
        </button>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
          {modifiedCount > 0
            ? ` · ${modifiedCount} modificado${modifiedCount === 1 ? "" : "s"}`
            : ""}
        </span>
      </div>

      <div style={row}>
        <button
          type="button"
          disabled={busy || selectedCount === 0}
          onClick={onGenerateSelected}
          style={btnPrimary}
        >
          {busy ? "A gerar…" : "Gerar PDFs selecionados"}
        </button>
        <button
          type="button"
          disabled={busy || modifiedCount === 0}
          onClick={onGenerateModified}
          style={btn}
        >
          Gerar PDFs modificados
        </button>
        <button type="button" disabled={busy} onClick={onGenerateAll} style={btn}>
          Gerar todos PDFs industriais
        </button>
        <button type="button" disabled={busy} onClick={onGenerateOriginals} style={btn}>
          Gerar PDFs originais
        </button>
      </div>

      {message ? (
        <p
          style={{ margin: 0, fontSize: 12, color: "#334155" }}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
