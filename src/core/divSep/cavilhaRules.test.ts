import { describe, expect, it } from "vitest";
import {
  calcularPosicaoCavilha,
  calcularPosicoesCavilha,
  getParafusoDistanceFromCavilhaMm,
} from "./cavilhaRules";
import { DIV_SEP_TEST_RULES } from "./divSepTestHelpers";

describe("calcularPosicaoCavilha — todas as faixas de comprimento", () => {
  const rules = DIV_SEP_TEST_RULES;

  it.each([
    { comprimento: 60, expected: 15, faixa: "60–99 mm (limite inferior)" },
    { comprimento: 80, expected: 15, faixa: "60–99 mm (centro)" },
    { comprimento: 99, expected: 15, faixa: "60–99 mm (limite superior)" },
    { comprimento: 100, expected: 30, faixa: "100–150 mm (limite inferior)" },
    { comprimento: 125, expected: 30, faixa: "100–150 mm (centro)" },
    { comprimento: 150, expected: 30, faixa: "100–150 mm (limite superior)" },
    { comprimento: 151, expected: 40, faixa: "151–199 mm (limite inferior)" },
    { comprimento: 175, expected: 40, faixa: "151–199 mm (centro)" },
    { comprimento: 199, expected: 40, faixa: "151–199 mm (limite superior)" },
    { comprimento: 200, expected: 60, faixa: "200–1200 mm (limite inferior)" },
    { comprimento: 600, expected: 60, faixa: "200–1200 mm (centro)" },
    { comprimento: 1200, expected: 60, faixa: "200–1200 mm (limite superior)" },
  ])("$faixa → $expected mm da borda", ({ comprimento, expected }) => {
    expect(calcularPosicaoCavilha(comprimento, rules)).toBe(expected);
  });

  it("gera posições simétricas [offset, comprimento − offset] fora do intervalo colapsado", () => {
    expect(calcularPosicoesCavilha(600, rules)).toEqual([60, 540]);
    expect(calcularPosicoesCavilha(100, rules)).toEqual([30, 70]);
    expect(calcularPosicoesCavilha(80, rules)).toEqual([15, 65]);
  });

  it("colapsa para o centro quando comprimento ≤ 2×offset", () => {
    expect(calcularPosicoesCavilha(30, rules)).toEqual([15]);
  });
});

describe("calcularPosicaoCavilha — parâmetros globais", () => {
  it("distância parafuso ↔ cavilha = 30 mm (default admin)", () => {
    expect(getParafusoDistanceFromCavilhaMm(DIV_SEP_TEST_RULES)).toBe(30);
  });
});
