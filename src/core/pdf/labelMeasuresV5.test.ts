import { describe, it, expect } from "vitest";
import { formatNumberV5, formatDimensionV5 } from "./labelMeasuresV5";

describe("formatNumberV5", () => {
  it("formata inteiros e decimais conforme spec HTML", () => {
    expect(formatNumberV5(10)).toBe("10");
    expect(formatNumberV5(10.0)).toBe("10");
    expect(formatNumberV5(10.5)).toBe("10,5");
    expect(formatNumberV5(10.5)).toBe("10,5");
    expect(formatNumberV5(2809.9999)).toBe("2809,9999");
    expect(formatNumberV5(109.6738)).toBe("109,6738");
    expect(formatNumberV5(19.18)).toBe("19,18");
  });

  it("fallback para valor não finito", () => {
    expect(formatNumberV5(Number.NaN)).toBe("0");
  });
});

describe("formatDimensionV5", () => {
  it("sem espessura quando thickness <= 0", () => {
    expect(formatDimensionV5(10, 10, 0)).toBe("10×10 MM");
  });

  it("com espessura", () => {
    expect(formatDimensionV5(10.5, 10, 20)).toBe("10,5×10×20 MM");
    expect(formatDimensionV5(2809.9999, 2009.999, 19.18)).toBe(
      "2809,9999×2009,999×19,18 MM"
    );
  });
});
