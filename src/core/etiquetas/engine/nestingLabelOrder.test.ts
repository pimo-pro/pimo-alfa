import { describe, expect, it } from "vitest";
import {
  assignUniqueEtiquetaNumbers,
  assertUniqueEtiquetaNumbers,
  nestingPlacementPrintOrder,
  orderLabelsByNestingPlacements,
  prepareEtiquetasForPrint,
} from "./nestingLabelOrder";

describe("nestingPlacementPrintOrder", () => {
  it("ordena painéis por sheetIndex sem misturar peças", () => {
    const placements = [
      { boxId: "b1", partName: "A", sheetIndex: 1, placementIndex: 0, x_mm: 0, y_mm: 0 },
      { boxId: "b1", partName: "B", sheetIndex: 0, placementIndex: 0, x_mm: 0, y_mm: 0 },
      { boxId: "b1", partName: "C", sheetIndex: 1, placementIndex: 1, x_mm: 0, y_mm: 0 },
    ];

    const ordered = nestingPlacementPrintOrder(placements);
    expect(ordered.map((p) => p.partName)).toEqual(["B", "A", "C"]);
  });

  it("preserva ordem do array do nesting dentro do mesmo painel (não reordena por x/y)", () => {
    const placements = [
      { boxId: "b1", partName: "Cima", sheetIndex: 0, placementIndex: 0, x_mm: 200, y_mm: 50, globalPlacementIndex: 0 },
      { boxId: "b1", partName: "Lateral", sheetIndex: 0, placementIndex: 1, x_mm: 100, y_mm: 400, globalPlacementIndex: 1 },
      { boxId: "b1", partName: "Lateral", sheetIndex: 0, placementIndex: 2, x_mm: 50, y_mm: 400, globalPlacementIndex: 2 },
    ];

    const ordered = nestingPlacementPrintOrder(placements);
    expect(ordered.map((p) => p.partName)).toEqual(["Cima", "Lateral", "Lateral"]);
  });
});

describe("orderLabelsByNestingPlacements", () => {
  it("emparelha peças idênticas pela ordem do nesting", () => {
    const items = [
      { id: "a", boxId: "b1", nome: "Lateral" },
      { id: "b", boxId: "b1", nome: "Lateral" },
      { id: "c", boxId: "b1", nome: "Cima" },
    ];
    const placements = [
      { boxId: "b1", partName: "Cima", sheetIndex: 0, placementIndex: 0, x_mm: 0, y_mm: 0 },
      { boxId: "b1", partName: "Lateral", sheetIndex: 0, placementIndex: 1, x_mm: 0, y_mm: 0 },
      { boxId: "b1", partName: "Lateral", sheetIndex: 0, placementIndex: 2, x_mm: 0, y_mm: 0 },
    ];

    const ordered = orderLabelsByNestingPlacements(items, placements);
    expect(ordered.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("painel 2 só depois de todas as peças do painel 1", () => {
    const items = [
      { id: "p1a", boxId: "b1", nome: "A" },
      { id: "p2a", boxId: "b1", nome: "A" },
    ];
    const placements = [
      { boxId: "b1", partName: "A", sheetIndex: 0, placementIndex: 0, x_mm: 0, y_mm: 0 },
      { boxId: "b1", partName: "A", sheetIndex: 1, placementIndex: 0, x_mm: 0, y_mm: 0 },
    ];

    const ordered = orderLabelsByNestingPlacements(items, placements);
    expect(ordered.map((i) => i.id)).toEqual(["p1a", "p2a"]);
  });
});

describe("assignUniqueEtiquetaNumbers", () => {
  it("atribui números 1..N únicos mesmo para peças idênticas", () => {
    const items = [
      { id: "p1", boxId: "b1", nome: "Lateral", pieceNumber: 5, metadata: { labelNumber: 5 } },
      { id: "p2", boxId: "b1", nome: "Lateral", pieceNumber: 5, metadata: { labelNumber: 5 } },
    ];
    assignUniqueEtiquetaNumbers(items);

    expect(items[0]!.pieceNumber).toBe(1);
    expect(items[1]!.pieceNumber).toBe(2);
    expect(items[0]!.metadata?.labelNumber).toBe(1);
    expect(items[1]!.metadata?.labelNumber).toBe(2);
  });
});

describe("assertUniqueEtiquetaNumbers", () => {
  it("rejeita números duplicados", () => {
    const items = [
      { pieceNumber: 1, metadata: { labelNumber: 1 } },
      { pieceNumber: 1, metadata: { labelNumber: 1 } },
    ];
    expect(() => assertUniqueEtiquetaNumbers(items)).toThrow(/duplicado/i);
  });
});

describe("prepareEtiquetasForPrint", () => {
  it("garante unicidade antes da ordenação e mantém após reordenar", () => {
    const items = [
      { id: "x", boxId: "b1", nome: "Lateral", pieceNumber: 3 },
      { id: "y", boxId: "b1", nome: "Lateral", pieceNumber: 3 },
    ];
    const placements = [
      { boxId: "b1", partName: "Lateral", sheetIndex: 0, placementIndex: 1, x_mm: 0, y_mm: 0 },
      { boxId: "b1", partName: "Lateral", sheetIndex: 0, placementIndex: 0, x_mm: 0, y_mm: 0 },
    ];

    const ordered = prepareEtiquetasForPrint(items, placements);

    expect(ordered.map((i) => i.id)).toEqual(["x", "y"]);
    expect(ordered.map((i) => i.pieceNumber)).toEqual([1, 2]);
    expect(new Set(ordered.map((i) => i.pieceNumber)).size).toBe(2);
  });
});
