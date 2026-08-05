import { useMemo } from "react";
import type { OfficialWoodMaterial } from "../../../core/materials/materials.api";
import {
  findGrupoByMaterialId,
  getMaterialEspessuraMm,
  groupMaterialsByPadronizado,
  resolveVariantInGrupo,
} from "./materialGrouping";

type Props = {
  materials: OfficialWoodMaterial[];
  value: string;
  onChange: (canonicalId: string) => void;
  className?: string;
  selectClassName?: string;
  materialSelectId?: string;
  thicknessSelectId?: string;
};

export default function GroupedMaterialSelect({
  materials,
  value,
  onChange,
  className,
  selectClassName = "select",
  materialSelectId,
  thicknessSelectId,
}: Props) {
  const grupos = useMemo(() => groupMaterialsByPadronizado(materials), [materials]);

  const currentGrupo =
    findGrupoByMaterialId(grupos, value) ?? grupos[0] ?? null;

  const currentThickness = useMemo(() => {
    const current = materials.find((m) => m.canonicalId === value);
    return current ? getMaterialEspessuraMm(current) : 0;
  }, [materials, value]);

  const thicknessOptions = currentGrupo?.listaDeEspessuras ?? [];
  const thicknessSelectValue = thicknessOptions.some(
    (m) => getMaterialEspessuraMm(m) === currentThickness
  )
    ? currentThickness
    : getMaterialEspessuraMm(thicknessOptions[0] ?? { label: "" });

  const handleFamilyChange = (materialPadronizado: string) => {
    const grupo = grupos.find((g) => g.materialPadronizado === materialPadronizado);
    if (!grupo) return;
    const next = resolveVariantInGrupo(grupo, currentThickness);
    if (next?.canonicalId) onChange(next.canonicalId);
  };

  const handleThicknessChange = (thicknessMm: number) => {
    if (!currentGrupo) return;
    const next = resolveVariantInGrupo(currentGrupo, thicknessMm);
    if (next?.canonicalId) onChange(next.canonicalId);
  };

  if (grupos.length === 0) {
    return (
      <select className={selectClassName} value="" disabled>
        <option value="">Sem materiais</option>
      </select>
    );
  }

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
      <select
        id={materialSelectId}
        className={selectClassName}
        value={currentGrupo?.materialPadronizado ?? ""}
        onChange={(e) => handleFamilyChange(e.target.value)}
        style={{ width: "100%" }}
      >
        {grupos.map((g) => (
          <option key={g.materialPadronizado} value={g.materialPadronizado}>
            {g.materialPadronizado}
          </option>
        ))}
      </select>
      <select
        id={thicknessSelectId}
        className={selectClassName}
        value={thicknessSelectValue || ""}
        onChange={(e) => handleThicknessChange(Number(e.target.value))}
        style={{ width: "100%" }}
      >
        {thicknessOptions.map((m) => {
          const t = getMaterialEspessuraMm(m);
          return (
            <option key={m.canonicalId} value={t}>
              {t} mm
            </option>
          );
        })}
      </select>
    </div>
  );
}
