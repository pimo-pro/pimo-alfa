import { CAIXA_FORNO_GENERATOR, CAIXA_FORNO_ID } from "./generators/caixaFornoGenerator";
import type { MoveisCatalogItem } from "./types";

export * from "./types";
export * from "./generators/caixaFornoGenerator";

export const MOVEIS_CATALOG: MoveisCatalogItem[] = [
  {
    id: CAIXA_FORNO_ID,
    nome: "Caixa Forno",
    icon: "oven",
    generator: CAIXA_FORNO_GENERATOR,
    grupo: "moveis",
    dimensoesDefault: {
      largura_mm: 600,
      altura_mm: 2550,
      profundidade_mm: 600,
    },
  },
];

export function getMoveisCatalogItem(id: string): MoveisCatalogItem | undefined {
  return MOVEIS_CATALOG.find((item) => item.id === id);
}

export function getMoveisByGrupo(grupo: string): MoveisCatalogItem[] {
  return MOVEIS_CATALOG.filter((item) => item.grupo === grupo);
}
