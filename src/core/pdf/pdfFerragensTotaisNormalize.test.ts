import { describe, it, expect } from "vitest";
import {
  countDobradicasForPdf,
  countParafusosCosta3x30,
  distributeCorredicaPairsByLength,
  normalizeFerragensTotaisForPdf,
  snapCorredicaLengthMm,
} from "./pdfFerragensTotaisNormalize";
import type { BoxModule, PanelDrillHole } from "../types";
import { defaultRulesConfig } from "../rules/rulesConfig";

const CORREDICA = "Corredi\u00e7a";
const DOBRADICA = "Dobradi\u00e7a";
const PE = "P\u00e9";
const PE_REF = "P\u00e9-Pl\u00e1stico";

function cups(n: number): PanelDrillHole[] {
  const holes: PanelDrillHole[] = [];
  for (let i = 0; i < n; i++) {
    holes.push({
      x: 20,
      y: 100 + i * 200,
      diameter: 35,
      depth: 13,
      holeType: "dobradica",
    });
    holes.push({
      x: 15,
      y: 90 + i * 200,
      diameter: 10,
      depth: 12,
      holeType: "dobradica_fixacao",
    });
    holes.push({
      x: 15,
      y: 110 + i * 200,
      diameter: 10,
      depth: 12,
      holeType: "dobradica_fixacao",
    });
  }
  return holes;
}

