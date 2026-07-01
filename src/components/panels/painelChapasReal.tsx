import { useMemo } from "react";
import { useProject } from "../../context/useProject";
import { buildCutlistItemsForIndustrialExport } from "../../core/fabrication/buildCutlistItemsForIndustrialExport";
import { computeChapasReal } from "../../core/industrial/computeChapasReal";
import { buildChapasRealPdf, chapasRealPdfFileName } from "../../core/pdf/pdfChapasReal";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import {
  beginIndustrialFileGeneration,
  endIndustrialFileGeneration,
} from "../../core/fabrication/industrialGenerationSuspend";

export default function PainelChapasReal() {
  const { project } = useProject();
  const boxes = project.boxes ?? [];
  const projectName = project.projectName?.trim() || "Projeto";

  const chapas = useMemo(() => {
    const items = buildCutlistItemsForIndustrialExport({
      boxes,
      rules: project.rules,
      materialId: project.materialId,
      projectName,
      remates: project.remates ?? [],
      rodapes: project.rodapes ?? [],
      extractedPartsByBoxId: project.extractedPartsByBoxId,
      industrialPieceEdits: project.industrialPieceEdits,
    });
    return computeChapasReal(items, projectName, boxes);
  }, [boxes, project, projectName]);

  const exportPdf = () => {
    beginIndustrialFileGeneration();
    try {
      buildChapasRealPdf(projectName, chapas).save(chapasRealPdfFileName(projectName));
    } finally {
      endIndustrialFileGeneration();
    }
  };

  return (
    <Panel title="Cálculo de Chapas Real">
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0 }}>
        Distribuição real das peças nas chapas via motor de nesting industrial.
      </p>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12 }}>
        <span>
          Chapas: <strong>{chapas.totalSheets}</strong>
        </span>
        <span>
          Desperdício: <strong>{chapas.totalWastePct.toFixed(1)}%</strong>
        </span>
      </div>
      <Button variant="secondary" onClick={exportPdf} style={{ marginBottom: 12, fontSize: 12 }}>
        Gerar PDF — chapas_real
      </Button>
      <div style={{ overflowX: "auto" }}>
        {chapas.sheets.map((sheet) => (
          <div
            key={sheet.sheetIndex}
            style={{
              marginBottom: 12,
              padding: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              Chapa {sheet.sheetIndex} — {sheet.material} {sheet.espessuraMm}mm · {sheet.pieceCount} peças ·
              desperdício {sheet.wastePct.toFixed(1)}%
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  {["Peça", "Caixa", "Largura", "Altura"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: 4, color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.pieces.map((p, i) => (
                  <tr key={`${sheet.sheetIndex}-${i}`}>
                    <td style={{ padding: 4 }}>{p.nome}</td>
                    <td style={{ padding: 4 }}>{p.boxId}</td>
                    <td style={{ padding: 4 }}>{p.largura} mm</td>
                    <td style={{ padding: 4 }}>{p.altura} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {chapas.sheets.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Nesting indisponível — estimativa: {chapas.totalSheets} chapa(s).
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
