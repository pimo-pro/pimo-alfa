import type { CatalogItem } from "./catalogTypes";
import type { BaseCabinetModel } from "../core/baseCabinets/types";
import { getBaseCabinetModelsMerged } from "../core/baseCabinets";

/**
 * Catálogo de módulos: Base Cabinets (sistema único e padronizado).
 * Cada item corresponde a um modelo base; regras de espessura, costa e pés são aplicadas pelo sistema.
 * Inclui modelos industriais built-in e personalizados (runtime merge).
 *
 * IMPORTANTE: merge industrial é lazy — não executar bootstrap TXML/TCN no import do módulo
 * (bloqueia main thread e impede hidratação da SPA).
 */

function mapModelToCatalogItem(m: BaseCabinetModel): CatalogItem {
  return {
    id: m.id,
    nome: m.nome,
    categoria: m.categoria,
    grupoCatalogo: m.grupoCatalogo ?? (/^[AB]\d+\b/i.test(m.nome) ? "br" : undefined),
    subcategoriaCatalogo: m.subcategoriaCatalogo,
    dimensoesDefault: {
      largura_mm: m.widthMm,
      altura_mm: m.heightMm,
      profundidade_mm: m.depthMm,
    },
    descricao:
      m.subcategoriaCatalogo === "caixas-de-canto"
        ? "Canto com frente fixa e porta única — esquerda/direita ou rotação 180°"
        : m.nome,
  };
}

let catalogCache: CatalogItem[] | null = null;
let catalogByIdCache: Map<string, CatalogItem> | null = null;

function rebuildCatalogCache(): CatalogItem[] {
  catalogCache = getBaseCabinetModelsMerged().map(mapModelToCatalogItem);
  catalogByIdCache = new Map(catalogCache.map((item) => [item.id, item]));
  return catalogCache;
}

/** Catálogo completo (estático + industrial). Listagem instantânea; bootstrap industrial só ao usar o modelo. */
export function getCatalogItems(): CatalogItem[] {
  if (!catalogCache) return rebuildCatalogCache();
  return catalogCache;
}

/** Apenas testes — invalida cache após alterações ao registo industrial. */
export function __resetCatalogIndexCacheForTests(): void {
  catalogCache = null;
  catalogByIdCache = null;
}

/**
 * @deprecated Preferir getCatalogItems(). Mantido para compatibilidade; não avalia merge no import.
 */
export function getCatalogItemsSnapshot(): CatalogItem[] {
  return getCatalogItems();
}

/**
 * Retorna todos os itens de uma categoria específica
 */
export function getCatalogItemsByCategory(categoria: string): CatalogItem[] {
  return getCatalogItems().filter((item) => item.categoria === categoria);
}

/**
 * Retorna um item do catálogo por ID
 */
export function getCatalogItemById(id: string): CatalogItem | undefined {
  if (!catalogByIdCache) getCatalogItems();
  return catalogByIdCache?.get(id);
}

/**
 * Retorna todas as categorias únicas do catálogo
 */
export function getCatalogCategories(): string[] {
  return Array.from(new Set(getCatalogItems().map((item) => item.categoria))).sort();
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
