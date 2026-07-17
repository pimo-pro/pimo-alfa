import { describe, it, expect } from "vitest";
import {
  countParafusosCosta3x30,
  distributeCorredicaPairsByLength,
  normalizeFerragensTotaisForPdf,
  snapCorredicaLengthMm,
} from "./pdfFerragensTotaisNormalize";
import type { BoxModule } from "../types";

describe("pdfFerragensTotaisNormalize", () => {
  it("snapCorredicaLengthMm usa grelha 300–550", () => {
    expect(snapCorredicaLengthMm(310)).toBe(300);
    expect(snapCorredicaLengthMm(340)).toBe(350);
    expect(snapCorredicaLengthMm(520)).toBe(500);
    expect(snapCorredicaLengthMm(540)).toBe(550);
  });

  it("countParafusosCosta3x30 usa ceil por lado a cada 180mm", () => {
    // 720×560 ? ceil(720/180)=4 + 4 + ceil(560/180)=4 + 4 = 16
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

  it("corrediças em pares e remove puxador/prego", () => {
    const rows = normalizeFerragensTotaisForPdf({
      ferragens: [
        { material: "Corrediça Lateral Esquerda", ref: "corredica_esq", medida: "", quantidade: 2 },
        { material: "Corrediça Lateral Direita", ref: "corredica_dir", medida: "", quantidade: 2 },
        { material: "Cavilha 8mm", ref: "cavilha_8mm", medida: "Ø8mm", quantidade: 40 },
        { material: "Dobradiça 35mm", ref: "dobradica_35mm", medida: "35mm", quantidade: 4 },
        { material: "Parafuso para Puxador", ref: "parafuso_puxador", medida: "M4", quantidade: 8 },
        { material: "Prego para Costa", ref: "prego_costa", medida: "2mm", quantidade: 12 },
        { material: "Suporte de Prateleira", ref: "suporte_prateleira", medida: "", quantidade: 8 },
        { material: "suportes_prateleira", ref: "—", medida: "—", quantidade: 4 },
        { material: "Parafuso 4×50", ref: "parafuso_4x50", medida: "4mm × 50mm", quantidade: 100 },
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
    expect(byName["Cavilha 10mm"]?.medida).toBe("10mm");
    expect(byName["Dobradiça"]?.ref).toBe("8654i");
    expect(byName["Dobradiça"]?.medida).toBe("35mm");
    expect(byName["Dobradiça"]?.quantidade).toBe(4);
    expect(byName["Suporte de Prateleira"]?.quantidade).toBe(12);
    expect(byName["Parafuso 3x30"]?.quantidade).toBe(16);
    expect(byName["Parafuso para Puxador"]).toBeUndefined();
    expect(byName["Prego para Costa"]).toBeUndefined();

    const corredicas = rows.filter((r) => r.material === "Corrediça");
    expect(corredicas.reduce((s, r) => s + r.quantidade, 0)).toBe(2); // floor(4/2)
    expect(corredicas.every((r) => r.ref === "")).toBe(true);
    expect(corredicas[0]?.medida).toBe("500mm");
  });

  it("distributeCorredicaPairsByLength proporção por gavetas", () => {
    const dist = distributeCorredicaPairsByLength(3, [
      { id: "a", gavetas: 2, dimensoes: { largura: 1, altura: 1, profundidade: 300 } } as BoxModule,
      { id: "b", gavetas: 1, dimensoes: { largura: 1, altura: 1, profundidade: 550 } } as BoxModule,
    ]);
    expect(dist.reduce((s, r) => s + r.qty, 0)).toBe(3);
    expect(dist.map((r) => r.lengthMm).sort()).toEqual([300, 550]);
  });
});
