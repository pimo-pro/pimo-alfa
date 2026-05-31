import { useMemo } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import { listOfficialMaterials } from "../../../core/materials/materials.api";
import { REMATE_PIECE_TIPO_LABELS } from "../../../core/remate/rematePieceTypes";
import type { RematePieceTipo } from "../../../core/remate/rematePieceTypes";

type Props = { remateId: string };

export default function RematePropertiesPanel({ remateId }: Props) {
  const { project, actions } = useProject();
  const remate = (project.remates ?? []).find((r) => r.id === remateId);
  const materials = useMemo(() => listOfficialMaterials().filter((m) => m.industrial), []);

  if (!remate) return null;

  return (
    <Panel title="Propriedades do Remate" description={remate.name}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Tipo
          <select
            className="select input-sm"
            value={remate.tipo}
            onChange={(e) =>
              actions.updateRemate(remate.id, {
                tipo: e.target.value as RematePieceTipo,
                followBox: Boolean(remate.parentBoxId),
              })
            }
          >
            {Object.entries(REMATE_PIECE_TIPO_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {(["width", "height", "depth"] as const).map((field) => (
          <label key={field} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            {field === "width" ? "Largura" : field === "height" ? "Altura" : "Profundidade"} (mm)
            <input
              className="input input-sm"
              type="number"
              min={1}
              value={remate[field]}
              onChange={(e) =>
                actions.updateRemate(remate.id, {
                  [field]: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
          </label>
        ))}

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Material
          <select
            className="select input-sm"
            value={remate.materialPresetId}
            onChange={(e) => actions.updateRemate(remate.id, { materialPresetId: e.target.value })}
          >
            {materials.map((m) => (
              <option key={m.canonicalId} value={m.canonicalId}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={remate.followBox}
            onChange={(e) => actions.updateRemate(remate.id, { followBox: e.target.checked })}
            disabled={!remate.parentBoxId}
          />
          Seguir caixa (snap automático)
        </label>

        <button type="button" className="btn btn-danger" onClick={() => actions.removeRemate(remate.id)}>
          Remover remate
        </button>
      </div>
    </Panel>
  );
}
