import type { ScalingPreviewData } from "../../../core/viewer/scalingPreview";
import { formatDimensionList } from "../../../core/viewer/scalingPreview";
import ContextMenuPortal from "./ContextMenuPortal";

type ScalingPreviewDialogProps = {
  preview: ScalingPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ScalingPreviewDialog({ preview, onConfirm, onCancel }: ScalingPreviewDialogProps) {
  const modeLabel = preview.mode === "ratio" ? "Escala Percentual" : "Adicionar Diferença";

  return (
    <ContextMenuPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scaling-preview-title"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10001,
        }}
        onPointerDown={onCancel}
      >
        <div
          style={{
            width: "min(520px, 92vw)",
            maxHeight: "80vh",
            overflow: "auto",
            background: "var(--popover-bg, #1e293b)",
            border: "1px solid var(--popover-border, #334155)",
            borderRadius: 10,
            padding: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <h3 id="scaling-preview-title" style={{ margin: "0 0 8px", fontSize: 16 }}>
            Pré-visualização — {modeLabel}
          </h3>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-muted, #94a3b8)" }}>
            Máximo atual: {Math.round(preview.oldMax)} mm → novo: {Math.round(preview.newMax)} mm
            {preview.mode === "additive"
              ? ` (Δ ${preview.delta >= 0 ? "+" : ""}${Math.round(preview.delta)} mm)`
              : ` (× ${preview.ratio.toFixed(3)})`}
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted, #94a3b8)" }}>
                <th style={{ padding: "6px 4px" }}>Item</th>
                <th style={{ padding: "6px 4px" }}>Antes (mm)</th>
                <th style={{ padding: "6px 4px" }}>Depois (mm)</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.encodedId} style={{ borderTop: "1px solid var(--popover-border, #334155)" }}>
                  <td style={{ padding: "8px 4px" }}>{row.label}</td>
                  <td style={{ padding: "8px 4px" }}>{formatDimensionList(row.before)}</td>
                  <td style={{ padding: "8px 4px", color: "#7dd3fc" }}>{formatDimensionList(row.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="button button-ghost" onClick={onCancel}>
              Cancelar
            </button>
            <button type="button" className="button button-primary" onClick={onConfirm}>
              Aplicar alterações
            </button>
          </div>
        </div>
      </div>
    </ContextMenuPortal>
  );
}
