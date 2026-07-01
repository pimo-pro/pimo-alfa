import { useMemo, useState } from "react";
import { useProject } from "../../context/useProject";
import { useMaterials } from "../../hooks/useMaterials";
import { useAuth } from "../../auth/useAuth";
import { hasFullAccess } from "../../auth/rbac";
import { canShowSectionPrices } from "../../admin/industrialSectionsConfig";
import Panel from "../ui/Panel";
import IndustrialPanelPdfActions from "./IndustrialPanelPdfActions";
import { useIndustrialBottomPdf } from "../../hooks/useIndustrialBottomPdf";
import {
  cutlistComPrecoFromBoxes,
  ferragensFromBoxes,
} from "../../core/manufacturing/cutlistFromBoxes";
import {
  calcularPrecoTotalPecas,
  calcularPrecoTotalProjeto,
} from "../../core/pricing/pricing";
import {
  CHAPA_PADRAO_LARGURA,
  CHAPA_PADRAO_ALTURA,
} from "../../core/manufacturing/materials";
import { buildPecasTotaisRows } from "../../core/industrial/industrialBottomSectionData";
import { formatCurrency } from "../../utils/formatting";
import { useBottomInfo } from "../../context/BottomInfoContext";

const microTextStyle: React.CSSProperties = { fontSize: 12, lineHeight: 1.4, color: "var(--text-muted)" };

export default function ResumoFinanceiroPanel() {
  const { project } = useProject();
  const { materials } = useMaterials();
  const { hasPermission } = useAuth();
  const isAdmin = hasFullAccess(hasPermission);
  const showPrices = canShowSectionPrices("resumoFinanceiro", isAdmin);
  const { exportResumoFinanceiroPdf } = useIndustrialBottomPdf();
  const { togglePanel } = useBottomInfo();
  const [showPecasList, setShowPecasList] = useState(false);

  const boxes = useMemo(() => project.boxes ?? [], [project.boxes]);
  const cutlist = useMemo(
    () => cutlistComPrecoFromBoxes(boxes, project.rules, project.materialId, project.projectName),
    [boxes, project.rules, project.materialId, project.projectName]
  );
  const ferragens = useMemo(() => ferragensFromBoxes(boxes, project.rules), [boxes, project.rules]);
  const totalPecas = cutlist.reduce((sum, item) => sum + item.quantidade, 0);
  const pecasRows = useMemo(() => buildPecasTotaisRows(project, materials), [project, materials]);

  const precoTotal = useMemo(() => {
    if (!showPrices) return null;
    const custoPecas = cutlist.length > 0 ? calcularPrecoTotalPecas(cutlist) : 0;
    const custoFerragens = ferragens.reduce((s, a) => s + (a.precoTotal ?? 0), 0);
    return calcularPrecoTotalProjeto(custoPecas + custoFerragens);
  }, [showPrices, cutlist, ferragens]);

  const pesoTotalKg = useMemo(() => {
    return pecasRows.reduce((s, r) => s + r.pesoKg, 0);
  }, [pecasRows]);

  const areaTotalM2 = useMemo(() => {
    return cutlist.reduce((s, i) => s + (i.dimensoes?.largura ?? 0) * (i.dimensoes?.altura ?? 0) * i.quantidade, 0) / 1_000_000;
  }, [cutlist]);

  const numeroChapas = useMemo(() => {
    const areaMm2 = areaTotalM2 * 1_000_000;
    return areaMm2 > 0 ? Math.ceil(areaMm2 / (CHAPA_PADRAO_LARGURA * CHAPA_PADRAO_ALTURA)) : 0;
  }, [areaTotalM2]);

  return (
    <Panel title="Resumo Financeiro">
      <IndustrialPanelPdfActions onGeneratePdf={exportResumoFinanceiroPdf} disabled={boxes.length === 0} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          className="button button-ghost"
          style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 12 }}
          onClick={() => setShowPecasList((v) => !v)}
        >
          <span>Peças totais</span>
          <span style={{ fontWeight: 700, color: "var(--blue-light)" }}>{totalPecas}</span>
        </button>

        {showPecasList ? (
          <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 8 }}>
            {pecasRows.map((row) => (
              <div key={`${row.caixa}-${row.tipo}-${row.dimensoes}`} style={{ fontSize: 11, marginBottom: 6, color: "var(--text-muted)" }}>
                <strong style={{ color: "var(--text-main)" }}>{row.caixa}</strong> — {row.categoria} / {row.tipo} — {row.dimensoes} ×{row.qtd}
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Área total</span>
          <span style={{ color: "var(--text-main)" }}>{areaTotalM2.toFixed(3)} m²</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Peso total</span>
          <span style={{ color: "var(--text-main)" }}>{pesoTotalKg.toFixed(2)} kg</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Nº de chapas</span>
          <span style={{ color: "var(--text-main)" }}>{numeroChapas}</span>
        </div>

        {showPrices ? (
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 8 }}>
            <span>Total geral</span>
            <span style={{ color: "var(--blue-light)" }}>{formatCurrency(precoTotal)}</span>
          </div>
        ) : (
          <p style={{ ...microTextStyle, marginTop: 8 }}>Preços visíveis apenas para administradores.</p>
        )}

        <button type="button" className="button button-secondary" style={{ marginTop: 8 }} onClick={() => togglePanel("pecasTotais")}>
          Abrir Peças totais
        </button>
      </div>
    </Panel>
  );
}
