import { PANEL_DEFAULTS } from "../panel/panelConstants";

export type MigrationAliasAction = "manter" | "mesclar" | "renomear" | "remover";

export type MaterialAlias = {
  name: string;
  origin: string[];
  action: MigrationAliasAction;
};

export type OfficialWoodMaterial = {
  canonicalId: string;
  label: string;
  type: "wood";
  industrial: boolean;
  visual: boolean;
  aliases: MaterialAlias[];
  action: MigrationAliasAction;
  observacoes?: string;
  // Campos tecnicos opcionais para manter o comportamento atual sem fontes paralelas.
  industrialDefaults?: {
    espessuraPadrao: number;
    custo_m2: number;
    larguraChapa: number;
    alturaChapa: number;
    densidade: number;
  };
  viewerMaterialId?: string;
};

const SHEET_W = PANEL_DEFAULTS.largura_mm;
const SHEET_H = PANEL_DEFAULTS.altura_mm;

/**
 * Fonte oficial unificada de materiais (madeira apenas).
 * action e aliases sao metadados de migracao; o runtime usa apenas registros ativos.
 */
export const OFFICIAL_WOOD_MATERIALS_SEED: OfficialWoodMaterial[] = [
  {
    canonicalId: "mdf_branco",
    label: "MDF Branco",
    type: "wood",
    industrial: true,
    visual: true,
    action: "manter",
    viewerMaterialId: "mdf_branco",
    industrialDefaults: {
      espessuraPadrao: PANEL_DEFAULTS.espessura_mm,
      custo_m2: 35,
      larguraChapa: SHEET_W,
      alturaChapa: SHEET_H,
      densidade: 750,
    },
    aliases: [
      { name: "MDF Branco", origin: ["industrial", "legacy", "ui"], action: "manter" },
      { name: "MDF", origin: ["pricing", "defaults"], action: "mesclar" },
      { name: "Branco", origin: ["catalogo:mdfLibrary"], action: "mesclar" },
      { name: "Branco Liso", origin: ["presets"], action: "mesclar" },
      { name: "MDF Branco (legacy)", origin: ["legacy-cutlist"], action: "mesclar" }
    ],
    observacoes: "Entrada principal MDF."
  },
  {
    canonicalId: "mdf_cinza",
    label: "MDF Cinza",
    type: "wood",
    industrial: false,
    visual: true,
    action: "manter",
    viewerMaterialId: "mdf_cinza",
    aliases: [
      { name: "MDF Cinza", origin: ["visual", "ui"], action: "manter" },
      { name: "Cinza Industrial", origin: ["presets"], action: "mesclar" }
    ]
  },
  {
    canonicalId: "mdf_preto",
    label: "MDF Preto",
    type: "wood",
    industrial: false,
    visual: true,
    action: "manter",
    viewerMaterialId: "mdf_preto",
    aliases: [
      { name: "MDF Preto", origin: ["visual", "ui", "catalogo:mdfLibrary"], action: "manter" },
      { name: "Preto Fosco", origin: ["presets"], action: "mesclar" }
    ]
  },
  {
    canonicalId: "carvalho",
    label: "Carvalho",
    type: "wood",
    industrial: true,
    visual: true,
    action: "manter",
    viewerMaterialId: "carvalho_natural",
    industrialDefaults: {
      espessuraPadrao: 20,
      custo_m2: 45,
      larguraChapa: SHEET_W,
      alturaChapa: SHEET_H,
      densidade: 720,
    },
    aliases: [
      { name: "Carvalho", origin: ["industrial", "pricing", "ui"], action: "manter" },
      { name: "Carvalho Natural", origin: ["visual", "ui"], action: "mesclar" },
      { name: "Carvalho Escuro", origin: ["visual", "ui"], action: "mesclar" },
      { name: "Madeira - Carvalho", origin: ["presets"], action: "mesclar" },
      { name: "carvalho_natural", origin: ["viewer"], action: "mesclar" },
      { name: "carvalho_escuro", origin: ["viewer"], action: "mesclar" }
    ],
    observacoes: "Visual possui variantes natural/escuro; industrial permanece unico."
  },
  {
    canonicalId: "nogueira",
    label: "Nogueira",
    type: "wood",
    industrial: false,
    visual: true,
    action: "manter",
    viewerMaterialId: "nogueira",
    aliases: [
      { name: "Nogueira", origin: ["visual", "ui"], action: "manter" },
      { name: "Madeira - Nogueira", origin: ["materialPresets"], action: "mesclar" },
      { name: "nogueira", origin: ["viewer"], action: "mesclar" }
    ]
  },
  {
    canonicalId: "pinho",
    label: "Pinho",
    type: "wood",
    industrial: true,
    visual: true,
    action: "manter",
    viewerMaterialId: "carvalho_natural",
    industrialDefaults: {
      espessuraPadrao: 18,
      custo_m2: 35,
      larguraChapa: SHEET_W,
      alturaChapa: SHEET_H,
      densidade: 650,
    },
    aliases: [
      { name: "Pinho", origin: ["pricing", "ui"], action: "manter" },
      { name: "Madeira - Pinho", origin: ["presets"], action: "mesclar" }
    ]
  },
  {
    canonicalId: "faia",
    label: "Faia",
    type: "wood",
    industrial: false,
    visual: false,
    action: "manter",
    aliases: [{ name: "Faia", origin: ["ui modelos"], action: "manter" }]
  },
  {
    canonicalId: "contraplacado",
    label: "Contraplacado",
    type: "wood",
    industrial: true,
    visual: false,
    action: "manter",
    industrialDefaults: {
      espessuraPadrao: 19,
      custo_m2: 68,
      larguraChapa: SHEET_W,
      alturaChapa: SHEET_H,
      densidade: 600,
    },
    aliases: [
      { name: "Contraplacado", origin: ["industrial", "ui"], action: "manter" },
      { name: "Plywood", origin: ["pricing"], action: "renomear" }
    ]
  },
  {
    canonicalId: "melamina",
    label: "Melamina",
    type: "wood",
    industrial: true,
    visual: false,
    action: "manter",
    industrialDefaults: {
      espessuraPadrao: 19,
      custo_m2: 22,
      larguraChapa: SHEET_W,
      alturaChapa: SHEET_H,
      densidade: 700,
    },
    aliases: [{ name: "Melamina", origin: ["industrial"], action: "manter" }]
  },
  {
    canonicalId: "lacado",
    label: "Lacado",
    type: "wood",
    industrial: true,
    visual: false,
    action: "manter",
    industrialDefaults: {
      espessuraPadrao: 20,
      custo_m2: 90,
      larguraChapa: SHEET_W,
      alturaChapa: SHEET_H,
      densidade: 750,
    },
    aliases: [{ name: "Lacado", origin: ["industrial", "ui"], action: "manter" }]
  },
  {
    canonicalId: "mdf_clarus",
    label: "MDF Clarus",
    type: "wood",
    industrial: false,
    visual: true,
    action: "manter",
    viewerMaterialId: "mdf_branco",
    aliases: [{ name: "MDF Clarus", origin: ["catalogo:mdfLibrary"], action: "manter" }]
  },
  {
    canonicalId: "mdf_noce",
    label: "MDF Noce",
    type: "wood",
    industrial: false,
    visual: true,
    action: "manter",
    viewerMaterialId: "nogueira",
    aliases: [{ name: "MDF Noce", origin: ["catalogo:mdfLibrary"], action: "manter" }]
  },
  {
    canonicalId: "madeira_generica_clara",
    label: "Madeira Clara",
    type: "wood",
    industrial: false,
    visual: true,
    action: "remover",
    aliases: [{ name: "Madeira Clara", origin: ["presets"], action: "remover" }]
  },
  {
    canonicalId: "madeira_generica_escura",
    label: "Madeira Escura",
    type: "wood",
    industrial: false,
    visual: true,
    action: "remover",
    aliases: [{ name: "Madeira Escura", origin: ["presets"], action: "remover" }]
  }
];

