import { describe, expect, it } from "vitest";
import { calcLateralDowelHoles } from "./lateralDowels";

describe("calcLateralDowelHoles — eixo X = profundidade (largura), eixo Y = altura", () => {
  const panelDepthMm = 560;
  const panelHeightMm = 720;

  it("720×560: x₂ = 500 (profundidade − 60), nunca 660 (altura − 60)", () => {
    const holes = calcLateralDowelHoles(panelDepthMm);
    const xValues = holes.map((h) => h.x);

    expect(xValues).toContain(60);
    expect(xValues).toContain(500);
    expect(xValues).not.toContain(660);
    expect(calcLateralDowelHoles(panelHeightMm).map((h) => h.x)).toContain(660);
  });

  it("y topo = altura, y base = 0 (mapeamento cutlist)", () => {
    const holes = calcLateralDowelHoles(panelDepthMm);
    const mapped = holes.map((h) => ({
      x: h.x,
      y: h.edge === "top" ? panelHeightMm : 0,
    }));

    expect(mapped.filter((h) => h.y === panelHeightMm)).toHaveLength(2);
    expect(mapped.filter((h) => h.y === 0)).toHaveLength(2);
    expect(mapped.every((h) => h.x <= panelDepthMm)).toBe(true);
  });
});
