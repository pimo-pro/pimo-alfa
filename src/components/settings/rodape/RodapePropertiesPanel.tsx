import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import { listOfficialMaterials } from "../../../core/materials/materials.api";
import { rodapeKindLabel } from "../../../core/rodape/rodapeTypes";
import { getMaterialByIdOrLabel } from "../../../core/materials/service";
import { RODAPE_DEFAULT_HEIGHT_MM } from "../../../core/kitchenFinish/finishTypes";
import { resolveRodapePieceNomeForRodape } from "../../../core/rodape/labels";
import GroupedMaterialSelect from "../material/GroupedMaterialSelect";

type Props = { rodapeId: string };

function useTextField(
  value: string,
  onCommit: (next: string) => void
): {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
} {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  return {
    value: draft,
    onChange: (e) => setDraft(e.target.value),
    onBlur: () => {
      const trimmed = draft.trim();
      if (!trimmed) {
        setDraft(value);
        return;
      }
      onCommit(trimmed);
      setDraft(trimmed);
    },
  };
}

function useNumericField(
  value: number,
  onCommit: (next: number) => void,
  min = 1
): {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
} {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  return {
    value: draft,
    onChange: (e) => setDraft(e.target.value),
    onBlur: () => {
      const parsed = Number(draft);
      if (draft.trim() === "" || Number.isNaN(parsed)) {
        setDraft(String(value));
        return;
      }
      const clamped = Math.max(min, parsed);
      onCommit(clamped);
      setDraft(String(clamped));
    },
  };
}

export default function RodapePropertiesPanel({ rodapeId }: Props) {
  const { project, actions } = useProject();
  const rodape = (project.rodapes ?? []).find((r) => r.id === rodapeId);
  const materials = useMemo(() => listOfficialMaterials().filter((m) => m.industrial), []);

  const widthField = useNumericField(rodape?.dimensions.widthMm ?? 1, (widthMm) => {
    if (!rodape) return;
    actions.updateRodapeDimensions(rodape.id, { widthMm });
  });
  const heightField = useNumericField(
    rodape?.dimensions.heightMm ?? rodape?.heightMm ?? RODAPE_DEFAULT_HEIGHT_MM,
    (heightMm) => {
      if (!rodape) return;
      actions.updateRodapeDimensions(rodape.id, { heightMm });
    }
  );

  const boxNameById = useMemo(() => {
    const out: Record<string, string> = {};
    for (const box of project.workspaceBoxes) {
      if (box?.id) out[box.id] = typeof box.nome === "string" ? box.nome : box.id;
    }
    return out;
  }, [project.workspaceBoxes]);

  const autoNome = useMemo(() => {
    if (!rodape) return "";
    return resolveRodapePieceNomeForRodape(rodape, boxNameById);
  }, [rodape, boxNameById]);

  const nomeField = useTextField(autoNome, (trimmed) => {
    if (!rodape) return;
    actions.updateRodape(rodape.id, {
      nomePersonalizado: trimmed === autoNome ? undefined : trimmed,
    });
  });

  if (!rodape) return null;

  const material = getMaterialByIdOrLabel(rodape.materialId);
  const thicknessMm = Number(material?.espessura) || rodape.thicknessMm || 19;

  const parentBox = rodape.parentBoxId
    ? project.workspaceBoxes.find((b) => b.id === rodape.parentBoxId)
    : null;

  return (
    <Panel title="Propriedades do Roda Pé" description={autoNome}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Nome da peça
          <input className="input input-sm" type="text" {...nomeField} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Tipo
          <input className="input input-sm" readOnly value={rodapeKindLabel(rodape.kind, rodape.partIndex)} />
        </label>

        {parentBox ? (
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
            Módulo: {parentBox.nome || parentBox.id}
          </p>
        ) : null}

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Comprimento (mm)
          <input className="input input-sm" type="number" min={1} {...widthField} />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Altura (mm)
          <input className="input input-sm" type="number" min={1} {...heightField} />
        </label>

        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
          Espessura: {thicknessMm} mm (material)
        </p>

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Material
          <GroupedMaterialSelect
            materials={materials}
            value={rodape.materialId}
            onChange={(materialId) => {
              const mat = getMaterialByIdOrLabel(materialId);
              const nextThickness = Number(mat?.espessura) || thicknessMm;
              actions.updateRodape(rodape.id, {
                materialId,
                thicknessMm: nextThickness,
                dimensions: { ...rodape.dimensions, depthMm: nextThickness },
              });
            }}
            selectClassName="select input-sm"
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={rodape.visible !== false}
            onChange={(e) => actions.setRodapeVisible(rodape.id, e.target.checked)}
          />
          Visível no viewer
        </label>

        {rodape.placementFree ? (
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>Posição livre</p>
        ) : null}

        <button type="button" className="btn btn-danger" onClick={() => actions.removeRodape(rodape.id)}>
          Remover roda pé
        </button>
      </div>
    </Panel>
  );
}
