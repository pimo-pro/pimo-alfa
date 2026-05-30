import { useMemo } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import { listOfficialMaterials } from "../../../core/materials/materials.api";
import { getViewerMaterialId } from "../../../core/materials/service";
import { normalizeOrlaPresets } from "../../../core/orla/orlaPresets";
type SelecionarMaterialSectionProps = {
  boxId: string;
  onViewerMaterialChange?: (_boxId: string, _materialId: string) => void;
};

export default function SelecionarMaterialSection({
  boxId,
  onViewerMaterialChange,
}: SelecionarMaterialSectionProps) {
  const { project, actions } = useProject();
  const box = project.workspaceBoxes.find((item) => item.id === boxId);
  const woodMaterials = useMemo(
    () => listOfficialMaterials().filter((material) => material.industrial && material.visual),
    []
  );
  const orlaPresets = normalizeOrlaPresets(project.orlaPresets);
  const remateCount = (project.remates ?? []).filter((remate) => remate.parentBoxId === boxId).length;

  if (!box) return null;

  const currentMaterialId = box.material || project.materialId || project.material.tipo;

  return (
    <Panel title="Selecionar Material" description="Material da caixa, orla e remate do box selecionado.">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
            Material da Caixa
          </div>
          <select
            className="select"
            value={currentMaterialId}
            onChange={(e) => {
              const materialId = e.target.value;
              actions.setWorkspaceBoxMaterial(boxId, materialId);
              onViewerMaterialChange?.(boxId, getViewerMaterialId(materialId));
            }}
          >
            {woodMaterials.map((material) => (
              <option key={material.canonicalId} value={material.canonicalId}>
                {material.label}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            A espessura é aplicada automaticamente pelas regras do material.
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
            Orla
          </div>
          <select
            className="select"
            value={box.orlaPresetId ?? ""}
            onChange={(e) => actions.setBoxOrlaPreset(boxId, e.target.value || null)}
          >
            <option value="">Sem orla</option>
            {orlaPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.nome}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Materiais, espessura e tipo seguem os presets permitidos de Orla V1.
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
            Remate / Roda pé
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {remateCount > 0
              ? `${remateCount} peça(s) neste módulo. Use o painel «componentes» ou «Remate do Box» para adicionar DIR, ESQ, CIMA, BAIXO, L ou roda pé.`
              : "Nenhum remate. Adicione faces no painel «Remate do Box» ou no menu «componentes»."}
          </div>
        </section>
      </div>
    </Panel>
  );
}
