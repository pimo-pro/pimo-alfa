import { useMemo } from "react";
import { useProject } from "../../context/useProject";
import { useCutlistData } from "../../hooks/useCutlistData";
import { useAuth } from "../../auth/useAuth";
import { hasFullAccess } from "../../auth/rbac";
import { canShowSectionPrices } from "../../admin/industrialSectionsConfig";
import Panel from "../ui/Panel";
import { formatCurrency } from "../../utils/formatting";

export default function PainelCustosAdmin() {
  const { project } = useProject();
  const data = useCutlistData();
  const { hasPermission } = useAuth();
  const isAdmin = hasFullAccess(hasPermission);
  const showPrices = canShowSectionPrices("totaisProjeto", isAdmin);

  const rows = useMemo(() => {
    if (!showPrices) return [];
    return [
      ["Painéis", formatCurrency(data.custoTotalPaineis)],
      ["Portas", formatCurrency(data.custoTotalPortas)],
      ["Gavetas", formatCurrency(data.custoTotalGavetas)],
      ["Ferragens", formatCurrency(data.custoTotalFerragens)],
      ["Orla", formatCurrency(data.custoTotalOrla)],
      ["Remates", formatCurrency(data.custoTotalRemates)],
      ["Total projeto", formatCurrency(data.custoTotal)],
    ] as const;
  }, [data, showPrices]);

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
      <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
        {rows.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderRadius: 6,
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
