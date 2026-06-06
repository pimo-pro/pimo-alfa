/**
 * Secção de regras industriais para Remate Completo.
 * Permite configurar as margens automáticas de dimensionamento.
 */
import type { RemateCompletoRules } from "../../../core/remate/rematePieceTypes";
import { defaultCompletoRules } from "../../../core/remate/remateProductRules";

type Props = {
  rules: RemateCompletoRules;
  feetHeightMm?: number;
  onChange: (_patch: Partial<RemateCompletoRules>) => void;
};

const FIELD_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  fontSize: 12,
};
const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
};
const INFO_STYLE: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-muted)",
  marginTop: 2,
};

export default function RemateRulesSection({ rules, feetHeightMm, onChange }: Props) {
  const def = defaultCompletoRules();
  const r = { ...def, ...rules };

  const numInput = (
    value: number,
    key: keyof RemateCompletoRules,
    min = 0,
    max = 500
  ) => (
    <input
      className="input input-sm"
      type="number"
      min={min}
      max={max}
      style={{ width: 70 }}
      value={value}
      onChange={(e) =>
        onChange({ [key]: Math.min(max, Math.max(min, Number(e.target.value) || 0)) })
      }
    />
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "8px 10px",
        background: "var(--bg-surface, #1e2130)",
        borderRadius: 6,
        border: "1px solid var(--border-muted, #333)",
      }}
    >
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-accent, #38bdf8)", letterSpacing: 0.5 }}>
        REGRAS DE DIMENSIONAMENTO
      </p>

      {/* Porta — +Xmm na largura */}
      <label style={ROW_STYLE}>
        <input
          type="checkbox"
          checked={r.doorFlushEnabled}
          onChange={(e) => onChange({ doorFlushEnabled: e.target.checked })}
        />
        <span style={{ flex: 1 }}>Encostar à porta</span>
        {numInput(r.doorFlushMm, "doorFlushMm", 0, 100)}
        <span style={{ fontSize: 10 }}>mm</span>
      </label>
      <p style={INFO_STYLE}>Adiciona {r.doorFlushEnabled ? r.doorFlushMm : 0} mm à largura quando há porta.</p>

      {/* Traseira — profundidade + backExtraMm */}
      <div style={{ ...FIELD_STYLE }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ flex: 1 }}>Extensão traseira</span>
          {numInput(r.backExtraMm, "backExtraMm", 0, 200)}
          <span style={{ fontSize: 10 }}>mm</span>
        </div>
        <p style={INFO_STYLE}>Profundidade = módulo + 20 (frente) + {r.backExtraMm} (traseira).</p>
      </div>

      {/* Cima — +topExtraMm na altura */}
      <div style={FIELD_STYLE}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ flex: 1 }}>Margem de cima</span>
          {numInput(r.topExtraMm, "topExtraMm", 0, 100)}
          <span style={{ fontSize: 10 }}>mm</span>
        </div>
        <p style={INFO_STYLE}>+{r.topExtraMm} mm para alinhar com remate cima.</p>
      </div>

      {/* Fundo — +bottomExtraMm na altura */}
      <div style={FIELD_STYLE}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ flex: 1 }}>Margem de fundo</span>
          {numInput(r.bottomExtraMm, "bottomExtraMm", 0, 100)}
          <span style={{ fontSize: 10 }}>mm</span>
        </div>
        <p style={INFO_STYLE}>+{r.bottomExtraMm} mm quando paralelo com porta / gaveta / remate lat.</p>
      </div>

      {/* Proximidade ao chão */}
      <label style={ROW_STYLE}>
        <input
          type="checkbox"
          checked={r.floorProxEnabled}
          onChange={(e) => onChange({ floorProxEnabled: e.target.checked })}
        />
        <span style={{ flex: 1 }}>Módulo próximo do chão</span>
        {numInput(r.floorProxMm, "floorProxMm", 0, 500)}
        <span style={{ fontSize: 10 }}>mm</span>
      </label>
      {feetHeightMm != null && feetHeightMm > 0 ? (
        <p style={INFO_STYLE}>
          Altura dos pés: {feetHeightMm} mm — adição total ao fundo:{" "}
          {r.floorProxEnabled ? Math.max(r.bottomExtraMm, r.floorProxMm + feetHeightMm) : r.bottomExtraMm} mm.
        </p>
      ) : (
        <p style={INFO_STYLE}>
          +{r.floorProxMm} mm ao fundo quando ativo (use o valor dos pés do módulo).
        </p>
      )}

      {/* Limite máximo de excesso */}
      <div style={FIELD_STYLE}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ flex: 1 }}>Excesso máximo sobre módulo</span>
          {numInput(r.maxOverBoxMm, "maxOverBoxMm", 0, 500)}
          <span style={{ fontSize: 10 }}>mm</span>
        </div>
        <p style={INFO_STYLE}>
          O remate não pode exceder as dimensões do módulo em mais de {r.maxOverBoxMm} mm.
        </p>
      </div>
    </div>
  );
}
