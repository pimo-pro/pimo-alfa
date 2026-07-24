import { describe, expect, it } from "vitest";
import { FERRAGENS_DEFAULT } from "../ferragens/ferragens";
import { COMPONENT_TYPES_DEFAULT } from "../components/componentTypes";
import type { CutListItemComPreco } from "../types";
import {
  priceFerragensFromCatalog,
  resolveFallbackPrecoA,
} from "./priceFerragensFromCatalog";

function piece(
  partial: Partial<CutListItemComPreco> & { id: string; tipo: string }
): CutListItemComPreco {
  return {
    id: partial.id,
    nome: partial.nome ?? partial.tipo,
    tipo: partial.tipo,
    material: "MDF",
    quantidade: partial.quantidade ?? 1,
    dimensoes: partial.dimensoes ?? { largura: 600, altura: 400, profundidade: 18 },
    espessura: 18,
    precoUnitario: 0,
    precoTotal: 0,
    ...partial,
  };
}

describe("priceFerragensFromCatalog (P3.9 F2)", () => {
  it("prices porta with catalog B (dobradica)", () => {
    const cutlist = [piece({ id: "p1", tipo: "porta_simples" })];
    const r = priceFerragensFromCatalog({
      cutlist,
      componentTypes: COMPONENT_TYPES_DEFAULT,
      catalog: FERRAGENS_DEFAULT,
    });
    expect(r.totalQty).toBeGreaterThan(0);
    expect(r.totalEur).toBeGreaterThan(0);
    expect(r.eurByPieceId.get("p1")).toBe(r.totalEur);
    expect(r.fallbacks.length).toBe(0);
  });

  it("STRICT: missing ferragemId does not throw; uses fallback A when mapped", () => {
    const catalogWithoutPrice = FERRAGENS_DEFAULT.map((f) =>
      f.id === "dobradica_35mm" ? { ...f, precoUnitario: undefined } : f
    );
    const cutlist = [piece({ id: "p1", tipo: "porta_simples" })];
    const r = priceFerragensFromCatalog({
      cutlist,
      componentTypes: COMPONENT_TYPES_DEFAULT,
      catalog: catalogWithoutPrice,
    });
    expect(r.warnings.some((w) => w.code === "PRECO_B_MISSING_FALLBACK_A")).toBe(true);
    expect(r.fallbacks.some((f) => f.ferragemId === "dobradica_35mm")).toBe(true);
    expect(r.fallbacks.find((f) => f.ferragemId === "dobradica_35mm")?.precoA).toBe(2.5);
    expect(r.totalEur).toBeGreaterThan(0);
  });

  it("STRICT: unknown component mapping warns and continues", () => {
    const cutlist = [piece({ id: "x1", tipo: "tipo_inexistente_xyz" })];
    const r = priceFerragensFromCatalog({
      cutlist,
      componentTypes: COMPONENT_TYPES_DEFAULT,
      catalog: FERRAGENS_DEFAULT,
    });
    expect(r.warnings.some((w) => w.code === "MAPPING_MISSING")).toBe(true);
    expect(r.totalEur).toBe(0);
  });

  it("resolveFallbackPrecoA covers core A table", () => {
    expect(resolveFallbackPrecoA("dobradica_35mm")).toBe(2.5);
    expect(resolveFallbackPrecoA("corredica_esq")).toBe(9.5);
    expect(resolveFallbackPrecoA("parafuso_4x50")).toBe(0.15);
    expect(resolveFallbackPrecoA("id_desconhecido_zzz")).toBeNull();
  });

  it("? piece euros equals totalEur", () => {
    const cutlist = [
      piece({ id: "a", tipo: "porta_simples" }),
      piece({ id: "b", tipo: "prateleira" }),
      piece({ id: "c", tipo: "cima" }),
    ];
    const r = priceFerragensFromCatalog({
      cutlist,
      componentTypes: COMPONENT_TYPES_DEFAULT,
      catalog: FERRAGENS_DEFAULT,
    });
    let sum = 0;
    for (const v of r.eurByPieceId.values()) sum += v;
    expect(Math.round(sum * 100) / 100).toBe(r.totalEur);
  });
});
