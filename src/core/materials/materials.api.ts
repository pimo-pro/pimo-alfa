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
  industrialDefaults?: {
    espessuraPadrao: number;
    custo_m2: number;
    larguraChapa: number;
    alturaChapa: number;
    densidade: number;
  };
  viewerMaterialId?: string;
};

/** Chapa padrão industrial FASE 7J — todas as variantes 2800 × 2070 mm. */
export const INDUSTRIAL_SHEET_LF_MM = 2800;
export const INDUSTRIAL_SHEET_HF_MM = 2070;

/** Costa estrutural: sempre esta chapa (10 mm, MDF Branco). */
export const COSTA_INDUSTRIAL_CANONICAL_ID = "mdf_branco-10";

type IndustrialSheetSeed = {
  canonicalId: string;
  label: string;
  espessuraPadrao: number;
  viewerMaterialId: string;
  custo_m2: number;
  densidade: number;
  /** Aliases extra para migração (ids/nomes antigos). */
  legacyAliases?: string[];
};

/**
 * Lista única de chapas industriais (FASE 7K) — sem entradas só-visuais nem legacy fora desta lista.
 */
const INDUSTRIAL_SHEETS_SEED: IndustrialSheetSeed[] = [
  // MDF Branco
  {
    canonicalId: "mdf_branco-19",
    label: "MDF Branco 19",
    espessuraPadrao: 19,
    viewerMaterialId: "mdf_branco",
    custo_m2: 35,
    densidade: 750,
    legacyAliases: [
      "mdf_branco",
      "MDF Branco",
      "MDF",
      "Branco",
      "Branco Liso",
      "MDF Branco (legacy)",
    ],
  },
  {
    canonicalId: "mdf_branco-16",
    label: "MDF Branco 16",
    espessuraPadrao: 16,
    viewerMaterialId: "mdf_branco",
    custo_m2: 35,
    densidade: 750,
  },
  {
    canonicalId: "mdf_branco-10",
    label: "MDF Branco 10",
    espessuraPadrao: 10,
    viewerMaterialId: "mdf_branco",
    custo_m2: 35,
    densidade: 750,
  },
  // Laminado Linho Cancun
  {
    canonicalId: "laminado_linho_cancun-19",
    label: "Laminado Linho Cancun 19",
    espessuraPadrao: 19,
    viewerMaterialId: "laminado_linho_cancun",
    custo_m2: 38,
    densidade: 750,
    legacyAliases: ["laminado_linho_cancun", "Laminado Linho Cancun", "Cinza Industrial"],
  },
  {
    canonicalId: "laminado_linho_cancun-16",
    label: "Laminado Linho Cancun 16",
    espessuraPadrao: 16,
    viewerMaterialId: "laminado_linho_cancun",
    custo_m2: 38,
    densidade: 750,
  },
  {
    canonicalId: "laminado_linho_cancun-10",
    label: "Laminado Linho Cancun 10",
    espessuraPadrao: 10,
    viewerMaterialId: "laminado_linho_cancun",
    custo_m2: 38,
    densidade: 750,
  },
  // MDF Preto
  {
    canonicalId: "mdf_preto-19",
    label: "MDF Preto 19",
    espessuraPadrao: 19,
    viewerMaterialId: "mdf_preto",
    custo_m2: 40,
    densidade: 750,
    legacyAliases: ["mdf_preto", "MDF Preto", "Preto Fosco"],
  },
  {
    canonicalId: "mdf_preto-10",
    label: "MDF Preto 10",
    espessuraPadrao: 10,
    viewerMaterialId: "mdf_preto",
    custo_m2: 40,
    densidade: 750,
  },
  // Carvalho
  {
    canonicalId: "carvalho-20",
    label: "Carvalho 20",
    espessuraPadrao: 20,
    viewerMaterialId: "carvalho_natural",
    custo_m2: 48,
    densidade: 720,
    legacyAliases: [
      "carvalho",
      "Carvalho",
      "Carvalho Natural",
      "Carvalho Escuro",
      "Madeira - Carvalho",
      "carvalho_natural",
      "carvalho_escuro",
    ],
  },
  {
    canonicalId: "carvalho-17",
    label: "Carvalho 17",
    espessuraPadrao: 17,
    viewerMaterialId: "carvalho_natural",
    custo_m2: 52,
    densidade: 720,
  },
  {
    canonicalId: "carvalho-10",
    label: "Carvalho 10",
    espessuraPadrao: 10,
    viewerMaterialId: "carvalho_natural",
    custo_m2: 55,
    densidade: 720,
  },
  // Nogueira
  {
    canonicalId: "nogueira-20",
    label: "Nogueira 20",
    espessuraPadrao: 20,
    viewerMaterialId: "nogueira",
    custo_m2: 58,
    densidade: 700,
    legacyAliases: ["nogueira", "Nogueira", "Madeira - Nogueira"],
  },
  {
    canonicalId: "nogueira-10",
    label: "Nogueira 10",
    espessuraPadrao: 10,
    viewerMaterialId: "nogueira",
    custo_m2: 62,
    densidade: 700,
  },
  // Lacado
  {
    canonicalId: "lacado-20",
    label: "Lacado 20",
    espessuraPadrao: 20,
    viewerMaterialId: "mdf_branco",
    custo_m2: 90,
    densidade: 750,
    legacyAliases: ["lacado", "Lacado"],
  },
  {
    canonicalId: "lacado-17",
    label: "Lacado 17",
    espessuraPadrao: 17,
    viewerMaterialId: "mdf_branco",
    custo_m2: 92,
    densidade: 750,
  },
  {
    canonicalId: "lacado-10",
    label: "Lacado 10",
    espessuraPadrao: 10,
    viewerMaterialId: "mdf_branco",
    custo_m2: 95,
    densidade: 750,
  },
];

