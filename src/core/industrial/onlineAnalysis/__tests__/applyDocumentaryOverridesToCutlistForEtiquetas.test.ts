import { describe, expect, it } from "vitest";
import type { CutListItemComPreco } from "@/core/types";
import {
  applyDocumentaryOverridesToCutlistForEtiquetas,
  applyMultiProjectDocumentaryOverridesForEtiquetas,
} from "../applyDocumentaryOverridesToCutlistForEtiquetas";
import type { IndustrialDocumentOverridesStore } from "../industrialDocumentOverridesTypes";

function item(partial: Partial<CutListItemComPreco> & { id: string }): CutListItemComPreco {
  return {
    id: partial.id,
    nome: partial.nome ?? partial.id,
    quantidade: partial.quantidade ?? 1,
    dimensoes: partial.dimensoes ?? { largura: 100, altura: 200, profundidade: 19 },
    espessura: partial.espessura ?? 19,
    material: partial.material ?? "MDF",
    tipo: partial.tipo ?? "lateral",
    boxId: partial.boxId ?? "box-1",
    precoUnitario: 0,
    precoTotal: 0,
    metadata: partial.metadata,
  };
}

describe("applyDocumentaryOverridesToCutlistForEtiquetas", () => {
  it("applies whitelist and ignores blocked keys / invalid qty / empty material", () => {
    const store: IndustrialDocumentOverridesStore = {
      cutlist: {
        deletedRowIds: [],
        addedRows: [],
        rowPatches: {
          a: {
            fields: {
              material: "Carvalho",
              qtd: "3",
              dimensoes: "999x999x9",
              boxId: "hack",
              observacoes: "Obs doc",
              peca: "LAT_ESQ",
              caixa: "Cozinha",
            },
            updatedAt: "t",
            updatedBy: { userId: "u", userName: "U" },
            source: "manual",
          },
          b: {
            fields: { material: "", qtd: "0" },
            updatedAt: "t",
            updatedBy: { userId: "u", userName: "U" },
            source: "manual",
          },
        },
      },
    };
    const base = [
      item({ id: "a", material: "MDF", quantidade: 1, tipo: "lateral" }),
      item({ id: "b", material: "HDF", quantidade: 2 }),
    ];
    const merged = applyDocumentaryOverridesToCutlistForEtiquetas(base, store);
    expect(merged).toHaveLength(2);
    expect(merged[0].material).toBe("Carvalho");
    expect(merged[0].quantidade).toBe(3);
    expect(merged[0].dimensoes.largura).toBe(100);
    expect(merged[0].boxId).toBe("box-1");
    expect(merged[0].metadata?.industrialLabel).toBe("LAT_ESQ");
    expect(merged[0].metadata?.documentaryBoxNome).toBe("Cozinha");
    expect(merged[0].metadata?.documentaryObservacoes).toEqual(["Obs doc"]);
    expect(merged[1].material).toBe("HDF");
    expect(merged[1].quantidade).toBe(2);
  });

  it("omits deleted rows and ignores addedRows; is idempotent", () => {
    const store: IndustrialDocumentOverridesStore = {
      cutlist: {
        deletedRowIds: ["gone"],
        addedRows: [
          {
            tempId: "added:1",
            fields: { material: "X" },
            createdAt: "t",
            createdBy: { userId: "u", userName: "U" },
          },
        ],
        rowPatches: {
          keep: {
            fields: { material: "NOVO" },
            updatedAt: "t",
            updatedBy: { userId: "u", userName: "U" },
            source: "manual",
          },
        },
      },
    };
    const base = [item({ id: "keep" }), item({ id: "gone" })];
    const once = applyDocumentaryOverridesToCutlistForEtiquetas(base, store);
    const twice = applyDocumentaryOverridesToCutlistForEtiquetas(once, store);
    expect(once.map((i) => i.id)).toEqual(["keep"]);
    expect(once[0].material).toBe("NOVO");
    expect(twice[0].material).toBe("NOVO");
    expect(twice).toHaveLength(1);
  });
});

describe("applyMultiProjectDocumentaryOverridesForEtiquetas", () => {
  it("matches longest prefix first (P10_ before P1_)", () => {
    const items = [
      item({ id: "P1_a", boxId: "P1_box", material: "A" }),
      item({ id: "P10_b", boxId: "P10_box", material: "B" }),
    ];
    const merged = applyMultiProjectDocumentaryOverridesForEtiquetas(items, [
      {
        prefix: "P1_",
        overrides: {
          cutlist: {
            deletedRowIds: [],
            addedRows: [],
            rowPatches: {
              a: {
                fields: { material: "FROM_P1" },
                updatedAt: "t",
                updatedBy: { userId: "u", userName: "U" },
                source: "manual",
              },
              "0_b": {
                fields: { material: "WRONG" },
                updatedAt: "t",
                updatedBy: { userId: "u", userName: "U" },
                source: "manual",
              },
            },
          },
        },
      },
      {
        prefix: "P10_",
        overrides: {
          cutlist: {
            deletedRowIds: [],
            addedRows: [],
            rowPatches: {
              b: {
                fields: { material: "FROM_P10" },
                updatedAt: "t",
                updatedBy: { userId: "u", userName: "U" },
                source: "manual",
              },
            },
          },
        },
      },
    ]);
    expect(merged.find((i) => i.id === "P1_a")?.material).toBe("FROM_P1");
    expect(merged.find((i) => i.id === "P10_b")?.material).toBe("FROM_P10");
  });
});

describe("P1 CNC base !== UEE merged", () => {
  it("documentary material changes only the UEE list", () => {
    const cncBase = [
      item({ id: "p1", material: "MDF Branco", quantidade: 1 }),
      item({ id: "p2", material: "HDF", quantidade: 2 }),
    ];
    const store: IndustrialDocumentOverridesStore = {
      cutlist: {
        deletedRowIds: ["p2"],
        addedRows: [],
        rowPatches: {
          p1: {
            fields: { material: "Carvalho 20", qtd: "5" },
            updatedAt: "t",
            updatedBy: { userId: "u", userName: "U" },
            source: "manual",
          },
        },
      },
    };

    // CNC path: never call apply
    const cncItems = cncBase.map((i) => ({ ...i, dimensoes: { ...i.dimensoes } }));
    const ueeItems = applyDocumentaryOverridesToCutlistForEtiquetas(cncBase, store);

    expect(cncItems).toHaveLength(2);
    expect(cncItems[0].material).toBe("MDF Branco");
    expect(cncItems[0].quantidade).toBe(1);
    expect(cncItems.map((i) => i.id)).toEqual(["p1", "p2"]);

    expect(ueeItems).toHaveLength(1);
    expect(ueeItems[0].id).toBe("p1");
    expect(ueeItems[0].material).toBe("Carvalho 20");
    expect(ueeItems[0].quantidade).toBe(5);
    expect(ueeItems[0].dimensoes).toEqual(cncItems[0].dimensoes);
  });
});
