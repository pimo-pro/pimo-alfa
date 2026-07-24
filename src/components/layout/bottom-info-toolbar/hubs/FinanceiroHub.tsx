import { useAuth } from "@/auth/useAuth";
import { hasFullAccess } from "@/auth/rbac";
import { useBottomInfo } from "@/context/BottomInfoContext";
import type { FinanceiroSectionId } from "@/context/BottomInfoContext";
import BottomInfoHubLayout from "../BottomInfoHubLayout";
import FinanceiroUnificadoPanel from "../../../panels/FinanceiroUnificadoPanel";
import FinanceiroPecasPanel from "../../../panels/FinanceiroPecasPanel";
import FinanceiroUnificadoEditPanel from "../../../panels/FinanceiroUnificadoEditPanel";
import { useMemo } from "react";
import { useProject } from "@/context/useProject";
import { useMaterials } from "@/hooks/useMaterials";
import { computeFinanceiroUnificado } from "@/core/financeiro";

/**
 * P3.7 — Hub Financeiro:
 * • Painel Unificado
 * • Financeiro peças
 * • Editar (ADMIN)
 */
const TABS_BASE: { id: FinanceiroSectionId; label: string }[] = [
  { id: "unificado", label: "Painel Unificado" },
  { id: "pecas", label: "Financeiro peças" },
];

export default function FinanceiroHub() {
  const { activeSection, setActiveSection } = useBottomInfo();
  const { hasPermission } = useAuth();
  const isAdmin = hasFullAccess(hasPermission);
  const { project } = useProject();
  const { materials } = useMaterials();

  const tabs = useMemo(() => {
    const list = [...TABS_BASE];
    if (isAdmin) list.push({ id: "editar", label: "Editar" });
    return list;
  }, [isAdmin]);

  const section: FinanceiroSectionId = tabs.some((t) => t.id === activeSection)
    ? (activeSection as FinanceiroSectionId)
    : "unificado";

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
          financeiroOverrides: project.financeiroOverrides,
          financeiroAdminSettings: project.financeiroAdminSettings,
        },
        materials
      ),
    [project, materials]
  );

  return (
    <BottomInfoHubLayout
      title="Financeiro"
      icon="finance"
      tabs={tabs}
      activeTabId={section}
      onTabChange={(id) => setActiveSection(id as FinanceiroSectionId)}
    >
      {section === "unificado" ? <FinanceiroUnificadoPanel embedded /> : null}
      {section === "pecas" ? <FinanceiroPecasPanel embedded /> : null}
      {section === "editar" && isAdmin ? (
        <FinanceiroUnificadoEditPanel
          snap={snap}
          onCancel={() => setActiveSection("unificado")}
          onSaved={() => setActiveSection("unificado")}
        />
      ) : null}
    </BottomInfoHubLayout>
  );
}
