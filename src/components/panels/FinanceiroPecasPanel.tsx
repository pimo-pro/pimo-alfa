import { useMemo } from "react";
import { useProject } from "../../context/useProject";
import { useMaterials } from "../../hooks/useMaterials";
import { useAuth } from "../../auth/useAuth";
import { hasFullAccess } from "../../auth/rbac";
import { canShowSectionPrices } from "../../admin/industrialSectionsConfig";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import { useIndustrialBottomPdf } from "../../hooks/useIndustrialBottomPdf";
import { buildFinanceiroPecasRows } from "../../core/financeiro";
import { formatCurrency } from "../../utils/formatting";

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  color: "var(--text-muted)",
  whiteSpace: "nowrap",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "5px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  whiteSpace: "nowrap",
};

const checkStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#16a34a",
  fontWeight: 700,
};

export default function FinanceiroPecasPanel({ embedded }: { embedded?: boolean } = {}) {
  const { project } = useProject();
  const { materials } = useMaterials();
  const { hasPermission } = useAuth();
  const isAdmin = hasFullAccess(hasPermission);
  const showPrices =
    canShowSectionPrices("resumoFinanceiro", isAdmin) ||
    canShowSectionPrices("totaisProjeto", isAdmin);
  const { exportResumoFinanceiroPdf } = useIndustrialBottomPdf();

  const rows = useMemo(
    () =>
      buildFinanceiroPecasRows(
        {
          boxes: project.boxes,
          rules: project.rules,
          materialId: project.materialId,
          projectName: project.projectName,
          remates: project.remates,
          rodapes: project.rodapes,
          extractedPartsByBoxId: project.extractedPartsByBoxId,
          industrialPieceEdits: project.industrialPieceEdits,
          ferragemOrla: project.ferragemOrla,
          financeiroOverrides: project.financeiroOverrides,
          financeiroAdminSettings: project.financeiroAdminSettings,
          orlaPieces: project.orlaPieces,
          orlaPresets: project.orlaPresets,
        },
        materials
      ),
    [project, materials]
  );

  const boxesEmpty = (project.boxes ?? []).length === 0;
  const totalUnidades = rows.reduce((s, r) => s + r.qtd, 0);
  const totalPreco = rows.reduce((s, r) => s + r.preco, 0);

  const headers = [
    "Caixa",
    "Tipo",
    "Material",
    "Qtd",
    "Dimensões (L×A×E)",
    "Peso",
    "Orla",
    "CNC",
    "Drill",
    "Ferragens",
    "Nº ETQ",
    ...(showPrices ? ["Valor"] : []),
  ];

  return (
    <Panel title={embedded ? undefined : "Financeiro peças"}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          {boxesEmpty
            ? "Adicione caixas para visualizar peças."
            : `${rows.length} linhas · ${totalUnidades} unidades${
                showPrices ? ` · ${formatCurrency(totalPreco)}` : ""
              }`}
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={boxesEmpty}
          onClick={() => void exportResumoFinanceiroPdf()}
        >
          Gerar PDF
        </Button>
      </div>

      {!boxesEmpty ? (
        <div style={{ overflow: "auto", maxHeight: "min(520px, 60vh)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.pieceId}>
                  <td style={tdStyle}>{r.caixa}</td>
                  <td style={tdStyle}>{r.tipo}</td>
                  <td style={tdStyle}>{r.material}</td>
                  <td style={tdStyle}>{r.qtd}</td>
                  <td style={tdStyle}>{r.dimensoes}</td>
                  <td style={tdStyle}>{r.pesoKg.toFixed(2)} kg</td>
                  <td style={{ ...tdStyle, ...checkStyle }}>{r.hasOrla ? "?" : ""}</td>
                  <td style={{ ...tdStyle, ...checkStyle }}>{r.hasCnc ? "?" : ""}</td>
                  <td style={{ ...tdStyle, ...checkStyle }}>{r.hasDrill ? "?" : ""}</td>
                  <td style={tdStyle}>{r.ferragensQty > 0 ? r.ferragensQty : ""}</td>
                  <td style={tdStyle}>{r.etq}</td>
                  {showPrices ? (
                    <td style={tdStyle}>{formatCurrency(r.preco)}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}
