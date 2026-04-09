import { useState } from "react";
import Panel from "../ui/Panel";
import { useCutlistData } from "../../hooks/useCutlistData";
import { formatCurrency } from "../../utils/formatting";
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

const costCellStyle: React.CSSProperties = {
  ...bodyCellStyle,
  textAlign: "right",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

const totalValueStyle: React.CSSProperties = {
  color: "rgba(74, 222, 128, 0.9)",
  textAlign: "right",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--text-main)",
  marginBottom: 8,
};

const aplicacaoFerragens: Record<string, string> = {
  dobradicas: "Portas",
  corredicas: "Gavetas",
  suportes_prateleira: "Prateleiras",
};

export default function CutlistPanel() {
  const [showBoxDepthCols, setShowBoxDepthCols] = useState(false);
  const data = useCutlistData();
  const {
    boxes,
    allPaineis,
    allPortas,
    allGavetas,
    allFerragens,
    ferragensIndustriaisDetalhado,
    ferragensPorComponente,
    totalAreaM2,
    totalPecas,
    totalFerragensQty,
    custoTotalPaineis,
    custoTotalPortas,
    custoTotalGavetas,
    custoTotalFerragens,
    custoTotal,
  } = data;

  if (boxes.length === 0) {
    return (
      <Panel title="Cutlist Industrial">
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Adicione caixas no painel direito para visualizar a cutlist industrial.
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Cutlist Industrial">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ ...sectionTitleStyle, marginBottom: 0 }}>Painéis (todas as caixas)</div>
            <button
              type="button"
              onClick={() => setShowBoxDepthCols((v) => !v)}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: "var(--radius)",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-main)",
                cursor: "pointer",
              }}
            >
              {showBoxDepthCols ? "Ocultar" : "Mostrar"} profundidade da caixa
            </button>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Caixa</th>
                {showBoxDepthCols && (
                  <>
                    <th
                      style={headerCellStyle}
                      title="Profundidade externa total da caixa (mm). Não é a profundidade da peça listada."
                    >
                      P. ext. caixa (mm)
                    </th>
                    <th
                      style={headerCellStyle}
                      title="Profundidade interna útil da caixa (mm), modelo FASE 3/4. Não é a profundidade da peça."
                    >
                      P. útil int. (mm)
                    </th>
                  </>
                )}
                <th style={headerCellStyle}>Tipo</th>
                <th style={headerCellStyle}>Largura (mm)</th>
                <th style={headerCellStyle}>Altura (mm)</th>
                <th style={headerCellStyle}>Espessura (mm)</th>
                <th style={headerCellStyle}>Orientação</th>
                <th style={{ ...headerCellStyle, textAlign: "center" }}>Qtd</th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>Custo (€)</th>
              </tr>
            </thead>
            <tbody>
              {allPaineis.map((painel) => (
                <tr key={painel.key}>
                  <td style={bodyCellStyle}>{painel.boxNome}</td>
                  {showBoxDepthCols && (
                    <>
                      <td style={bodyCellStyle}>{painel.boxProfundidadeExternaMm}</td>
                      <td style={bodyCellStyle}>{painel.boxProfundidadeInternaUtilMm}</td>
                    </>
                  )}
                  <td style={bodyCellStyle}>{painel.tipo}</td>
                  <td style={bodyCellStyle}>{painel.largura_mm}</td>
                  <td style={bodyCellStyle}>{painel.altura_mm}</td>
                  <td style={bodyCellStyle}>{painel.espessura_mm}</td>
                  <td style={bodyCellStyle}>{painel.orientacaoFibra}</td>
                  <td style={{ ...bodyCellStyle, textAlign: "center" }}>{painel.quantidade}</td>
                  <td style={costCellStyle}>{formatCurrency(painel.custo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {allPortas.length > 0 && (
          <div>
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
                    <td style={costCellStyle}>{formatCurrency(porta.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {allGavetas.length > 0 && (
          <div>
            <div style={sectionTitleStyle}>Gavetas (todas as caixas)</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={headerCellStyle}>Caixa</th>
                  <th style={headerCellStyle}>Largura (mm)</th>
                  <th style={headerCellStyle}>Altura (mm)</th>
                  <th style={headerCellStyle}>Profundidade (mm)</th>
                  <th style={headerCellStyle}>Espessura (mm)</th>
                  <th style={{ ...headerCellStyle, textAlign: "center" }}>Corrediças</th>
                  <th style={{ ...headerCellStyle, textAlign: "right" }}>Custo (€)</th>
                </tr>
              </thead>
              <tbody>
                {allGavetas.map((gaveta) => (
                  <tr key={gaveta.key}>
                    <td style={bodyCellStyle}>{gaveta.boxNome}</td>
                    <td style={bodyCellStyle}>{gaveta.largura_mm}</td>
                    <td style={bodyCellStyle}>{gaveta.altura_mm}</td>
                    <td style={bodyCellStyle}>{gaveta.profundidade_mm}</td>
                    <td style={bodyCellStyle}>{gaveta.espessura_mm}</td>
                    <td style={{ ...bodyCellStyle, textAlign: "center" }}>{gaveta.corrediças}</td>
                    <td style={costCellStyle}>{formatCurrency(gaveta.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
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
        </div>

        <div>
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
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 10,
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
      </div>
    </Panel>
  );
}