const normalize = (value: string): string => value.trim().toLowerCase();

const OFFICIAL_INDEX = new Map<string, OfficialWoodMaterial>();
for (const material of OFFICIAL_WOOD_MATERIALS_SEED) {
  OFFICIAL_INDEX.set(normalize(material.canonicalId), material);
  OFFICIAL_INDEX.set(normalize(material.label), material);
  for (const alias of material.aliases) {
    OFFICIAL_INDEX.set(normalize(alias.name), material);
  }
}

export const OFFICIAL_WOOD_MATERIALS = OFFICIAL_WOOD_MATERIALS_SEED.filter(
  (m) => m.action !== "remover"
);

export function resolveMaterial(idOrAlias: string): OfficialWoodMaterial | null {
  if (!idOrAlias || typeof idOrAlias !== "string") return null;
  return OFFICIAL_INDEX.get(normalize(idOrAlias)) ?? null;
}

export function listOfficialMaterials(): OfficialWoodMaterial[] {
  return [...OFFICIAL_WOOD_MATERIALS];
}

export function listIndustrialWoodMaterials(): OfficialWoodMaterial[] {
  return OFFICIAL_WOOD_MATERIALS.filter((m) => m.industrial);
}

export function getDefaultOfficialMaterial(): OfficialWoodMaterial {
  return resolveMaterial("mdf_branco") ?? OFFICIAL_WOOD_MATERIALS[0];
}
