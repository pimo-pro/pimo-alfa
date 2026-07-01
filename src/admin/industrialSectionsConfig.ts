import { safeGetItem, safeSetItem } from "../utils/storage";

export type IndustrialSectionId =
  | "resumoFinanceiro"
  | "pecasTotais"
  | "ferragensTotais"
  | "totaisProjeto"
  | "resumoIndustriais";

export type IndustrialSectionColumnConfig = {
  id: string;
  label: string;
  visible: boolean;
};

export type IndustrialSectionConfig = {
  id: IndustrialSectionId;
  label: string;
  enabled: boolean;
  showPrices: boolean;
  adminOnlyPrices: boolean;
  columns: IndustrialSectionColumnConfig[];
  calculations: {
    includeRemates: boolean;
    includeOrla: boolean;
    includePeso: boolean;
    includeChapas: boolean;
  };
};

const STORAGE_KEY = "pimo_industrial_sections_config_v1";

const DEFAULT_SECTIONS: IndustrialSectionConfig[] = [
  {
    id: "resumoFinanceiro",
    label: "Resumo Financeiro",
    enabled: true,
    showPrices: true,
    adminOnlyPrices: true,
    columns: [
      { id: "pecas", label: "Peças totais", visible: true },
      { id: "ferragens", label: "Ferragens totais", visible: true },
      { id: "area", label: "Área total", visible: true },
      { id: "peso", label: "Peso total", visible: true },
      { id: "chapas", label: "Nº de chapas", visible: true },
      { id: "precos", label: "Preços", visible: true },
    ],
    calculations: { includeRemates: false, includeOrla: true, includePeso: true, includeChapas: true },
  },
  {
    id: "pecasTotais",
    label: "Peças totais",
    enabled: true,
    showPrices: true,
    adminOnlyPrices: true,
    columns: [
      { id: "caixa", label: "Caixa", visible: true },
      { id: "tipo", label: "Tipo", visible: true },
      { id: "dimensoes", label: "Dimensões", visible: true },
      { id: "material", label: "Material", visible: true },
      { id: "peso", label: "Peso", visible: true },
      { id: "qtd", label: "Qtd", visible: true },
    ],
    calculations: { includeRemates: true, includeOrla: false, includePeso: true, includeChapas: false },
  },
  {
    id: "ferragensTotais",
    label: "Ferragens totais",
    enabled: true,
    showPrices: true,
    adminOnlyPrices: true,
    columns: [
      { id: "caixa", label: "Caixa", visible: true },
      { id: "ferragem", label: "Ferragem", visible: true },
      { id: "qtd", label: "Qtd", visible: true },
      { id: "tipo", label: "Tipo", visible: true },
    ],
    calculations: { includeRemates: false, includeOrla: false, includePeso: false, includeChapas: false },
  },
  {
    id: "totaisProjeto",
    label: "Totais do Projeto",
    enabled: true,
    showPrices: true,
    adminOnlyPrices: true,
    columns: [
      { id: "metrica", label: "Métrica", visible: true },
      { id: "valor", label: "Valor", visible: true },
    ],
    calculations: { includeRemates: true, includeOrla: true, includePeso: true, includeChapas: true },
  },
  {
    id: "resumoIndustriais",
    label: "Resumo Industriais",
    enabled: true,
    showPrices: false,
    adminOnlyPrices: false,
    columns: [
      { id: "caixa", label: "Caixa", visible: true },
      { id: "peca", label: "Peça", visible: true },
      { id: "dimensoes", label: "Dimensões", visible: true },
      { id: "observacoes", label: "Observações", visible: true },
    ],
    calculations: { includeRemates: true, includeOrla: false, includePeso: true, includeChapas: false },
  },
];

export function getDefaultIndustrialSectionsConfig(): IndustrialSectionConfig[] {
  return structuredClone(DEFAULT_SECTIONS);
}

export function loadIndustrialSectionsConfig(): IndustrialSectionConfig[] {
  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) return getDefaultIndustrialSectionsConfig();
  try {
    const parsed = JSON.parse(raw) as IndustrialSectionConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return getDefaultIndustrialSectionsConfig();
    return parsed;
  } catch {
    return getDefaultIndustrialSectionsConfig();
  }
}

export function saveIndustrialSectionsConfig(config: IndustrialSectionConfig[]): void {
  safeSetItem(STORAGE_KEY, JSON.stringify(config));
}

export function getIndustrialSectionConfig(
  sectionId: IndustrialSectionId,
  config?: IndustrialSectionConfig[]
): IndustrialSectionConfig {
  const list = config ?? loadIndustrialSectionsConfig();
  return list.find((s) => s.id === sectionId) ?? getDefaultIndustrialSectionsConfig().find((s) => s.id === sectionId)!;
}

export function isColumnVisible(
  sectionId: IndustrialSectionId,
  columnId: string,
  config?: IndustrialSectionConfig[]
): boolean {
  const section = getIndustrialSectionConfig(sectionId, config);
  return section.columns.find((c) => c.id === columnId)?.visible ?? true;
}

export function canShowSectionPrices(
  sectionId: IndustrialSectionId,
  isAdmin: boolean,
  config?: IndustrialSectionConfig[]
): boolean {
  const section = getIndustrialSectionConfig(sectionId, config);
  if (!section.showPrices) return false;
  if (section.adminOnlyPrices && !isAdmin) return false;
  return true;
}
