/**
 * Painel focado em Portas (todas as caixas).
 * Conteúdo extraído do CutlistPanel; exibido no overlay da BottomInfoToolbar.
 */

import Panel from "../ui/Panel";
import { useCutlistData } from "../../hooks/useCutlistData";

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
const costCellStyle: React.CSSProperties = {
  ...bodyCellStyle,
  textAlign: "right",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--text-main)",
  marginBottom: 8,
};

export default function PortasPanel() {
  const { allPortas, boxes } = useCutlistData();

  if (boxes.length === 0) {
    return (
      <Panel title="Portas">
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Adicione caixas com portas para visualizar.
        </div>
      </Panel>
    );
  }

  if (allPortas.length === 0) {
    return (
      <Panel title="Portas">
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Nenhuma porta no projeto.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Portas (todas as caixas)">
      <div style={sectionTitleStyle}>Portas (todas as caixas)</div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headerCellStyle}>Caixa</th>
            <th style={headerCellStyle}>Tipo</th>
            <th style={headerCellStyle}>Largura (mm)</th>
            <th style={headerCellStyle}>Altura (mm)</th>
            <th style={headerCellStyle}>Espessura (mm)</th>
            <th style={{ ...headerCellStyle, textAlign: "center" }}>Nº dobradiças</th>
            <th style={{ ...headerCellStyle, textAlign: "right" }}>Custo (€)</th>
          </tr>
        </thead>
        <tbody>
          {allPortas.map((porta) => (
            <tr key={porta.key}>
              <td style={bodyCellStyle}>{porta.boxNome}</td>
              <td style={bodyCellStyle}>{porta.tipo}</td>
              <td style={bodyCellStyle}>{porta.largura_mm}</td>
              <td style={bodyCellStyle}>{porta.altura_mm}</td>
              <td style={bodyCellStyle}>{porta.espessura_mm}</td>
              <td style={{ ...bodyCellStyle, textAlign: "center" }}>{porta.dobradicas}</td>
              <td style={costCellStyle}>{porta.custo.toFixed(2)} €</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
