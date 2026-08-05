/**
 * Tipos do catálogo SSOT de materiais (Excel PT-PT).
 * Fonte editável: public/config/materiais-ssot.xlsx
 * Não altera pipeline industrial (CNC / nesting / TCN / cutlist / PI).
 */

/** Nomes canónicos das folhas do Excel. */
export const MATERIAIS_SSOT_SHEET_CHAPAS = "Chapas";
export const MATERIAIS_SSOT_SHEET_FREEAGENS = "Freeagens";
export const MATERIAIS_SSOT_SHEET_ORLA = "Orla";

export const MATERIAIS_SSOT_CHAPAS_HEADERS = [
  "Nome atual",
  "Nome novo padronizado",
  "REF",
  "Espessura (mm)",
  "Medida da chapa",
  "Preço da chapa completa (€)",
  "Preço por m² (€)",
  "Preço de venda por m² (€)",
] as const;

export const MATERIAIS_SSOT_FREEAGENS_HEADERS = [
  "Nome",
  "REF",
  "Espessura / medida",
  "Preço por unidade (€)",
  "Preço por metro (€)",
] as const;

export const MATERIAIS_SSOT_ORLA_HEADERS = [
  "Nome",
  "REF",
  "Espessura (mm)",
  "Preço por metro (€)",
  "Preço por rolo (€)",
] as const;

/** Caminho público do ficheiro SSOT (Vite / deploy). */
export const MATERIAIS_SSOT_PUBLIC_PATH = "/config/materiais-ssot.xlsx";

export type MateriaisSsotChapaRow = {
  nomeAtual: string;
  nomeNovoPadronizado: string;
  ref: string;
  espessuraMm: number | null;
  medidaChapa: string;
  precoChapaCompletaEur: number | null;
  precoPorM2Eur: number | null;
  precoVendaPorM2Eur: number | null;
};

export type MateriaisSsotFreeagemRow = {
  nome: string;
  ref: string;
  espessuraOuMedida: string;
  precoPorUnidadeEur: number | null;
  precoPorMetroEur: number | null;
};

export type MateriaisSsotOrlaRow = {
  nome: string;
  ref: string;
  espessuraMm: number | null;
  precoPorMetroEur: number | null;
  precoPorRoloEur: number | null;
};

export type MateriaisSsotCatalog = {
  chapas: MateriaisSsotChapaRow[];
  freeagens: MateriaisSsotFreeagemRow[];
  orla: MateriaisSsotOrlaRow[];
  sourceLabel?: string;
};
