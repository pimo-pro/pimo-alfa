import { describe, it, expect } from "vitest";
import {
  aggregateCalcoRowsForPdf,
  CALCO_CONFIG_DEFAULT,
  CALCO_MATERIAL,
  CALCO_MEDIDA,
  CALCO_REF_00,
  CALCO_REF_03,
  countCalco03FromBoxes,
  countPortasFrenteFixa,
} from "./calcoConfig";
import { CORNER_DIREITA_INFERIOR_V2_ID } from "../cornerCabinet/cornerCabinetRules";
import type { BoxModule } from "../types";

describe("calcoConfig", () => {
  it("Ref 00: 1 calco por dobradica I-Sensys", () => {
    const rows = aggregateCalcoRowsForPdf(40, [], CALCO_CONFIG_DEFAULT);
    expect(rows).toEqual([
      {
        material: CALCO_MATERIAL,
        ref: CALCO_REF_00,
        medida: CALCO_MEDIDA,
        quantidade: 40,
        precoUnitario: 0,
      },
    ]);
  });

  it("Ref 03: 1 calco por porta em modulo Frente Fixa", () => {
    const boxes = [
      {
        id: "ff1",
        baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
        portaTipo: "porta_simples",
        doorsLayer: [{ id: "d1" }, { id: "d2" }],
      },
    ] as unknown as BoxModule[];
    expect(countPortasFrenteFixa(boxes[0]!)).toBe(2);
    expect(countCalco03FromBoxes(boxes)).toBe(2);
    const rows = aggregateCalcoRowsForPdf(0, boxes, CALCO_CONFIG_DEFAULT);
    expect(rows).toEqual([
      {
        material: CALCO_MATERIAL,
        ref: CALCO_REF_03,
        medida: CALCO_MEDIDA,
        quantidade: 2,
        precoUnitario: 0,
      },
    ]);
  });

  it("modulos sem Frente Fixa nao geram Ref 03", () => {
    const boxes = [
      {
        id: "b1",
        portaTipo: "porta_dupla",
        doorsLayer: [{ id: "d1" }, { id: "d2" }],
      },
    ] as unknown as BoxModule[];
    expect(countCalco03FromBoxes(boxes)).toBe(0);
  });

  it("preco 0 por defeito; refs desactivaveis", () => {
    const rows = aggregateCalcoRowsForPdf(5, [], {
      refs: {
        "00": { ativo: false, precoUnitario: 0 },
        "03": { ativo: true, precoUnitario: 0 },
      },
    });
    expect(rows).toEqual([]);
  });
});
