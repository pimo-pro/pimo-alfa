import { describe, expect, it } from "vitest";
import {
  calcBodyDepthWithoutFrontMm,
  calcDrawerExternalWidthMm,
  selectHettichRunnerDepth,
} from "./index";

describe("selectHettichRunnerDepth", () => {
  it("escolhe o maior comprimento STRICTLY menor que a profundidade útil", () => {
    expect(selectHettichRunnerDepth(500)).toBe(450);
    expect(selectHettichRunnerDepth(380)).toBe(350);
    expect(selectHettichRunnerDepth(301)).toBe(300);
    expect(selectHettichRunnerDepth(600)).toBe(550);
  });

  it("não devolve comprimento igual à profundidade útil", () => {
    expect(selectHettichRunnerDepth(450)).toBe(400);
    expect(selectHettichRunnerDepth(300)).toBe(300); // fallback mínimo se nada < 300
  });
});

describe("medidas industriais Modelo B", () => {
  it("largura externa = interna ? 14 mm", () => {
    const box = {
      id: "b1",
      dimensoes: { largura: 538, altura: 720, profundidade: 560 },
      espessura: 19,
    };
    // interna = 538 - 38 = 500; externa = 486
    expect(calcDrawerExternalWidthMm(box)).toBe(486);
  });

  it("corpo sem frente = corrediça ? 10", () => {
    expect(calcBodyDepthWithoutFrontMm(450)).toBe(440);
  });
});
