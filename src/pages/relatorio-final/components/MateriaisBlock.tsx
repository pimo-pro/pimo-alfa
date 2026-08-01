import Button from "@/components/ui/Button";
import {
  makeReportId,
  type ReportMaterialLinha,
  type ReportStyle,
} from "@/core/projectReport";
import {
  reportInput,
  reportSection,
  reportSectionTitle,
  reportTable,
  reportTableWrap,
  reportTd,
  reportTh,
} from "../reportStyles";
import { R } from "../uiLabels";

type Props = {
  style: ReportStyle;
  value: ReportMaterialLinha[];
  onChange: (next: ReportMaterialLinha[]) => void;
};

export default function MateriaisBlock({ style, value, onChange }: Props) {
  return (
    <section style={reportSection(style)}>
      <h2 style={reportSectionTitle}>{R.materiais}</h2>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-muted)" }}>
        {R.materiaisHint}
      </p>
      <div style={reportTableWrap}>
        <table style={reportTable}>
          <thead>
            <tr>
              <th style={reportTh}>{R.tipo}</th>
              <th style={reportTh}>{R.quantidade}</th>
              <th style={reportTh}>{R.observacoes}</th>
              <th style={reportTh}>{R.erro}</th>
              <th style={reportTh}>{R.substituicao}</th>
              <th style={reportTh} />
            </tr>
          </thead>
          <tbody>
            {value.map((row, idx) => (
              <tr key={row.id}>
                <td style={reportTd}>
                  <input
                    style={{ ...reportInput, minHeight: 32 }}
                    value={row.tipo}
                    onChange={(e) => {
                      const next = [...value];
                      next[idx] = { ...row, tipo: e.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td style={reportTd}>
                  <input
                    type="number"
                    min={0}
                    style={{ ...reportInput, minHeight: 32, width: 90 }}
                    value={row.quantidade}
                    onChange={(e) => {
                      const next = [...value];
                      next[idx] = {
                        ...row,
                        quantidade: Math.max(0, Number(e.target.value) || 0),
                      };
                      onChange(next);
                    }}
                  />
                </td>
                <td style={reportTd}>
                  <input
                    style={{ ...reportInput, minHeight: 32 }}
                    value={row.observacoes}
                    onChange={(e) => {
                      const next = [...value];
                      next[idx] = { ...row, observacoes: e.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td style={reportTd}>
                  <input
                    type="checkbox"
                    checked={row.temErro}
                    onChange={(e) => {
                      const next = [...value];
                      next[idx] = { ...row, temErro: e.target.checked };
                      onChange(next);
                    }}
                  />
                </td>
                <td style={reportTd}>
                  <input
                    style={{ ...reportInput, minHeight: 32 }}
                    value={row.substituicao}
                    onChange={(e) => {
                      const next = [...value];
                      next[idx] = { ...row, substituicao: e.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td style={reportTd}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onChange(value.filter((_, i) => i !== idx))}
                  >
                    {R.remover}
                  </Button>
                </td>
              </tr>
            ))}
            {value.length === 0 ? (
              <tr>
                <td style={reportTd} colSpan={6}>
                  {R.semMateriais}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10 }}>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onChange([
              ...value,
              {
                id: makeReportId("mat"),
                tipo: "",
                quantidade: 0,
                observacoes: "",
                temErro: false,
                substituicao: "",
              },
            ])
          }
        >
          {R.adicionarLinha}
        </Button>
      </div>
    </section>
  );
}
