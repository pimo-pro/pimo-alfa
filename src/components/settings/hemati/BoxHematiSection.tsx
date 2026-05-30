import { useMemo } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import { listOfficialMaterials } from "../../../core/materials/materials.api";
import type { CreateHematiInput, HematiKind } from "../../../core/hemati/hematiTypes";
import { hematiKindLabel } from "../../../core/hemati/hematiTypes";
import { HEMATI_DEFAULT_THICKNESS_MM } from "../../../core/kitchenFinish/finishTypes";

type Props = {
  boxId: string;
};

const TOGGLES: Array<{ kind: HematiKind; label: string }> = [
  { kind: "DIR", label: "Hemati DIR" },
  { kind: "ESQ", label: "Hemati ESQ" },
  { kind: "CIMA", label: "Hemati CIMA" },
  { kind: "BAIXO", label: "Hemati BAIXO" },
  { kind: "L", label: "Hemati L (2 peças)" },
  { kind: "U", label: "Hemati U (3 peças)" },
  { kind: "FULL", label: "Hemati Full Wall" },
];

export default function BoxHematiSection({ boxId }: Props) {
  const { project, actions } = useProject();
  const box = project.workspaceBoxes.find((b) => b.id === boxId);
  const materials = useMemo(() => listOfficialMaterials().filter((m) => m.industrial), []);
  const defaultMaterialId = box?.material || project.materialId || project.material.tipo;
  const hematis = (project.hematis ?? []).filter((h) => h.parentBoxId === boxId);

  const byKind = (kind: HematiKind) => hematis.filter((h) => h.kind === kind);

  const toggle = (kind: HematiKind) => {
    const existing = byKind(kind);
    if (existing.length > 0) {
      existing.forEach((h) => actions.removeHemati(h.id));
      return;
    }
    const input: CreateHematiInput = { kind, parentBoxId: boxId, materialId: defaultMaterialId };
    if (kind === "FULL" && project.room?.walls?.[0]) {
      input.parentWallId = project.room.walls[0].id;
    }
    actions.createBoxHemati(input);
  };

  return (
    <Panel title="Hemati do Módulo" description="Acabamento superior e lateral — peças móveis e independentes.">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {TOGGLES.map((item) => {
          const active = byKind(item.kind);
          return (
            <div
              key={item.kind}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "6px 8px",
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
              }}
            >
              <span style={{ fontSize: 12 }}>{item.label}</span>
              <button
                type="button"
                className={active.length ? "btn btn-danger" : "btn"}
                style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={() => toggle(item.kind)}
              >
                {active.length ? "Remover" : "Adicionar"}
              </button>
            </div>
          );
        })}
      </div>

      {hematis.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {hematis.map((hemati) => (
            <div
              key={hemati.id}
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                opacity: hemati.visible === false ? 0.55 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 12 }}>
                  {hematiKindLabel(hemati.kind, hemati.partIndex)}
                </strong>
                <label style={{ fontSize: 11, display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={hemati.visible !== false}
                    onChange={(e) => actions.setHematiVisible(hemati.id, e.target.checked)}
                  />
                  Visível
                </label>
              </div>
              <select
                className="select input-sm"
                value={hemati.materialId}
                onChange={(e) => actions.updateHemati(hemati.id, { materialId: e.target.value })}
              >
                {materials.map((m) => (
                  <option key={m.canonicalId} value={m.canonicalId}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                className="input input-sm"
                type="number"
                title="Espessura (mm)"
                value={hemati.thicknessMm}
                onChange={(e) =>
                  actions.updateHemati(hemati.id, { thicknessMm: Number(e.target.value) || HEMATI_DEFAULT_THICKNESS_MM })
                }
              />
              {hemati.kind === "CIMA" && (
                <input
                  className="input input-sm"
                  type="number"
                  title="Altura CIMA (mm)"
                  value={hemati.dimensions.heightMm}
                  onChange={(e) =>
                    actions.updateHemati(hemati.id, {
                      dimensions: {
                        ...hemati.dimensions,
                        heightMm: Number(e.target.value) || 10,
                      },
                    })
                  }
                />
              )}
              <button type="button" className="btn btn-danger" onClick={() => actions.removeHemati(hemati.id)}>
                Remover peça
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
