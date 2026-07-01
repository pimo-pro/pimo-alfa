import { useBottomInfo } from "@/context/BottomInfoContext";
import { useProject } from "@/context/useProject";
import { useMaterials } from "@/hooks/useMaterials";
import { useEnviarParaFabrica } from "@/hooks/useEnviarParaFabrica";
import BottomInfoHubLayout from "../BottomInfoHubLayout";
import PecasTotaisPanel from "../../../panels/PecasTotaisPanel";
import FerragensTotaisPanel from "../../../panels/FerragensTotaisPanel";
import PainelConsumoMateriais from "../../../panels/painelConsumoMateriais";
import PainelChapasReal from "../../../panels/painelChapasReal";
import PainelResumoIndustriais from "../../../panels/painelResumoIndustriais";
import Button from "../../../ui/Button";

const TABS = [
  { id: "pecasTotais", label: "Peças Totais" },
  { id: "ferragensTotais", label: "Ferragens Totais" },
  { id: "consumoMateriais", label: "Consumo Materiais" },
  { id: "chapasReal", label: "Chapas Real" },
  { id: "resumoIndustriais", label: "Observações Industriais" },
  { id: "enviarFabrica", label: "Enviar para Fábrica" },
] as const;

type IndustriaisTabId = (typeof TABS)[number]["id"];

export default function IndustriaisHub() {
  const { activeSection, setActiveSection } = useBottomInfo();
  const { project } = useProject();
  const { materials } = useMaterials();
  const { sending, enviar } = useEnviarParaFabrica(project, materials);

  const section: IndustriaisTabId = TABS.some((t) => t.id === activeSection)
    ? (activeSection as IndustriaisTabId)
    : "pecasTotais";

  return (
    <BottomInfoHubLayout
      title="Industriais"
      icon="industrial"
      tabs={[...TABS]}
      activeTabId={section}
      onTabChange={(id) => setActiveSection(id as IndustriaisTabId)}
    >
      {section === "pecasTotais" ? <PecasTotaisPanel embedded /> : null}
      {section === "ferragensTotais" ? <FerragensTotaisPanel embedded /> : null}
      {section === "consumoMateriais" ? <PainelConsumoMateriais embedded /> : null}
      {section === "chapasReal" ? <PainelChapasReal embedded /> : null}
      {section === "resumoIndustriais" ? <PainelResumoIndustriais embedded /> : null}
      {section === "enviarFabrica" ? (
        <div className="bottom-info-hub__card">
          <h3 className="bottom-info-hub__card-title">Enviar para Fábrica — PIMO TRAK</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0 }}>
            Envia a ordem industrial com peças, ferragens, medidas, observações e operações registadas.
          </p>
          <Button
            variant="primary"
            disabled={sending || (project.boxes ?? []).length === 0}
            onClick={() => void enviar()}
          >
            {sending ? "A enviar…" : "Enviar ordem para fábrica"}
          </Button>
        </div>
      ) : null}
    </BottomInfoHubLayout>
  );
}
