/**
 * Painel focado em Ferragens Industriais (detalhado por tipo de componente).
 * Conteúdo extraído do CutlistPanel; exibido no overlay da BottomInfoToolbar.
 */

import Panel from "../ui/Panel";
import { useCutlistData } from "../../hooks/useCutlistData";
import type { FerragemIndustrial } from "../../core/industriais/ferragensIndustriais";

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
};
const headerCellStyle: React.CSSProperties = {
  padding: "6px 6px",
  textAlign: "left",
  color: "var(--text-muted)",
  fontWeight: 600,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};
const bodyCellStyle: React.CSSProperties = {
  padding: "6px 6px",
  color: "var(--text-main)",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--text-main)",
  marginBottom: 8,
};

export default function FerragensDetalhadoPanel() {
  const { ferragensIndustriaisDetalhado, ferragensPorComponente, boxes } = useCutlistData();

  if (boxes.length === 0) {
    return (
      <Panel title="Ferragens Industriais (detalhado)">
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Adicione caixas para visualizar.
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Ferragens Industriais (detalhado)">
      <div style={sectionTitleStyle}>Ferragens Industriais (detalhado)</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
        Por tipo de componente — ferragens e furos (Component Types + regras de furação).
      </div>
      {ferragensIndustriaisDetalhado.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Nenhuma ferragem industrial configurada.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(Array.from(ferragensPorComponente.entries()) as [string, FerragemIndustrial[]][]).map(
            ([componenteId, itens]) => (
              <div
                key={componenteId}
                style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "6px 10px",
                    background: "rgba(255,255,255,0.04)",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {componenteId}
                </div>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={headerCellStyle}>ferragem_id</th>
                      <th style={{ ...headerCellStyle, textAlign: "center" }}>Quantidade</th>
                      <th style={headerCellStyle}>aplicar_em</th>
                      <th style={headerCellStyle}>tipo_furo</th>
                      <th style={headerCellStyle}>profundidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr key={`${componenteId}-${idx}`}>
                        <td style={bodyCellStyle}>{item.ferragem_id}</td>
                        <td style={{ ...bodyCellStyle, textAlign: "center" }}>{item.quantidade}</td>
                        <td style={bodyCellStyle}>
                          {item.aplicar_em.length > 0 ? item.aplicar_em.join(", ") : "—"}
                        </td>
                        <td style={bodyCellStyle}>{item.tipo_furo ?? "—"}</td>
                        <td style={bodyCellStyle}>
                          {item.profundidade != null ? `${item.profundidade} mm` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </Panel>
  );
}
