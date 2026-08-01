import { useState } from "react";
import Button from "@/components/ui/Button";
import type { ProjectReportQualidade, ReportStyle } from "@/core/projectReport";
import {
  reportInput,
  reportLabel,
  reportSection,
  reportSectionTitle,
} from "../reportStyles";
import { R } from "../uiLabels";

type Props = {
  style: ReportStyle;
  value: ProjectReportQualidade;
  onChange: (next: ProjectReportQualidade) => void;
};

export default function QualidadeBlock({ style, value, onChange }: Props) {
  const [draft, setDraft] = useState("");

  const setRating = (rating: 1 | 2 | 3 | 4 | 5) => {
    onChange({ ...value, rating });
  };

  const addObs = () => {
    const t = draft.trim();
    if (!t) return;
    onChange({ ...value, observacoes: [...(value.observacoes ?? []), t] });
    setDraft("");
  };

  return (
    <section style={reportSection(style)}>
      <h2 style={reportSectionTitle}>{R.qualidade}</h2>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} ${R.estrelas}`}
            onClick={() => setRating(n)}
            style={{
              fontSize: 22,
              lineHeight: 1,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: n <= value.rating ? "#f59e0b" : "var(--text-muted)",
            }}
          >
            {R.star}
          </button>
        ))}
        <span style={{ alignSelf: "center", fontSize: 13, color: "var(--text-muted)" }}>
          {value.rating} / 5
        </span>
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        {(value.observacoes ?? []).map((obs, idx) => (
          <div
            key={`${idx}-${obs.slice(0, 12)}`}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid var(--border, rgba(127,127,127,0.2))",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            <span style={{ fontSize: 14 }}>{obs}</span>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                onChange({
                  ...value,
                  observacoes: value.observacoes.filter((_, i) => i !== idx),
                })
              }
            >
              {R.remover}
            </Button>
          </div>
        ))}
        {(value.observacoes ?? []).length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            {R.semObservacoes}
          </p>
        ) : null}
      </div>

      <label style={{ display: "block", marginBottom: 8 }}>
        <span style={reportLabel}>{R.novaObservacao}</span>
        <input
          style={reportInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addObs();
            }
          }}
        />
      </label>
      <Button type="button" variant="secondary" onClick={addObs}>
        {R.adicionarObservacao}
      </Button>
    </section>
  );
}
