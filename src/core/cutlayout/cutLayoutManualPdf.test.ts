import { describe, expect, it } from "vitest";
import { classifyManualHole, computeRailCotaSystems } from "./cutLayoutManualPdf";

describe("classifyManualHole", () => {
  it("classifica cavilha por tipo e por diametro 10", () => {
    expect(classifyManualHole({ diameter: 10, depth: 13, holeType: "cavilha" })).toBe("cavilha");
    expect(classifyManualHole({ diameter: 10, depth: 13 })).toBe("cavilha");
  });

  it("classifica prateleira diametro 5", () => {
    expect(classifyManualHole({ diameter: 5, depth: 8, holeType: "prateleira" })).toBe("prateleira");
    expect(classifyManualHole({ diameter: 5, depth: 10 })).toBe("prateleira");
  });

  it("classifica passante quando profundidade >= espessura", () => {
    expect(classifyManualHole({ diameter: 8, depth: 19 }, 19)).toBe("passante");
  });

  it("classifica fixacao por tipo parafuso", () => {
    expect(classifyManualHole({ diameter: 7, depth: 12, holeType: "parafuso" })).toBe("fixacao");
  });

  it("classifica trilho/corredica como sistema", () => {
    expect(classifyManualHole({ diameter: 2.5, depth: 1, holeType: "corredica" })).toBe("trilho");
  });
});

describe("computeRailCotaSystems", () => {
  it("calcula first / spacing / last sem repetir por furo (ex.: 38 / 204 / 41)", () => {
    const holes = [
      { sx: 38, sy: 41, kind: "trilho" as const },
      { sx: 242, sy: 41, kind: "trilho" as const },
      { sx: 446, sy: 41.2, kind: "trilho" as const },
    ];
    // peca D = 446 + 41 = 487
    const pieceW = 487;
    const systems = computeRailCotaSystems(holes, pieceW);
    expect(systems).toHaveLength(1);
    expect(Math.round(systems[0].firstOffset)).toBe(38);
    expect(Math.round(systems[0].lastOffset)).toBe(41);
    expect(systems[0].spacingUnique).toBe(204);
    expect(systems[0].count).toBe(3);
  });

  it("separa trilhos superior e inferior", () => {
    const holes = [
      { sx: 38, sy: 37, kind: "trilho" as const },
      { sx: 242, sy: 37, kind: "trilho" as const },
      { sx: 38, sy: 200, kind: "trilho" as const },
      { sx: 242, sy: 200, kind: "trilho" as const },
    ];
    const systems = computeRailCotaSystems(holes, 280);
    expect(systems).toHaveLength(2);
    expect(systems.every((s) => s.count === 2)).toBe(true);
  });
});
