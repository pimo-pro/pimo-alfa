import { useMemo } from "react";
import { useProject } from "../../context/useProject";
import { useMaterials } from "../../hooks/useMaterials";
import { useAuth } from "../../auth/useAuth";
import { hasFullAccess } from "../../auth/rbac";
import { canShowSectionPrices } from "../../admin/industrialSectionsConfig";
import Panel from "../ui/Panel";
import {
  computeFinanceiroUnificado,
  financeiroCustoRows,
} from "../../core/financeiro";
import { formatCurrency } from "../../utils/formatting";

export default function PainelCustosAdmin() {
  const { project } = useProject();
  const { materials } = useMaterials();
  const { hasPermission } = useAuth();
  const isAdmin = hasFullAccess(hasPermission);
  const showPrices = canShowSectionPrices("totaisProjeto", isAdmin);

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

  const rows = useMemo(() => {
    if (!showPrices) return [];
    return financeiroCustoRows(snap);
  }, [snap, showPrices]);

  if (!isAdmin) {
    return (
      <Panel title="Custos (ADMIN)">
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Acesso restrito a administradores.</p>
      </Panel>
    );
  }

  if ((project.boxes ?? []).length === 0) {
    return (
      <Panel title="Custos (ADMIN)">
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Adicione caixas para visualizar custos.</p>
      </Panel>
    );
  }

  return (
    <div className="bottom-info-hub__card">
      <h3 className="bottom-info-hub__card-title">Custos do projeto (ADMIN)</h3>
      <div className="data-list">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`data-list__row${row.total ? " data-list__row--total" : ""}`}
          >
            <span className="data-list__label">{row.label}</span>
            <span className={`data-list__value${row.total ? " data-list__value--accent" : ""}`}>
              {row.emBreve || row.valor == null ? "em breve" : formatCurrency(row.valor)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
