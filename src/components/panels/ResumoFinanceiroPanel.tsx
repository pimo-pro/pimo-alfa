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
  ferragensFromBoxes,
} from "../../core/manufacturing/cutlistFromBoxes";
import { getCutlist } from "../../core/industrial/IndustrialCenter";
import type { ProjectState } from "../../context/projectTypes";
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

export default function ResumoFinanceiroPanel({ embedded }: { embedded?: boolean } = {}) {
  const { project } = useProject();
  const { materials } = useMaterials();
  const { hasPermission } = useAuth();
  const isAdmin = hasFullAccess(hasPermission);
  const showPrices = canShowSectionPrices("resumoFinanceiro", isAdmin);
  const { exportResumoFinanceiroPdf } = useIndustrialBottomPdf();
  const { openGroupSection } = useBottomInfo();
  const [showPecasList, setShowPecasList] = useState(false);

  const boxes = useMemo(() => project.boxes ?? [], [project.boxes]);
  const cutlist = useMemo(
    () => getCutlist(project as ProjectState, "withPieceEdits"),
    [project]
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
    <Panel title={embedded ? undefined : "Resumo Financeiro"}>
      <IndustrialPanelPdfActions onGeneratePdf={exportResumoFinanceiroPdf} disabled={boxes.length === 0} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="data-list">
          <button
            type="button"
            className="data-list__row data-list__row--interactive"
            onClick={() => setShowPecasList((v) => !v)}
          >
            <span className="data-list__label">Peças totais</span>
            <span className="data-list__value data-list__value--accent">{totalPecas}</span>
          </button>

          <div className="data-list__row">
            <span className="data-list__label">Área total</span>
            <span className="data-list__value">{areaTotalM2.toFixed(3)} m²</span>
          </div>
          <div className="data-list__row">
            <span className="data-list__label">Peso total</span>
            <span className="data-list__value">{pesoTotalKg.toFixed(2)} kg</span>
          </div>
          <div className="data-list__row">
            <span className="data-list__label">Nº de chapas</span>
            <span className="data-list__value">{numeroChapas}</span>
          </div>

          {showPrices ? (
            <div className="data-list__row data-list__row--total">
              <span className="data-list__label">Total geral</span>
              <span className="data-list__value data-list__value--accent">{formatCurrency(precoTotal)}</span>
            </div>
          ) : null}
        </div>

        {!showPrices ? (
          <p style={{ ...microTextStyle, marginTop: 0 }}>Preços visíveis apenas para administradores.</p>
        ) : null}

        {showPecasList ? (
          <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 8 }}>
            {pecasRows.map((row) => (
              <div key={`${row.caixa}-${row.tipo}-${row.dimensoes}`} style={{ fontSize: 11, marginBottom: 6, color: "var(--text-muted)" }}>
                <strong style={{ color: "var(--text-main)" }}>{row.caixa}</strong> — {row.categoria} / {row.tipo} — {row.dimensoes} ×{row.qtd}
              </div>
            ))}
          </div>
        ) : null}

        <button type="button" className="button button-secondary" style={{ marginTop: 8 }} onClick={() => openGroupSection("industriais", "pecasTotais")}>
          Abrir Peças totais
        </button>
      </div>
    </Panel>
  );
}
