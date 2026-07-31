import { describe, expect, it } from "vitest";
import { classifyManualHole } from "./cutLayoutManualPdf";

describe("classifyManualHole", () => {
  it("classifica cavilha por tipo e por Ø10", () => {
    expect(classifyManualHole({ diameter: 10, depth: 13, holeType: "cavilha" })).toBe("cavilha");
    expect(classifyManualHole({ diameter: 10, depth: 13 })).toBe("cavilha");
  });

  it("classifica prateleira Ø5", () => {
    expect(classifyManualHole({ diameter: 5, depth: 8, holeType: "prateleira" })).toBe("prateleira");
    expect(classifyManualHole({ diameter: 5, depth: 10 })).toBe("prateleira");
  });

  it("classifica passante quando profundidade >= espessura", () => {
    expect(classifyManualHole({ diameter: 8, depth: 19 }, 19)).toBe("passante");
  });

  it("classifica fixação por tipo parafuso", () => {
    expect(classifyManualHole({ diameter: 7, depth: 12, holeType: "parafuso" })).toBe("fixacao");
  });
});
