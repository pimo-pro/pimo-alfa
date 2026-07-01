import { useMemo } from "react";
import { useProject } from "../../context/useProject";
import { useMaterials } from "../../hooks/useMaterials";
import Panel from "../ui/Panel";
import IndustrialPanelPdfActions from "./IndustrialPanelPdfActions";
import { useIndustrialBottomPdf } from "../../hooks/useIndustrialBottomPdf";
import { buildPecasTotaisRows } from "../../core/industrial/industrialBottomSectionData";

export default function PecasTotaisPanel() {
  const { project } = useProject();
  const { materials } = useMaterials();
  const { exportPecasTotaisPdf } = useIndustrialBottomPdf();
  const boxes = project.boxes ?? [];
  const rows = useMemo(() => buildPecasTotaisRows(project, materials), [project, materials]);

  if (boxes.length === 0) {
    return (
      <Panel title="Peças totais">
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Adicione caixas para visualizar peças.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Peças totais — Cutlist + Portas + Gavetas + Remates">
      <IndustrialPanelPdfActions onGeneratePdf={exportPecasTotaisPdf} />
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0 }}>
        {rows.length} linhas · {rows.reduce((s, r) => s + r.qtd, 0)} unidades
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
              {["Categoria", "Caixa", "Tipo", "Dimensões", "Material", "Peso", "Qtd"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.caixa}-${row.tipo}-${row.dimensoes}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: "6px 8px" }}>{row.categoria}</td>
                <td style={{ padding: "6px 8px" }}>{row.caixa}</td>
                <td style={{ padding: "6px 8px" }}>{row.tipo}</td>
                <td style={{ padding: "6px 8px" }}>{row.dimensoes}</td>
                <td style={{ padding: "6px 8px" }}>{row.material}</td>
                <td style={{ padding: "6px 8px" }}>{row.pesoKg.toFixed(3)} kg</td>
                <td style={{ padding: "6px 8px" }}>{row.qtd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
