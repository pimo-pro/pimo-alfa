import { useMemo, useState } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import { listOfficialMaterials } from "../../../core/materials/materials.api";
import { getViewerMaterialId } from "../../../core/materials/service";
import { normalizeOrlaPresets } from "../../../core/orla/orlaPresets";
import type { RematePosition, RemateType } from "../../../core/remate/remateTypes";

type SelecionarMaterialSectionProps = {
  boxId: string;
  onViewerMaterialChange?: (_boxId: string, _materialId: string) => void;
};

const REMATE_TYPES: Array<{ id: RemateType; label: string }> = [
  { id: "completo", label: "Completo" },
  { id: "avista", label: "Avista" },
  { id: "L", label: "Remate L" },
  { id: "rodape", label: "Rodapé" },
];

const DEFAULT_REMATE_POSITION: Record<RemateType, RematePosition> = {
  completo: "dir",
  avista: "dir",
  L: "dir",
  rodape: "rodape",
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
  const remates = (project.remates ?? []).filter((remate) => remate.parentBoxId === boxId);
  const activeRemateType = remates[0]?.type ?? "";
  const [selectedRemateType, setSelectedRemateType] = useState<RemateType | "">(activeRemateType);

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
            Remate
          </div>
          <select
            className="select"
            value={selectedRemateType}
            onChange={(e) => {
              const value = e.target.value as RemateType | "";
              remates.forEach((remate) => actions.removeRemate(remate.id));
              setSelectedRemateType(value);
              if (!value) return;
              actions.createBoxRemate({
                type: value,
                position: DEFAULT_REMATE_POSITION[value],
                materialId: currentMaterialId,
                materialMode: "box",
              });
            }}
          >
            <option value="">Sem remate</option>
            {REMATE_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            O tipo selecionado cria remates independentes associados ao box.
          </div>
        </section>
      </div>
    </Panel>
  );
}
