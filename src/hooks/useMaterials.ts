import type { MaterialIndustrial } from "../core/manufacturing/materials";
import { listIndustrialWoodMaterials } from "../core/materials/materials.api";
import { useStorageList } from "./useStorageList";

const STORAGE_KEY = "pimo_admin_materials";

const MATERIALS_DEFAULT: MaterialIndustrial[] = listIndustrialWoodMaterials().map((m) => ({
  id: m.canonicalId,
  nome: m.label,
  espessuraPadrao: m.industrialDefaults?.espessuraPadrao ?? 19,
  custo_m2: m.industrialDefaults?.custo_m2 ?? 0,
  materialPbrId: m.viewerMaterialId as MaterialIndustrial["materialPbrId"],
  larguraChapa: m.industrialDefaults?.larguraChapa,
  alturaChapa: m.industrialDefaults?.alturaChapa,
  densidade: m.industrialDefaults?.densidade,
}));

export const useMaterials = () => {
  const { items, setItems, reload } = useStorageList<MaterialIndustrial>({
    storageKey: STORAGE_KEY,
    defaultValue: MATERIALS_DEFAULT,
    validate: (value): value is MaterialIndustrial[] =>
      Array.isArray(value) && value.length > 0,
  });

  return { materials: items, setMaterials: setItems, reload };
};
