import { useMemo } from "react";
import { useBottomInfo } from "@/context/BottomInfoContext";
import {
  INDUSTRIAL_OPERATION_IDS,
  INDUSTRIAL_OPERATION_LABELS,
  type IndustrialOperationId,
} from "@/core/industrial/industrialPieceEditsTypes";
import BottomInfoHubLayout from "../BottomInfoHubLayout";
import PainelOperacoesIndustriais from "../../../panels/painelOperacoesIndustriais";
import PainelOperacaoSingle from "../../../panels/PainelOperacaoSingle";

const TABS = [{ id: "todas", label: "Todas as operações" }, ...INDUSTRIAL_OPERATION_IDS.map((id) => ({
  id,
  label: INDUSTRIAL_OPERATION_LABELS[id],
}))];

export default function OperacoesHub() {
  const { activeSection, setActiveSection } = useBottomInfo();

  const section = useMemo(() => {
    if (TABS.some((t) => t.id === activeSection)) return activeSection;
    return "todas";
  }, [activeSection]);

  const operationId =
    section !== "todas" && INDUSTRIAL_OPERATION_IDS.includes(section as IndustrialOperationId)
      ? (section as IndustrialOperationId)
      : null;

  return (
    <BottomInfoHubLayout
      title="Operações"
      icon="operations"
      tabs={TABS}
      activeTabId={section}
      onTabChange={(id) => setActiveSection(id as typeof section)}
    >
      {section === "todas" ? <PainelOperacoesIndustriais embedded /> : null}
      {operationId ? <PainelOperacaoSingle operationId={operationId} /> : null}
    </BottomInfoHubLayout>
  );
}
