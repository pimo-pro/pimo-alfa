import { listMaterials } from "../../../core/materials";
import { MATERIAIS_INDUSTRIAIS } from "../../../core/manufacturing/materials";

export type MaterialOption = {
  id: string;
  label: string;
  color?: string;
  espessura?: number;
  precoPorM2?: number;
};

export function normalizeApiMaterial(item: unknown): MaterialOption | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const id = row.id;
  const label = row.label;
  if (typeof id !== "string" || typeof label !== "string") return null;
  return {
    id,
    label,
    color: typeof row.color === "string" ? row.color : undefined,
    espessura: Number.isFinite(Number(row.espessura)) ? Number(row.espessura) : undefined,
    precoPorM2: Number.isFinite(Number(row.precoPorM2)) ? Number(row.precoPorM2) : undefined,
  };
}

export function fallbackMaterialsFromLocalStorage(): MaterialOption[] {
  const fromCrud = listMaterials().map((m) => ({
    id: m.id,
    label: m.label,
    color: m.color,
    espessura: m.espessura,
    precoPorM2: m.precoPorM2,
  }));
  if (fromCrud.length > 0) return fromCrud;

  try {
    const raw = localStorage.getItem("pimo_admin_materials");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const nome = row.nome;
        if (typeof nome !== "string") return null;
        const id = typeof row.id === "string" ? row.id : nome;
        return {
          id,
          label: nome,
          color: typeof row.cor === "string" ? row.cor : undefined,
          espessura: Number.isFinite(Number(row.espessuraPadrao)) ? Number(row.espessuraPadrao) : undefined,
          precoPorM2: Number.isFinite(Number(row.custo_m2)) ? Number(row.custo_m2) : undefined,
        } as MaterialOption;
      })
      .filter((v): v is MaterialOption => Boolean(v));
  } catch {
    return [];
  }
}

export function defaultIndustrialMaterials(): MaterialOption[] {
  return MATERIAIS_INDUSTRIAIS.map((m) => ({
    id: m.id,
    label: m.nome,
    color: m.cor,
    espessura: m.espessuraPadrao,
    precoPorM2: m.custo_m2,
  }));
}