function industrialSheetToOfficial(row: IndustrialSheetSeed): OfficialWoodMaterial {
  const aliases: MaterialAlias[] = [
    { name: row.label, origin: ["industrial", "ui"], action: "manter" },
    { name: row.canonicalId, origin: ["id"], action: "manter" },
    ...(row.legacyAliases ?? []).map((name) => ({ name, origin: ["legacy", "migration"], action: "mesclar" as const })),
  ];
  return {
    canonicalId: row.canonicalId,
    label: row.label,
    type: "wood",
    industrial: true,
    visual: true,
    action: "manter",
    viewerMaterialId: row.viewerMaterialId,
    industrialDefaults: {
      espessuraPadrao: row.espessuraPadrao,
      custo_m2: row.custo_m2,
      larguraChapa: INDUSTRIAL_SHEET_LF_MM,
      alturaChapa: INDUSTRIAL_SHEET_HF_MM,
      densidade: row.densidade,
    },
    aliases,
  };
}

/** Chapas industriais ativas (única fonte para listIndustrialWoodMaterials). */
export const INDUSTRIAL_WOOD_MATERIALS: OfficialWoodMaterial[] = INDUSTRIAL_SHEETS_SEED.map(industrialSheetToOfficial);

/** Catálogo oficial = apenas chapas industriais (FASE 7K). */
export const OFFICIAL_WOOD_MATERIALS_SEED: OfficialWoodMaterial[] = [...INDUSTRIAL_WOOD_MATERIALS];

const normalize = (value: string): string => value.trim().toLowerCase();

const OFFICIAL_INDEX = new Map<string, OfficialWoodMaterial>();
for (const material of OFFICIAL_WOOD_MATERIALS_SEED) {
  OFFICIAL_INDEX.set(normalize(material.canonicalId), material);
  OFFICIAL_INDEX.set(normalize(material.label), material);
  for (const alias of material.aliases) {
    OFFICIAL_INDEX.set(normalize(alias.name), material);
  }
}

export const OFFICIAL_WOOD_MATERIALS = OFFICIAL_WOOD_MATERIALS_SEED.filter((m) => m.action !== "remover");

export function resolveMaterial(idOrAlias: string): OfficialWoodMaterial | null {
  if (!idOrAlias || typeof idOrAlias !== "string") return null;
  return OFFICIAL_INDEX.get(normalize(idOrAlias)) ?? null;
}

export function listOfficialMaterials(): OfficialWoodMaterial[] {
  return [...OFFICIAL_WOOD_MATERIALS];
}

export function listIndustrialWoodMaterials(): OfficialWoodMaterial[] {
  return [...INDUSTRIAL_WOOD_MATERIALS];
}

export function getDefaultOfficialMaterial(): OfficialWoodMaterial {
  return resolveMaterial("mdf_branco-19") ?? INDUSTRIAL_WOOD_MATERIALS[0]!;
}
