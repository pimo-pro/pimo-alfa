/**
 * Painel focado em Ferragens Industriais (todas as caixas).
 * Conteúdo extraído do CutlistPanel; exibido no overlay da BottomInfoToolbar.
 */

import Panel from "../ui/Panel";
import { useCutlistData } from "../../hooks/useCutlistData";
import { formatCurrency } from "../../utils/formatting";

const aplicacaoFerragens: Record<string, string> = {
  dobradicas: "Portas",
  corredicas: "Gavetas",
  suportes_prateleira: "Prateleiras",
};

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

export default function FerragensPanel() {
  const { allFerragens, allOrlaFerragens, allRemates, boxes } = useCutlistData();

  if (boxes.length === 0) {
    return (
      <Panel title="Ferragens Industriais">
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Adicione caixas para visualizar ferragens.
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Ferragens Industriais (todas as caixas)">
      <div style={sectionTitleStyle}>Ferragens Industriais (todas as caixas)</div>
      {allFerragens.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sem ferragens.</div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Caixa</th>
              <th style={headerCellStyle}>Ferragem</th>
              <th style={{ ...headerCellStyle, textAlign: "center" }}>Quantidade</th>
              <th style={headerCellStyle}>Aplicação</th>
              <th style={{ ...headerCellStyle, textAlign: "right" }}>Custo (€)</th>
            </tr>
          </thead>
          <tbody>
            {allFerragens.map((ferragem) => (
              <tr key={ferragem.key}>
                <td style={bodyCellStyle}>{ferragem.boxNome}</td>
                <td style={bodyCellStyle}>{ferragem.tipo}</td>
                <td style={{ ...bodyCellStyle, textAlign: "center" }}>{ferragem.quantidade}</td>
                <td style={bodyCellStyle}>{aplicacaoFerragens[ferragem.tipo] ?? "Geral"}</td>
                <td style={costCellStyle}>{formatCurrency(ferragem.custo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ ...sectionTitleStyle, marginTop: 20 }}>Orla (V1)</div>
      {allOrlaFerragens.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sem orla configurada.</div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Caixa</th>
              <th style={headerCellStyle}>Orla</th>
              <th style={headerCellStyle}>Peça</th>
              <th style={{ ...headerCellStyle, textAlign: "center" }}>Metros</th>
              <th style={headerCellStyle}>Tipo</th>
              <th style={{ ...headerCellStyle, textAlign: "right" }}>Custo (€)</th>
            </tr>
          </thead>
          <tbody>
            {allOrlaFerragens.map((linha) => (
              <tr key={linha.key}>
                <td style={bodyCellStyle}>{linha.boxNome}</td>
                <td style={bodyCellStyle}>{linha.presetNome}</td>
                <td style={bodyCellStyle}>{linha.pieceNome ?? "—"}</td>
                <td style={{ ...bodyCellStyle, textAlign: "center" }}>
                  {linha.metros.toFixed(2)}
                </td>
                <td style={bodyCellStyle}>
                  {linha.tipo === "orla_junto" ? "Orla Junto" : "Normal"}
                </td>
                <td style={costCellStyle}>{formatCurrency(linha.custo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ ...sectionTitleStyle, marginTop: 20 }}>Remates</div>
      {allRemates.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sem remates configurados.</div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Caixa</th>
              <th style={headerCellStyle}>Remate</th>
              <th style={headerCellStyle}>Material</th>
              <th style={headerCellStyle}>Dimensões</th>
              <th style={{ ...headerCellStyle, textAlign: "center" }}>Qtd.</th>
              <th style={{ ...headerCellStyle, textAlign: "right" }}>Custo (€)</th>
            </tr>
          </thead>
          <tbody>
            {allRemates.map((linha) => (
              <tr key={linha.key}>
                <td style={bodyCellStyle}>{linha.boxNome}</td>
                <td style={bodyCellStyle}>{linha.nome}</td>
                <td style={bodyCellStyle}>{linha.material}</td>
                <td style={bodyCellStyle}>
                  {linha.largura_mm} × {linha.altura_mm} × {linha.profundidade_mm} mm
                </td>
                <td style={{ ...bodyCellStyle, textAlign: "center" }}>{linha.quantidade}</td>
                <td style={costCellStyle}>{formatCurrency(linha.custo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
