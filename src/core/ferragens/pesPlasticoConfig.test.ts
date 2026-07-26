import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  aggregatePesPlasticoFromBoxes,
  aggregateParafuso3x30FromBoxes,
  quantidadePesParaCaixa,
  quantidadeParafusos3x30ParaCaixa,
  PES_PLASTICO_CONFIG_DEFAULT,
  PE_PLASTICO_NOME,
  PARAFUSO_3X30_ID,
  PARAFUSO_3X30_NOME,
  PARAFUSO_3X30_PRECO,
  type PesPlasticoConfig,
} from "./pesPlasticoConfig";
import type { BoxModule } from "../types";
import { defaultRulesConfig } from "../rules/rulesConfig";

const cfg: PesPlasticoConfig = { ...PES_PLASTICO_CONFIG_DEFAULT };
const PE_REF = "P\u00e9-Pl\u00e1stico";

function box(partial: Partial<BoxModule>): BoxModule {
  return {
    id: partial.id ?? "b1",
    nome: partial.nome ?? "Caixa",
    cabinetType: partial.cabinetType ?? "lower",
    feetEnabled: partial.feetEnabled,
    feetHeight: partial.feetHeight,
    dimensoes: partial.dimensoes ?? { largura: 600, altura: 720, profundidade: 560 },
    ...partial,
  } as BoxModule;
}

describe("pesPlasticoConfig", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
  });

  it("quantidadePesParaCaixa: lower com pes = 4 (fallback / faixa 60cm)", () => {
    expect(quantidadePesParaCaixa(box({}), defaultRulesConfig)).toBe(4);
  });

  it("quantidadePesParaCaixa: upper ou desativado = 0", () => {
    expect(quantidadePesParaCaixa(box({ cabinetType: "upper" }), defaultRulesConfig)).toBe(0);
    expect(
      quantidadePesParaCaixa(box({ feetEnabled: false }), defaultRulesConfig)
    ).toBe(0);
  });

  it("quantidadeParafusos3x30ParaCaixa = pés × 4", () => {
    expect(quantidadeParafusos3x30ParaCaixa(box({}), defaultRulesConfig)).toBe(16);
    expect(
      quantidadeParafusos3x30ParaCaixa(box({ cabinetType: "upper" }), defaultRulesConfig)
    ).toBe(0);
  });

  it("aggregate: 2 caixas x 4 = 8 a preco config / 100mm", () => {
    const rows = aggregatePesPlasticoFromBoxes(
      [
        box({ id: "a", feetHeight: 100 }),
        box({ id: "b", feetHeight: 100 }),
      ],
      defaultRulesConfig,
      cfg
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      material: PE_PLASTICO_NOME,
      ref: PE_REF,
      medida: "100mm",
      quantidade: 8,
      precoUnitario: cfg.precoUnitario,
    });
    expect(rows[0]!.quantidade * rows[0]!.precoUnitario).toBeCloseTo(8 * cfg.precoUnitario);
  });

  it("aggregate parafuso 3x30: 2 caixas x 4 pés x 4 = 32", () => {
    const rows = aggregateParafuso3x30FromBoxes(
      [box({ id: "a" }), box({ id: "b" })],
      defaultRulesConfig,
      cfg
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      material: PARAFUSO_3X30_NOME,
      ref: PARAFUSO_3X30_ID,
      medida: "3\u00d730mm",
      quantidade: 32,
      precoUnitario: PARAFUSO_3X30_PRECO,
    });
    expect(rows[0]!.quantidade * rows[0]!.precoUnitario).toBeCloseTo(3.2);
  });

  it("aggregate: desativado = vazio", () => {
    const rows = aggregatePesPlasticoFromBoxes(
      [box({})],
      defaultRulesConfig,
      { ...cfg, ativo: false }
    );
    expect(rows).toHaveLength(0);
    expect(
      aggregateParafuso3x30FromBoxes([box({})], defaultRulesConfig, { ...cfg, ativo: false })
    ).toHaveLength(0);
  });
});
