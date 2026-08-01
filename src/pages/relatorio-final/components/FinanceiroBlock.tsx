import { useState } from "react";
import Button from "@/components/ui/Button";
import {
  makeReportId,
  recalcFinanceiro,
  updateFinanceiroLinha,
  type ProjectReportFinanceiro,
  type ReportFinanceiroDetalhe,
  type ReportFinanceiroLinha,
  type ReportStyle,
} from "@/core/projectReport";
import type { FinanceiroCustoKey } from "@/core/financeiro/financeiroUnificadoTypes";
import {
  reportInput,
  reportLabel,
  reportSection,
  reportSectionTitle,
  reportTable,
  reportTableWrap,
  reportTd,
  reportTh,
} from "../reportStyles";
import { R } from "../uiLabels";
import EditableModal from "./EditableModal";

type Props = {
  style: ReportStyle;
  value: ProjectReportFinanceiro;
  onChange: (next: ProjectReportFinanceiro) => void;
};

function formatEur(n: number): string {
  return `${(Number(n) || 0).toFixed(2)} EUR`;
}

function isCustoKey(key: ReportFinanceiroLinha["key"]): key is FinanceiroCustoKey {
  return key !== "iva" && key !== "total";
}

export default function FinanceiroBlock({ style, value, onChange }: Props) {
  const [openKey, setOpenKey] = useState<FinanceiroCustoKey | null>(null);
  const openLinha = openKey ? value.linhas.find((l) => l.key === openKey) : null;

  const setDetalhe = (detalhe: ReportFinanceiroDetalhe[]) => {
    if (!openKey) return;
    onChange(updateFinanceiroLinha(value, openKey, { detalhe }));
  };

  return (
    <section style={reportSection(style)}>
      <h2 style={reportSectionTitle}>{R.financeiro}</h2>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-muted)" }}>
        {R.financeiroHint}
      </p>

      <label style={{ display: "inline-block", marginBottom: 10 }}>
        <span style={reportLabel}>{R.ivaPct}</span>
        <input
          type="number"
          min={0}
          step={0.1}
          style={{ ...reportInput, width: 100 }}
          value={value.ivaPct}
          onChange={(e) =>
            onChange(
              recalcFinanceiro({
                ...value,
                ivaPct: Math.max(0, Number(e.target.value) || 0),
              })
            )
          }
        />
      </label>

      <div style={reportTableWrap}>
        <table style={reportTable}>
          <thead>
            <tr>
              <th style={reportTh}>{R.linha}</th>
              <th style={reportTh}>{R.quantidade}</th>
              <th style={reportTh}>{R.precoUnit}</th>
              <th style={reportTh}>{R.total}</th>
            </tr>
          </thead>
          <tbody>
            {value.linhas.map((linha) => {
              const locked = linha.key === "iva" || linha.key === "total";
              const bold = linha.key === "total";
              return (
                <tr
                  key={linha.key}
                  style={bold ? { fontWeight: 700, background: "rgba(59,130,246,0.08)" } : undefined}
                >
                  <td style={reportTd}>
                    {isCustoKey(linha.key) ? (
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--blue-light, #3b82f6)",
                          cursor: "pointer",
                          padding: 0,
                          font: "inherit",
                          textDecoration: "underline",
                        }}
                        onClick={() => setOpenKey(linha.key as FinanceiroCustoKey)}
                      >
                        {linha.label}
                      </button>
                    ) : (
                      linha.label
                    )}
                  </td>
                  <td style={reportTd}>
                    {locked ? (
                      "-"
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        style={{ ...reportInput, minHeight: 32, width: 100 }}
                        value={linha.quantidade ?? ""}
                        placeholder="-"
                        onChange={(e) => {
                          const raw = e.target.value;
                          const quantidade = raw === "" ? null : Math.max(0, Number(raw) || 0);
                          onChange(
                            updateFinanceiroLinha(value, linha.key as FinanceiroCustoKey, {
                              quantidade,
                            })
                          );
                        }}
                      />
                    )}
                  </td>
                  <td style={reportTd}>
                    {locked ? (
                      "-"
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        style={{ ...reportInput, minHeight: 32, width: 110 }}
                        value={linha.precoUnitario ?? ""}
                        placeholder="-"
                        onChange={(e) => {
                          const raw = e.target.value;
                          const precoUnitario = raw === "" ? null : Math.max(0, Number(raw) || 0);
                          onChange(
                            updateFinanceiroLinha(value, linha.key as FinanceiroCustoKey, {
                              precoUnitario,
                            })
                          );
                        }}
                      />
                    )}
                  </td>
                  <td style={reportTd}>{formatEur(linha.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
        {R.subtotal}: <strong>{formatEur(value.subtotal)}</strong>
        {" \u00b7 "}IVA: <strong>{formatEur(value.ivaValor)}</strong>
        {" \u00b7 "}
        {R.total}: <strong>{formatEur(value.totalProjeto)}</strong>
      </div>

      <EditableModal
        open={!!openLinha && !!openKey}
        title={`${R.detalhe} \u2014 ${openLinha?.label ?? ""}`}
        onClose={() => setOpenKey(null)}
      >
        {openLinha && openKey ? (
          <div style={{ display: "grid", gap: 10 }}>
            {(openLinha.detalhe ?? []).map((d, idx) => (
              <div
                key={d.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr auto",
                  gap: 6,
                }}
              >
                <input
                  style={reportInput}
                  placeholder={R.tipo}
                  value={d.tipo}
                  onChange={(e) => {
                    const detalhe = [...openLinha.detalhe];
                    detalhe[idx] = { ...d, tipo: e.target.value };
                    setDetalhe(detalhe);
                  }}
                />
                <input
                  style={reportInput}
                  placeholder={R.dimensoes}
                  value={d.dimensoes}
                  onChange={(e) => {
                    const detalhe = [...openLinha.detalhe];
                    detalhe[idx] = { ...d, dimensoes: e.target.value };
                    setDetalhe(detalhe);
                  }}
                />
                <input
                  type="number"
                  min={0}
                  style={reportInput}
                  placeholder="Qtd"
                  value={d.quantidade}
                  onChange={(e) => {
                    const detalhe = [...openLinha.detalhe];
                    detalhe[idx] = {
                      ...d,
                      quantidade: Math.max(0, Number(e.target.value) || 0),
                    };
                    setDetalhe(detalhe);
                  }}
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  style={reportInput}
                  placeholder={R.preco}
                  value={d.precoUnitario}
                  onChange={(e) => {
                    const detalhe = [...openLinha.detalhe];
                    detalhe[idx] = {
                      ...d,
                      precoUnitario: Math.max(0, Number(e.target.value) || 0),
                    };
                    setDetalhe(detalhe);
                  }}
                />
                <div style={{ alignSelf: "center", fontSize: 13 }}>{formatEur(d.total)}</div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDetalhe(openLinha.detalhe.filter((_, i) => i !== idx))}
                >
                  {R.remover}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setDetalhe([
                  ...(openLinha.detalhe ?? []),
                  {
                    id: makeReportId("fd"),
                    tipo: "",
                    dimensoes: "",
                    quantidade: 1,
                    precoUnitario: 0,
                    total: 0,
                  },
                ])
              }
            >
              {R.adicionarTipo}
            </Button>
          </div>
        ) : null}
      </EditableModal>
    </section>
  );
}
