import type { ProjectReportGerais, ReportStyle } from "@/core/projectReport";
import {
  reportGrid3,
  reportInput,
  reportLabel,
  reportSection,
  reportSectionTitle,
} from "../reportStyles";

type Props = {
  style: ReportStyle;
  value: ProjectReportGerais;
  onChange: (next: ProjectReportGerais, path: string) => void;
};

export default function InfoGeraisBlock({ style, value, onChange }: Props) {
  return (
    <section style={reportSection(style)}>
          <h2 style={reportSectionTitle}>1. Informaùùes gerais do projeto</h2>
      <div style={{ ...reportGrid3, alignItems: "end" }}>
        <label>
          <span style={reportLabel}>Designer</span>
          <input
            style={reportInput}
            value={value.designer}
            onChange={(e) => onChange({ ...value, designer: e.target.value }, "gerais.designer")}
          />
        </label>
        <label style={{ textAlign: "center" }}>
          <span style={reportLabel}>Nome do projeto</span>
          <input
            style={{ ...reportInput, fontSize: 18, fontWeight: 700, textAlign: "center" }}
            value={value.nomeProjeto}
            onChange={(e) =>
              onChange({ ...value, nomeProjeto: e.target.value }, "gerais.nomeProjeto")
            }
          />
        </label>
        <label>
          <span style={reportLabel}>Empresa executora</span>
          <input
            style={reportInput}
            value={value.empresa}
            onChange={(e) => onChange({ ...value, empresa: e.target.value }, "gerais.empresa")}
          />
        </label>
        <label>
          <span style={reportLabel}>Data inùcio execuùùo</span>
          <input
            type="date"
            style={reportInput}
            value={value.dataInicioExecucao}
            onChange={(e) =>
              onChange(
                { ...value, dataInicioExecucao: e.target.value },
                "gerais.dataInicioExecucao"
              )
            }
          />
        </label>
        <div />
        <label>
          <span style={reportLabel}>Data conclus„o execuÁ„o</span>
          <input
            type="date"
            style={reportInput}
            value={value.dataConclusaoExecucao}
            onChange={(e) =>
              onChange(
                { ...value, dataConclusaoExecucao: e.target.value },
                "gerais.dataConclusaoExecucao"
              )
            }
          />
        </label>
      </div>
    </section>
  );
}
