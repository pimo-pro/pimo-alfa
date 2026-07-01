import { useMemo } from "react";
import { useAuth } from "@/auth/useAuth";
import { hasFullAccess } from "@/auth/rbac";
import { useBottomInfo } from "@/context/BottomInfoContext";
import type { FinanceiroSectionId } from "@/context/BottomInfoContext";
import BottomInfoHubLayout from "../BottomInfoHubLayout";
import ResumoFinanceiroPanel from "../../../panels/ResumoFinanceiroPanel";
import TotaisProjetoPanel from "../../../panels/TotaisProjetoPanel";
import PainelCustosAdmin from "../../../panels/PainelCustosAdmin";

const TABS_BASE: { id: FinanceiroSectionId; label: string }[] = [
  { id: "resumo", label: "Resumo Financeiro" },
  { id: "totais", label: "Totais do Projeto" },
];

export default function FinanceiroHub() {
  const { activeSection, setActiveSection } = useBottomInfo();
  const { hasPermission } = useAuth();
  const isAdmin = hasFullAccess(hasPermission);

  const tabs = useMemo(() => {
    const list: { id: FinanceiroSectionId; label: string }[] = [...TABS_BASE];
    if (isAdmin) list.push({ id: "custos", label: "Custos (ADMIN)" });
    return list;
  }, [isAdmin]);

  const section: FinanceiroSectionId = tabs.some((t) => t.id === activeSection)
    ? (activeSection as FinanceiroSectionId)
    : "resumo";

  return (
    <BottomInfoHubLayout
      title="Financeiro"
      icon="finance"
      tabs={tabs}
      activeTabId={section}
      onTabChange={(id) => setActiveSection(id as FinanceiroSectionId)}
    >
      {section === "resumo" ? <ResumoFinanceiroPanel embedded /> : null}
      {section === "totais" ? <TotaisProjetoPanel embedded /> : null}
      {section === "custos" && isAdmin ? <PainelCustosAdmin /> : null}
    </BottomInfoHubLayout>
  );
}
