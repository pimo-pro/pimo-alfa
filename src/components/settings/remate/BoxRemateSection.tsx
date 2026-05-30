import { useMemo, useState } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import { listOfficialMaterials } from "../../../core/materials/materials.api";
import type { RematePosition, RemateType } from "../../../core/remate/remateTypes";

type Props = {
  boxId: string;
};

const TYPES: Array<{ id: RemateType; label: string }> = [
  { id: "completo", label: "Completo" },
  { id: "avista", label: "Avista" },
  { id: "L", label: "Remate L" },
  { id: "rodape", label: "Rodapé" },
];

const POSITIONS: Array<{ id: RematePosition; label: string }> = [
  { id: "dir", label: "Direita" },
  { id: "esq", label: "Esquerda" },
  { id: "cima", label: "Cima" },
  { id: "baixo", label: "Baixo" },
  { id: "rodape", label: "Rodapé" },
];

export default function BoxRemateSection({ boxId }: Props) {
  const { project, actions } = useProject();
  const [type, setType] = useState<RemateType>("avista");
  const [position, setPosition] = useState<RematePosition>("dir");
  const selectedBox = project.workspaceBoxes.find((box) => box.id === boxId);
  const materials = useMemo(() => listOfficialMaterials().filter((material) => material.industrial), []);
  const defaultMaterialId = selectedBox?.material || project.materialId || project.material.tipo;
  const [materialId, setMaterialId] = useState(defaultMaterialId);
  const remates = (project.remates ?? []).filter((remate) => remate.parentBoxId === boxId);

  return (
    <Panel title="Remate do Box" description="Peças independentes de acabamento final.">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <select className="select" value={type} onChange={(e) => setType(e.target.value as RemateType)}>
          {TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <select className="select" value={position} onChange={(e) => setPosition(e.target.value as RematePosition)}>
          {POSITIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <select className="select" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
          {materials.map((material) => (
            <option key={material.canonicalId} value={material.canonicalId}>
              {material.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          onClick={() => actions.createBoxRemate({ type, position, materialId, materialMode: "custom" })}
        >
          Criar remate
        </button>
      </div>

      {remates.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sem remates neste box.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {remates.map((remate) => (
            <div
              key={remate.id}
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <strong style={{ fontSize: 12 }}>{remate.name}</strong>
              <select
                className="select input-sm"
                value={remate.materialId}
                onChange={(e) => actions.updateRemate(remate.id, { materialId: e.target.value })}
              >
                {materials.map((material) => (
                  <option key={material.canonicalId} value={material.canonicalId}>
                    {material.label}
                  </option>
                ))}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <input
                  className="input input-sm"
                  type="number"
                  value={remate.dimensions.widthMm}
                  onChange={(e) =>
                    actions.updateRemate(remate.id, {
                      dimensions: { ...remate.dimensions, widthMm: Number(e.target.value) || 1 },
                    })
                  }
                />
                <input
                  className="input input-sm"
                  type="number"
                  value={remate.dimensions.heightMm}
                  onChange={(e) =>
                    actions.updateRemate(remate.id, {
                      dimensions: { ...remate.dimensions, heightMm: Number(e.target.value) || 1 },
                    })
                  }
                />
                <input
                  className="input input-sm"
                  type="number"
                  value={remate.dimensions.depthMm}
                  onChange={(e) =>
                    actions.updateRemate(remate.id, {
                      dimensions: { ...remate.dimensions, depthMm: Number(e.target.value) || 1 },
                    })
                  }
                />
              </div>
              <button type="button" className="btn btn-danger" onClick={() => actions.removeRemate(remate.id)}>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
