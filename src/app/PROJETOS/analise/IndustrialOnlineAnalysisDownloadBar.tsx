import type { CSSProperties } from "react";

import Button from "@/components/ui/Button";

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
  border: "1px solid var(--card-border)",
  borderRadius: 8,
  background: "var(--card-bg)",
};

const row: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
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
        <Button type="button" variant="secondary" disabled={busy} onClick={onSelectAll}>
          Selecionar todos
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || selectedCount === 0}
          onClick={onClearSelection}
        >
          Limpar seleção
        </Button>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
          {modifiedCount > 0
            ? ` — ${modifiedCount} modificado${modifiedCount === 1 ? "" : "s"}`
            : ""}
        </span>
      </div>

      <div style={row}>
        <Button
          type="button"
          variant="primary"
          disabled={busy || selectedCount === 0}
          onClick={onGenerateSelected}
        >
          {busy ? "A gerar…" : "Gerar PDFs selecionados"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || modifiedCount === 0}
          onClick={onGenerateModified}
        >
          Gerar PDFs modificados
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onGenerateAll}>
          Gerar todos PDFs industriais
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onGenerateOriginals}>
          Gerar PDFs originais
        </Button>
      </div>

      {message ? (
        <p
          style={{ margin: 0, fontSize: 12, color: "var(--text-main)" }}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
