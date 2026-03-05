import type { CatalogItem } from "./catalogTypes";
import { BASE_CABINET_MODELS } from "../core/baseCabinets";

/**
 * Catálogo de módulos: Base Cabinets (sistema único e padronizado).
 * Cada item corresponde a um modelo base; regras de espessura, costa e pés são aplicadas pelo sistema.
 */

export const CATALOG_ITEMS: CatalogItem[] = BASE_CABINET_MODELS.map((m) => ({
  id: m.id,
  nome: m.nome,
  categoria: m.categoria,
  grupoCatalogo: m.grupoCatalogo ?? (/^[AB]\d+\b/i.test(m.nome) ? "br" : undefined),
  dimensoesDefault: {
    largura_mm: m.widthMm,
    altura_mm: m.heightMm,
    profundidade_mm: m.depthMm,
  },
  descricao: m.nome,
}));

const CATALOG_BY_ID = new Map(CATALOG_ITEMS.map((item) => [item.id, item]));
const CATALOG_CATEGORIES = Array.from(new Set(CATALOG_ITEMS.map((item) => item.categoria))).sort();

/**
 * Retorna todos os itens de uma categoria específica
 */
export function getCatalogItemsByCategory(categoria: string): CatalogItem[] {
  return CATALOG_ITEMS.filter((item) => item.categoria === categoria);
}

/**
 * Retorna um item do catálogo por ID
 */
export function getCatalogItemById(id: string): CatalogItem | undefined {
  return CATALOG_BY_ID.get(id);
}

/**
 * Retorna todas as categorias únicas do catálogo
 */
export function getCatalogCategories(): string[] {
  return CATALOG_CATEGORIES;
}

/**
 * Retorna o nome amigável de uma categoria
 */
export function getCategoryDisplayName(categoria: string): string {
  const parts = categoria.split("/");
  const categoryMap: Record<string, string> = {
    cozinha: "Cozinha",
    roupeiro: "Roupeiro",
    quarto: "Quarto",
    banheiro: "Banheiro",
    base: "Base",
    lower: "Inferior",
    upper: "Superior",
  };

  if (parts.length === 2) {
    const [parent, child] = parts;
    return `${categoryMap[parent] || parent} - ${categoryMap[child] || child}`;
  }
  return categoryMap[categoria] || categoria;
}
