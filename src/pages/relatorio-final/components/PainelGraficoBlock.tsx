import type { ProjectReportMetricas, ReportStyle } from "@/core/projectReport";
import {
  reportGrid3,
  reportInput,
  reportLabel,
  reportSection,
  reportSectionTitle,
} from "../reportStyles";
import { R } from "../uiLabels";
import SimpleBarChart from "./SimpleBarChart";

type Props = {
  style: ReportStyle;
  value: ProjectReportMetricas;
  onChange: (next: ProjectReportMetricas) => void;
};

const FIELDS: Array<{ key: keyof ProjectReportMetricas; label: string }> = [
  { key: "tarefasConcluidas", label: R.tarefasConcluidas },
  { key: "erros", label: R.erros },
  { key: "errosCorrigidos", label: R.errosCorrigidos },
  { key: "melhorias", label: R.melhoriasAplicadas },
  { key: "ordensTrabalho", label: R.ordensTrabalho },
  { key: "colaboradores", label: R.colaboradores },
];

export default function PainelGraficoBlock({ style, value, onChange }: Props) {
  return (
    <section style={reportSection(style)}>
      <h2 style={reportSectionTitle}>{R.painelGrafico}</h2>
      <SimpleBarChart metricas={value} />
      <div style={{ ...reportGrid3, marginTop: 14 }}>
        {FIELDS.map((f) => (
          <label key={f.key}>
            <span style={reportLabel}>{f.label}</span>
            <input
              type="number"
              min={0}
              style={reportInput}
              value={value[f.key]}
              onChange={(e) =>
                onChange({ ...value, [f.key]: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
        ))}
      </div>
    </section>
  );
}
