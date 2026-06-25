import { describe, expect, it } from "vitest";
import {
  computeBoxProfundidadeAlvoFromBoxLike,
  computeProfundidadeInternaUtilMm,
  inferTemGavetaFrente,
} from "./boxDepthModel";

describe("boxDepthModel — paridade portas / gavetas", () => {
  it("porta: P500 − costa10 − porta19 = 471 mm", () => {
    const result = computeProfundidadeInternaUtilMm({
      profundidadeExternaMm: 500,
      costaAtiva: true,
      espessuraCostaMm: 10,
      temPorta: true,
      espessuraPortaMm: 19,
      temGavetaFrente: false,
      espessuraGavetaFrenteMm: 19,
    });
    expect(result).toBe(471);
  });

  it("gaveta (sem porta): P500 − costa10 − frente19 = 471 mm", () => {
    const result = computeBoxProfundidadeAlvoFromBoxLike(
      {
        dimensoes: { profundidade: 500 },
        espessura: 19,
        portaTipo: "sem_porta",
        doorsLayer: [],
        drawersLayer: [{ frontThickness: 19 }],
        gavetas: 3,
        costaAtiva: true,
      },
      10
    );
    expect(result.profundidadeInternaUtilMm).toBe(471);
    expect(result.descontoCostaMm).toBe(10);
    expect(result.descontoGavetaFrenteMm).toBe(19);
    expect(result.descontoPortaMm).toBe(0);
  });

  it("não desconta frente de gaveta quando há porta", () => {
    expect(
      inferTemGavetaFrente({
        portaTipo: "porta_simples",
        doorsLayer: [{}],
        drawersLayer: [{}],
        gavetas: 2,
      })
    ).toBe(false);
  });
});