describe("pdfFerragensTotaisNormalize", () => {
  it("snapCorredicaLengthMm usa grelha 300-550", () => {
    expect(snapCorredicaLengthMm(310)).toBe(300);
    expect(snapCorredicaLengthMm(340)).toBe(350);
    expect(snapCorredicaLengthMm(520)).toBe(500);
    expect(snapCorredicaLengthMm(540)).toBe(550);
  });

  it("countParafusosCosta3x30 usa ceil por lado a cada 180mm", () => {
    expect(
      countParafusosCosta3x30([
        { tipo: "COSTA", dimensoes: { largura: 720, altura: 560 }, quantidade: 1 },
      ])
    ).toBe(16);
    expect(
      countParafusosCosta3x30([
        { tipo: "costa", dimensoes: { largura: 180, altura: 180 }, quantidade: 2 },
      ])
    ).toBe(8);
  });

  it("corredicas em pares; ignora dobradica industrial sem canecos", () => {
    const rows = normalizeFerragensTotaisForPdf({
      ferragens: [
        { material: "Corredica Lateral Esquerda", ref: "corredica_esq", medida: "", quantidade: 2 },
        { material: "Corredica Lateral Direita", ref: "corredica_dir", medida: "", quantidade: 2 },
        { material: "Cavilha 8mm", ref: "cavilha_8mm", medida: "8mm", quantidade: 40 },
        { material: "Dobradica 35mm", ref: "dobradica_35mm", medida: "35mm", quantidade: 99 },
        { material: "Parafuso para Puxador", ref: "parafuso_puxador", medida: "M4", quantidade: 8 },
        { material: "Prego para Costa", ref: "prego_costa", medida: "2mm", quantidade: 12 },
        { material: "Suporte de Prateleira", ref: "suporte_prateleira", medida: "", quantidade: 8 },
        { material: "suportes_prateleira", ref: "\u2014", medida: "\u2014", quantidade: 4 },
        { material: "Parafuso 4x50", ref: "parafuso_4x50", medida: "4mm x 50mm", quantidade: 100 },
      ],
      cutlistItems: [{ tipo: "COSTA", dimensoes: { largura: 720, altura: 560 }, quantidade: 1 }],
      boxes: [
        {
          id: "b1",
          gavetas: 2,
          dimensoes: { largura: 600, altura: 720, profundidade: 500 },
        } as BoxModule,
      ],
    });

    const byName = Object.fromEntries(rows.map((r) => [r.material, r]));
    expect(byName["Cavilha 10mm"]?.quantidade).toBe(40);
    expect(byName[DOBRADICA]).toBeUndefined();
    expect(byName["Suporte de Prateleira"]?.quantidade).toBe(12);
    expect(byName["Parafuso 3x30"]?.quantidade).toBe(16);
    expect(byName["Parafuso para Puxador"]).toBeUndefined();

    const corredicas = rows.filter((r) => r.material === CORREDICA);
    expect(corredicas.reduce((s, r) => s + r.quantidade, 0)).toBe(2);
  });

  it("dobradicas = canecos holeType dobradica (ignora industrial e fixacao)", () => {
    const rows = normalizeFerragensTotaisForPdf({
      ferragens: [
        { material: "Dobradica 35mm", ref: "dobradica_35mm", medida: "35mm", quantidade: 100 },
        { material: "dobradicas", ref: "—", medida: "—", quantidade: 50 },
      ],
      cutlistItems: [
        {
          tipo: "porta_simples",
          dimensoes: { largura: 598, altura: 918 },
          quantidade: 1,
          drillHoles: cups(3),
        },
        {
          tipo: "porta_simples",
          dimensoes: { largura: 598, altura: 758 },
          quantidade: 1,
          drillHoles: cups(2),
        },
      ],
      boxes: [],
      rules: defaultRulesConfig,
    });

    const d = rows.find((r) => r.material === DOBRADICA);
    expect(d).toMatchObject({ ref: "8654i", medida: "35mm", quantidade: 5 });
  });

  it("ANTUNIS: 2+2+2+3+4 canecos = 13 dobradicas", () => {
    const antunisDoors = [
      { altura: 758, n: 2 },
      { altura: 758, n: 2 },
      { altura: 758, n: 2 },
      { altura: 918, n: 3 },
      { altura: 2398, n: 4 },
    ];
    const cutlistItems = antunisDoors.map((d, i) => ({
      tipo: "porta_simples" as const,
      boxId: `b${i}`,
      dimensoes: { largura: 598, altura: d.altura },
      quantidade: 1,
      drillHoles: cups(d.n),
    }));

    expect(countDobradicasForPdf(cutlistItems, [], defaultRulesConfig)).toBe(13);

    const rows = normalizeFerragensTotaisForPdf({
      ferragens: [
        { material: "Dobradiça 35mm", ref: "dobradica_35mm", medida: "35mm", quantidade: 10 },
        { material: "dobradicas", ref: "", medida: "", quantidade: 10 },
      ],
      cutlistItems,
      boxes: [],
      rules: defaultRulesConfig,
    });

    expect(rows.find((r) => r.material === DOBRADICA)?.quantidade).toBe(13);
  });

  it("fallback getNumDobradicas quando porta sem drillHoles", () => {
    const n = countDobradicasForPdf(
      [
        {
          tipo: "porta_simples",
          dimensoes: { largura: 600, altura: 918 },
          quantidade: 1,
          drillHoles: [],
        },
      ],
      [],
      defaultRulesConfig
    );
    expect(n).toBe(3);
  });

  it("distributeCorredicaPairsByLength proporcao por gavetas", () => {
    const dist = distributeCorredicaPairsByLength(3, [
      { id: "a", gavetas: 2, dimensoes: { largura: 1, altura: 1, profundidade: 300 } } as BoxModule,
      { id: "b", gavetas: 1, dimensoes: { largura: 1, altura: 1, profundidade: 550 } } as BoxModule,
    ]);
    expect(dist.reduce((s, r) => s + r.qty, 0)).toBe(3);
    expect(dist.map((r) => r.lengthMm).sort()).toEqual([300, 550]);
  });

  it("inclui Pe (pe_plastico) a partir das caixas lower com pes", () => {
    const rows = normalizeFerragensTotaisForPdf({
      ferragens: [
        { material: "Dobradica 35mm", ref: "dobradica_35mm", medida: "35mm", quantidade: 2 },
      ],
      cutlistItems: [],
      boxes: [
        {
          id: "b1",
          nome: "Base 1",
          cabinetType: "lower",
          feetEnabled: true,
          feetHeight: 100,
          dimensoes: { largura: 600, altura: 720, profundidade: 560 },
        } as BoxModule,
        {
          id: "b2",
          nome: "Aereo",
          cabinetType: "upper",
          feetEnabled: false,
          dimensoes: { largura: 600, altura: 400, profundidade: 320 },
        } as BoxModule,
      ],
    });

    const pe = rows.find((r) => r.material === PE);
    expect(pe).toBeDefined();
    expect(pe?.ref).toBe(PE_REF);
    expect(pe?.medida).toBe("100mm");
    expect(pe?.quantidade).toBe(4);
    expect(pe?.preco).toBe(2.8);
    expect(rows.find((r) => r.material === DOBRADICA)).toBeUndefined();
  });
});
