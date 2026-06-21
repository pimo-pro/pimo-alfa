export type MoveisGeneratorId = "caixaFornoGenerator";

export type MoveisCatalogItem = {
  id: string;
  nome: string;
  icon: string;
  generator: MoveisGeneratorId;
  grupo: "moveis";
  dimensoesDefault: {
    largura_mm: number;
    altura_mm: number;
    profundidade_mm: number;
  };
};
