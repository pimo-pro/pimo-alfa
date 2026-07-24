import { useMemo, useState } from "react";
import { useProject } from "../../context/useProject";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import {
  FINANCEIRO_CUSTO_KEYS,
  FINANCEIRO_IVA_DEFAULT_PCT,
  type FinanceiroCustoKey,
  type FinanceiroOverrides,
  type FinanceiroUnificadoSnapshot,
} from "../../core/financeiro";
import { formatCurrency } from "../../utils/formatting";

type Props = {
  snap: FinanceiroUnificadoSnapshot;
  onCancel: () => void;
  onSaved: () => void;
};

const CUSTO_FIELDS: { key: FinanceiroCustoKey; label: string }[] = [
  { key: "paineis", label: "Painéis" },
  { key: "portas", label: "Portas" },
  { key: "gavetas", label: "Gavetas" },
  { key: "ferragens", label: "Ferragens" },
  { key: "orla", label: "Orla" },
  { key: "remates", label: "Remates" },
  { key: "adm", label: "ADM" },
  { key: "montagem", label: "Montagem" },
  { key: "portes", label: "Portes" },
];

function parseOptionalNumber(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export default function FinanceiroUnificadoEditPanel({ snap, onCancel, onSaved }: Props) {
  const { actions } = useProject();

  const [ivaPct, setIvaPct] = useState(String(snap.ivaPct ?? FINANCEIRO_IVA_DEFAULT_PCT));
  const [distanciaKm, setDistanciaKm] = useState(String(snap.distanciaKm ?? 0));
  const [custos, setCustos] = useState<Record<FinanceiroCustoKey, string>>(() => {
    const init = {} as Record<FinanceiroCustoKey, string>;
    for (const key of FINANCEIRO_CUSTO_KEYS) {
      const ov = snap.overrides.custos?.[key];
      init[key] = typeof ov === "number" ? String(ov) : "";
    }
    return init;
  });
  const [notas, setNotas] = useState(snap.overrides.notas ?? "");

  const preview = useMemo(() => {
    const effective = {} as Record<FinanceiroCustoKey, number>;
    for (const key of FINANCEIRO_CUSTO_KEYS) {
      const parsed = parseOptionalNumber(custos[key]);
      effective[key] = typeof parsed === "number" ? parsed : snap.custosComputed[key];
    }
    const materialKeys: FinanceiroCustoKey[] = [
      "paineis",
      "portas",
      "gavetas",
      "ferragens",
      "orla",
      "remates",
    ];
    const subtotal = materialKeys.reduce((s, k) => s + effective[k], 0);
    const ivaN = Number(String(ivaPct).replace(",", "."));
    const ivaPctN = Number.isFinite(ivaN) && ivaN >= 0 ? ivaN : FINANCEIRO_IVA_DEFAULT_PCT;
    const iva = subtotal * (ivaPctN / 100);
    const total =
      subtotal + effective.adm + effective.montagem + effective.portes + iva;
    return { subtotal, ivaPctN, iva, total, effective };
  }, [custos, ivaPct, snap.custosComputed]);

  const handleSave = () => {
    const next: FinanceiroOverrides = {
      ivaPct: preview.ivaPctN,
    };
    const dist = parseOptionalNumber(distanciaKm);
    if (typeof dist === "number") next.distanciaKm = dist;

    const custosOut: NonNullable<FinanceiroOverrides["custos"]> = {};
    let hasCusto = false;
    for (const key of FINANCEIRO_CUSTO_KEYS) {
      const parsed = parseOptionalNumber(custos[key]);
      if (typeof parsed === "number") {
        custosOut[key] = parsed;
        hasCusto = true;
      }
    }
    if (hasCusto) next.custos = custosOut;
    if (notas.trim()) next.notas = notas.trim();
    actions.setFinanceiroOverrides(next);
    onSaved();
  };

  const handleClearOverrides = () => {
    setIvaPct(String(FINANCEIRO_IVA_DEFAULT_PCT));
    setDistanciaKm("0");
    setCustos(() => {
      const init = {} as Record<FinanceiroCustoKey, string>;
      for (const key of FINANCEIRO_CUSTO_KEYS) init[key] = "";
      return init;
    });
    setNotas("");
    actions.setFinanceiroOverrides({});
    onSaved();
  };

  const fieldStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 120px 100px",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
    fontSize: 12,
  };

  return (
    <Panel title="Editar Financeiro Unificado">
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0 }}>
        Deixe o campo de custo vazio para usar o valor calculado. IVA aplica-se sobre o subtotal de
        materiais. ADM / montagem / portes entram no total (regras em Admin ? Financeiro).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <label style={{ fontSize: 12, display: "block" }}>
          IVA (%)
          <input
            type="number"
            min={0}
            step={0.1}
            value={ivaPct}
            onChange={(e) => setIvaPct(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: 12, display: "block" }}>
          Distância portes (km)
          <input
            type="number"
            min={0}
            step={0.1}
            value={distanciaKm}
            onChange={(e) => setDistanciaKm(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ ...fieldStyle, fontWeight: 700, color: "var(--text-muted)" }}>
          <span>Custo</span>
          <span>Calculado</span>
          <span>Override €</span>
        </div>
        {CUSTO_FIELDS.map(({ key, label }) => (
          <div key={key} style={fieldStyle}>
            <span>{label}</span>
            <span>{formatCurrency(snap.custosComputed[key])}</span>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="auto"
              value={custos[key]}
              onChange={(e) => setCustos((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <label style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
        Notas
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          style={{ display: "block", width: "100%", marginTop: 4, resize: "vertical" }}
        />
      </label>

      <div
        style={{
          fontSize: 12,
          marginBottom: 16,
          padding: 10,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>Subtotal materiais: {formatCurrency(preview.subtotal)}</div>
        <div>
          ADM + Montagem + Portes:{" "}
          {formatCurrency(
            preview.effective.adm + preview.effective.montagem + preview.effective.portes
          )}
        </div>
        <div>
          IVA ({preview.ivaPctN}%): {formatCurrency(preview.iva)}
        </div>
        <div style={{ fontWeight: 700, marginTop: 4 }}>
          Total projeto: {formatCurrency(preview.total)}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button type="button" onClick={handleSave}>
          Guardar
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" variant="secondary" onClick={handleClearOverrides}>
          Limpar overrides
        </Button>
      </div>
    </Panel>
  );
}
