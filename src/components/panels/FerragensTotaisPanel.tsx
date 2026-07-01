import { useMemo } from "react";
import { useProject } from "../../context/useProject";
import { useComponentTypes } from "../../hooks/useComponentTypes";
import { useFerragens } from "../../hooks/useFerragens";
import Panel from "../ui/Panel";
import IndustrialPanelPdfActions from "./IndustrialPanelPdfActions";
import { useIndustrialBottomPdf } from "../../hooks/useIndustrialBottomPdf";
import { buildFerragensTotaisPdfData } from "../../core/industrial/industrialBottomSectionData";
import { useCutlistData } from "../../hooks/useCutlistData";

export default function FerragensTotaisPanel({ embedded }: { embedded?: boolean } = {}) {
  const { project } = useProject();
  const { componentTypes } = useComponentTypes();
  const { ferragens } = useFerragens();
  const { exportFerragensTotaisPdf } = useIndustrialBottomPdf();
  const { totalFerragensQty } = useCutlistData();

  const { detalhe, porTipo } = useMemo(
    () =>
      buildFerragensTotaisPdfData(
        {
          boxes: project.boxes ?? [],
          rules: project.rules,
          materialId: project.materialId,
          projectName: project.projectName,
          remates: project.remates,
          rodapes: project.rodapes,
          extractedPartsByBoxId: project.extractedPartsByBoxId,
          pieceObservacoes: project.pieceObservacoes,
        },
        componentTypes,
        ferragens
      ),
    [project, componentTypes, ferragens]
  );

  return (
    <Panel title={embedded ? undefined : "Ferragens totais"}>
      <IndustrialPanelPdfActions onGeneratePdf={exportFerragensTotaisPdf} />
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Total de unidades: <strong style={{ color: "var(--text-main)" }}>{totalFerragensQty}</strong>
      </p>

      <h4 style={{ fontSize: 12, margin: "12px 0 6px", color: "var(--text-main)" }}>Por tipo</h4>
      <div style={{ display: "grid", gap: 4, marginBottom: 16 }}>
        {porTipo.map(([tipo, total]) => (
          <div key={tipo} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span>{tipo}</span>
            <strong>{total}</strong>
          </div>
        ))}
      </div>

      <h4 style={{ fontSize: 12, margin: "0 0 6px", color: "var(--text-main)" }}>Detalhe por caixa</h4>
      <div style={{ maxHeight: 280, overflow: "auto", fontSize: 11 }}>
        {detalhe.map((row, idx) => (
          <div key={`${row[0]}-${row[1]}-${idx}`} style={{ padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {row[0]} — {row[1]} ×{row[2]}
          </div>
        ))}
      </div>
    </Panel>
  );
}
