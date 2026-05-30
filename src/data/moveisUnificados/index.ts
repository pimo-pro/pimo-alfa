import type { DesignTemplate } from "../../templates/types";
import { TEMPLATES } from "../../templates/templatesIndex";
import { CATALOG_ITEMS } from "../../catalog/catalogIndex";

export type ModeloTipo = "pronto" | "3d";

export type UnifiedModelItem = {
  id: string;
  sourceId: string;
  tipo: ModeloTipo;
  nome: string;
  categoria: string;
  categoriaId: string;
  grupoCatalogo?: "br" | "pt" | "pi";
  subcategoriaCatalogo?: string;
  descricao?: string;
  thumbnailUrl?: string | null;
  dimensoes?: { largura_mm: number; altura_mm: number; profundidade_mm: number };
};

const MOVEIS_CATEGORIES = [
  { id: "todos", label: "Todos" },
  { id: "cozinha", label: "Cozinha" },
  { id: "quarto", label: "Quarto" },
  { id: "sala", label: "Sala" },
  { id: "escritorio", label: "Escritório" },
  { id: "banheiro", label: "Banheiro" },
  { id: "roupeiro", label: "Roupeiro" },
  { id: "infantil", label: "Infantil" },
  { id: "outros", label: "Outros" },
] as const;

export const getCategoriasMoveis = () => MOVEIS_CATEGORIES.slice();

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const categoriaIdCache = new Map<string, string>();

const resolveCategoriaId = (categoria?: string | null): string => {
  const source = categoria ?? "";
  const cached = categoriaIdCache.get(source);
  if (cached) return cached;
  const cat = normalize(source);
  let resolved = "outros";
  if (!cat) return "outros";
  if (cat.includes("base") || cat.includes("upper") || cat.includes("cozinha")) resolved = "cozinha";
  else if (cat.includes("roupeiro") || cat.includes("guarda-roupa") || cat.includes("guarda roupa")) resolved = "roupeiro";
  else if (cat.includes("banheiro") || cat.includes("wc")) resolved = "banheiro";
  else if (cat.includes("infantil") || cat.includes("quarto infantil") || cat.includes("quarto-infantil")) resolved = "infantil";
  else if (cat.includes("quarto")) resolved = "quarto";
  else if (cat.includes("sala") || cat.includes("living")) resolved = "sala";
  else if (cat.includes("escritorio") || cat.includes("office")) resolved = "escritorio";
  categoriaIdCache.set(source, resolved);
  return resolved;
};

const getTemplateDimensions = (template: DesignTemplate) => {
  if (!template.boxes?.length) return null;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const box of template.boxes) {
    const x0 = box.posicaoX_mm;
    const y0 = box.posicaoY_mm ?? 0;
    const z0 = box.posicaoZ_mm ?? 0;
    const x1 = x0 + box.dimensoes.largura;
    const y1 = y0 + box.dimensoes.altura;
    const z1 = z0 + box.dimensoes.profundidade;

    if (x0 < minX) minX = x0;
    if (x1 > maxX) maxX = x1;
    if (y0 < minY) minY = y0;
    if (y1 > maxY) maxY = y1;
    if (z0 < minZ) minZ = z0;
    if (z1 > maxZ) maxZ = z1;
  }

  return {
    largura_mm: Math.max(0, Math.round(maxX - minX)),
    altura_mm: Math.max(0, Math.round(maxY - minY)),
    profundidade_mm: Math.max(0, Math.round(maxZ - minZ)),
  };
};

export const buildUnifiedMoveis = (): UnifiedModelItem[] => {
  const templates = TEMPLATES.map((template) => {
    const categoriaId = resolveCategoriaId(template.categoria);
    const dims = getTemplateDimensions(template);
    return {
      id: `pronto:${template.id}`,
      sourceId: template.id,
      tipo: "pronto" as const,
      nome: template.nome,
      categoria: template.categoria,
      categoriaId,
      descricao: template.descricao,
      thumbnailUrl: template.thumbnail ?? null,
      dimensoes: dims ?? undefined,
    };
  });

  const catalogo3d = CATALOG_ITEMS.map((item) => ({
    id: `3d:${item.id}`,
    sourceId: item.id,
    tipo: "3d" as const,
    nome: item.nome,
    categoria: item.categoria,
    categoriaId: resolveCategoriaId(item.categoria),
    grupoCatalogo: item.grupoCatalogo,
    subcategoriaCatalogo: item.subcategoriaCatalogo,
    descricao: item.descricao,
    thumbnailUrl: item.thumbnailUrl ?? null,
    dimensoes: {
      largura_mm: item.dimensoesDefault.largura_mm,
      altura_mm: item.dimensoesDefault.altura_mm,
      profundidade_mm: item.dimensoesDefault.profundidade_mm,
    },
  }));

  return [...templates, ...catalogo3d];
};
