import { useMemo, useState } from "react";
import { useProject } from "../../context/useProject";
import { buildCutlistItemsForIndustrialExport } from "../../core/fabrication/buildCutlistItemsForIndustrialExport";
import { buildResumoIndustriaisRows } from "../../core/industrial/industrialBottomSectionData";
import Panel from "../ui/Panel";
import PieceObservacoesOverlay from "../layout/overlays/PieceObservacoesOverlay";

export default function PainelResumoIndustriais() {
  const { project } = useProject();
  const [obsPiece, setObsPiece] = useState<{ id: string; label: string } | null>(null);
  const boxes = project.boxes ?? [];

  const items = useMemo(
    () =>
      buildCutlistItemsForIndustrialExport({
        boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName: project.projectName,
        remates: project.remates ?? [],
        rodapes: project.rodapes ?? [],
        extractedPartsByBoxId: project.extractedPartsByBoxId,
      }),
    [boxes, project]
  );

  const rows = useMemo(
    () => buildResumoIndustriaisRows(items, boxes, project.pieceObservacoes),
    [items, boxes, project.pieceObservacoes]
  );

  if (boxes.length === 0) {
    return (
      <Panel title="Resumo Industriais — Painel Mestre">
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Adicione caixas para controlar peças industriais.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Resumo Industriais — Painel Mestre">
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0 }}>
        Edite observações por peça. Alterações refletem-se nos PDFs industriais (cutlist, técnico, etiquetas).
        Medidas, mover e apagar — integração PIMO TRAK em breve.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
              {["Caixa", "Peça", "Dimensões", "Observações", "Ações"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const item = items[idx];
              return (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: row.modified ? "rgba(250, 204, 21, 0.12)" : "transparent",
                  }}
                >
                  <td style={{ padding: "6px 8px" }}>{row.caixa}</td>
                  <td style={{ padding: "6px 8px" }}>{row.peca}</td>
                  <td style={{ padding: "6px 8px" }}>{row.dimensoes}</td>
                  <td style={{ padding: "6px 8px", maxWidth: 220 }}>{row.observacoes || "—"}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <button
                      type="button"
                      className="button button-ghost"
                      style={{ fontSize: 10, padding: "2px 6px" }}
                      onClick={() => setObsPiece({ id: item.id, label: `${row.caixa} — ${row.peca}` })}
                    >
                      Observações
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {obsPiece ? (
        <PieceObservacoesOverlay
          pieceId={obsPiece.id}
          pieceName={obsPiece.label}
          onClose={() => setObsPiece(null)}
        />
      ) : null}
    </Panel>
  );
}
