import { listOfficialMaterials } from "../core/materials/materials.api";

export type ApiMaterial = {
  id: string;
  label: string;
  espessura: number;
  precoPorM2: number;
  sheetWidthMm?: number;
  sheetHeightMm?: number;
  type: "wood";
  industrial: boolean;
  visual: boolean;
  aliases: string[];
  action: "manter" | "mesclar" | "renomear" | "remover";
  source: "industrial-default";
};

export type MaterialsApiPayload = {
  ok: true;
  count: number;
  materials: ApiMaterial[];
  updatedAt: string;
};

export function buildMaterialsApiPayload(): MaterialsApiPayload {
  const materials: ApiMaterial[] = listOfficialMaterials().map((m) => ({
    id: m.canonicalId,
    label: m.label,
    espessura: Number(m.industrialDefaults?.espessuraPadrao) || 0,
    precoPorM2: Number(m.industrialDefaults?.custo_m2) || 0,
    sheetWidthMm: m.industrialDefaults?.larguraChapa,
    sheetHeightMm: m.industrialDefaults?.alturaChapa,
    type: "wood",
    industrial: m.industrial,
    visual: m.visual,
    aliases: m.aliases.map((a) => a.name),
    action: m.action,
    source: "industrial-default",
  }));

  return {
    ok: true,
    count: materials.length,
    materials,
    updatedAt: new Date().toISOString(),
  };
}
