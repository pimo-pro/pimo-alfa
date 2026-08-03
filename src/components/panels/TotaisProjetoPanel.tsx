import { useMemo } from "react";
import { useProject } from "../../context/useProject";
import { useMaterials } from "../../hooks/useMaterials";
import { useAuth } from "../../auth/useAuth";
import { hasFullAccess } from "../../auth/rbac";
import { canShowSectionPrices } from "../../admin/industrialSectionsConfig";
import Panel from "../ui/Panel";
import IndustrialPanelPdfActions from "./IndustrialPanelPdfActions";
import { useIndustrialBottomPdf } from "../../hooks/useIndustrialBottomPdf";
import { useCutlistData } from "../../hooks/useCutlistData";
import {
  CHAPA_PADRAO_LARGURA,
  CHAPA_PADRAO_ALTURA,
} from "../../core/manufacturing/materials";
import { buildPecasTotaisRows } from "../../core/industrial/industrialBottomSectionData";
import {
  computeFinanceiroUnificado,
  financeiroCustoRows,
} from "../../core/financeiro";
import { formatCurrency } from "../../utils/formatting";

export default function TotaisProjetoPanel({ embedded }: { embedded?: boolean } = {}) {
  const { project } = useProject();
  const { materials } = useMaterials();
  const { hasPermission } = useAuth();
  const isAdmin = hasFullAccess(hasPermission);
  const showPrices = canShowSectionPrices("totaisProjeto", isAdmin);
  const { exportTotaisProjetoPdf } = useIndustrialBottomPdf();
  const data = useCutlistData();
  const pecasRows = useMemo(() => buildPecasTotaisRows(project, materials), [project, materials]);
  const pesoTotalKg = pecasRows.reduce((s, r) => s + r.pesoKg, 0);
  const numeroChapas =
    data.totalAreaMm2 > 0
      ? Math.ceil(data.totalAreaMm2 / (CHAPA_PADRAO_LARGURA * CHAPA_PADRAO_ALTURA))
      : 0;

  const snap = useMemo(
    () =>
      computeFinanceiroUnificado(
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
          orlaPresets: project.orlaPresets,
          financeiroOverrides: project.financeiroOverrides,
          financeiroAdminSettings: project.financeiroAdminSettings,
        },
        materials
      ),
    [project, materials]
  );
  const custoRows = useMemo(() => financeiroCustoRows(snap), [snap]);

  if (data.boxes.length === 0) {
    return (
      <Panel title="Totais do Projeto">
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Adicione caixas para visualizar totais.</div>
      </Panel>
    );
  }

  return (
    <Panel title={embedded ? undefined : "Totais do Projeto (project.boxes)"}>
      <IndustrialPanelPdfActions onGeneratePdf={exportTotaisProjetoPdf} />
      <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div>Caixas: {data.boxes.length}</div>
        <div>Total de itens (peças): {data.totalPecas}</div>
        <div>Ferragens: {data.totalFerragensQty}</div>
        <div>Área total: {data.totalAreaM2.toFixed(3)} m²</div>
        <div>Peso total: {pesoTotalKg.toFixed(2)} kg</div>
        <div>Nº de chapas (estimado): {numeroChapas}</div>
        <div>Orla total: {data.totalOrlaMetros.toFixed(2)} m</div>
        {showPrices ? (
          <>
            <div style={{ marginTop: 8, fontWeight: 700 }}>Custos</div>
            {custoRows.map((row) => (
              <div
                key={row.label}
                style={row.total ? { fontWeight: 700, color: "var(--blue-light)" } : undefined}
              >
                {row.label}:{" "}
                {row.emBreve || row.valor == null ? "em breve" : formatCurrency(row.valor)}
              </div>
            ))}
          </>
        ) : (
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Preços visíveis apenas para administradores.</p>
        )}
      </div>
    </Panel>
  );
}
