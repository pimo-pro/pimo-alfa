/**
 * Painel focado em Totais do Projeto (project.boxes).
 * Conteúdo extraído do CutlistPanel; exibido no overlay da BottomInfoToolbar.
 */

import Panel from "../ui/Panel";
import { useCutlistData } from "../../hooks/useCutlistData";
import { formatCurrency } from "../../utils/formatting";

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--text-main)",
  marginBottom: 8,
};
const totalValueStyle: React.CSSProperties = {
  color: "rgba(74, 222, 128, 0.9)",
  textAlign: "right",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

export default function TotaisProjetoPanel() {
  const {
    boxes,
    totalAreaM2,
    totalPecas,
    totalFerragensQty,
    custoTotalPaineis,
    custoTotalPortas,
    custoTotalGavetas,
    custoTotalFerragens,
    custoTotal,
  } = useCutlistData();

  if (boxes.length === 0) {
    return (
      <Panel title="Totais do Projeto">
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Adicione caixas para visualizar totais.
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Totais do Projeto (project.boxes)">
      <div
        style={{
          fontSize: 12,
          color: "var(--text-main)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ ...sectionTitleStyle, marginBottom: 4 }}>Totais do Projeto (project.boxes)</div>
        <div>Área total de painéis: {totalAreaM2.toFixed(3)} m²</div>
        <div>Quantidade total de peças: {totalPecas}</div>
        <div>Quantidade total de ferragens: {totalFerragensQty}</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Custo total de painéis:</span>
          <span style={totalValueStyle}>{formatCurrency(custoTotalPaineis)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Custo total de portas:</span>
          <span style={totalValueStyle}>{formatCurrency(custoTotalPortas)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Custo total de gavetas:</span>
          <span style={totalValueStyle}>{formatCurrency(custoTotalGavetas)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Custo total de ferragens:</span>
          <span style={totalValueStyle}>{formatCurrency(custoTotalFerragens)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
          <span>Custo total do projeto:</span>
          <span style={totalValueStyle}>{formatCurrency(custoTotal)}</span>
        </div>
      </div>
    </Panel>
  );
}
