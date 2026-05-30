import { useMemo } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import { listOfficialMaterials } from "../../../core/materials/materials.api";
import type { CreateRemateInput, RemateFaceKind } from "../../../core/remate/remateTypes";
import { faceKindLabel } from "../../../core/remate/remateTypes";

type Props = {
  boxId: string;
};

const FACE_TOGGLES: Array<{
  faceKind: RemateFaceKind | "RODAPE";
  label: string;
  create: CreateRemateInput;
}> = [
  { faceKind: "DIR", label: "Remate DIR", create: { type: "avista", position: "dir" } },
  { faceKind: "ESQ", label: "Remate ESQ", create: { type: "avista", position: "esq" } },
  { faceKind: "CIMA", label: "Remate CIMA", create: { type: "avista", position: "cima" } },
  { faceKind: "BAIXO", label: "Remate BAIXO", create: { type: "avista", position: "baixo" } },
  { faceKind: "L", label: "Remate L (2 peças)", create: { type: "L", position: "dir" } },
  { faceKind: "RODAPE", label: "Roda pé", create: { type: "rodape", position: "rodape" } },
];

export default function BoxRemateSection({ boxId }: Props) {
  const { project, actions } = useProject();
  const selectedBox = project.workspaceBoxes.find((box) => box.id === boxId);
  const materials = useMemo(() => listOfficialMaterials().filter((material) => material.industrial), []);
  const defaultMaterialId = selectedBox?.material || project.materialId || project.material.tipo;
  const remates = (project.remates ?? []).filter((remate) => remate.parentBoxId === boxId);

  const rematesByFace = (face: RemateFaceKind | "RODAPE") =>
    remates.filter((r) => r.faceKind === face);

  const toggleFace = (face: RemateFaceKind | "RODAPE", create: CreateRemateInput) => {
    const existing = rematesByFace(face);
    if (existing.length > 0) {
      existing.forEach((r) => actions.removeRemate(r.id));
      return;
    }
    actions.createBoxRemate({
      ...create,
      parentBoxId: boxId,
      materialId: defaultMaterialId,
      materialMode: "custom",
    });
  };

  return (
    <Panel title="Remate do Box" description="Peças independentes — adicione várias faces no mesmo módulo.">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {FACE_TOGGLES.map((item) => {
          const active = rematesByFace(item.faceKind);
          const isOn = active.length > 0;
          return (
            <div
              key={item.faceKind}
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
                className={isOn ? "btn btn-danger" : "btn"}
                style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={() => toggleFace(item.faceKind, item.create)}
              >
                {isOn ? "Remover" : "Adicionar"}
              </button>
            </div>
          );
        })}
      </div>

      {remates.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Sem remates neste box.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
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
              <strong style={{ fontSize: 12 }}>
                {faceKindLabel(remate.faceKind)}
                {remate.partIndex ? ` · peça ${remate.partIndex}` : ""}
              </strong>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(
                  [
                    { key: "widthMm" as const, label: "Largura (mm)", min: 1, max: 3000 },
                    { key: "heightMm" as const, label: "Altura (mm)", min: 1, max: 3000 },
                    { key: "depthMm" as const, label: "Profundidade (mm)", min: 1, max: 1200 },
                  ] as const
                ).map((field) => (
                  <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>{field.label}</span>
                    <input
                      className="input input-sm"
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={remate.dimensions[field.key]}
                      onChange={(e) =>
                        actions.updateRemate(remate.id, {
                          dimensions: {
                            ...remate.dimensions,
                            [field.key]: Math.max(field.min, Number(e.target.value) || field.min),
                          },
                        })
                      }
                    />
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={1}
                      value={Math.min(field.max, Math.max(field.min, remate.dimensions[field.key]))}
                      onChange={(e) =>
                        actions.updateRemate(remate.id, {
                          dimensions: {
                            ...remate.dimensions,
                            [field.key]: Number(e.target.value),
                          },
                        })
                      }
                      style={{ width: "100%", accentColor: "var(--primary)" }}
                    />
                  </label>
                ))}
              </div>
              <button type="button" className="btn btn-danger" onClick={() => actions.removeRemate(remate.id)}>
                Remover peça
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
