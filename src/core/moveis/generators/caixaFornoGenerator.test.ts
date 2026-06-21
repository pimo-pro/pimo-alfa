import { describe, expect, it } from "vitest";
import {
  buildCutlistForCaixaForno,
  computeCaixaFornoLayout,
  createCaixaForno,
  getCaixaFornoSepBottomsMm,
  gerarPaineisCaixaForno,
  syncCaixaFornoOnDimensoesChange,
} from "./caixaFornoGenerator";
import { defaultRulesConfig } from "../../rules/rulesConfig";
import { convertWorkspaceToBox } from "../../../context/projectState";
import type { WorkspaceBox } from "../../types";

describe("caixaFornoGenerator", () => {
  it("mantém seps fixos e ajusta só o compartimento superior", () => {
    const seps = getCaixaFornoSepBottomsMm(19);
    expect(seps.sep1BottomMm).toBe(900);
    expect(seps.sep2BottomMm).toBe(1519);
    expect(seps.sep3BottomMm).toBe(1938);

    const layout2550 = computeCaixaFornoLayout({
      dimensoes: { largura: 600, altura: 2550, profundidade: 600 },
      espessura: 19,
      profundidadeExterna: 600,
      portaTipo: "porta_simples",
      doorsLayer: [],
      costaAtiva: true,
    });
    expect(layout2550.portaInferiorAlturaMm).toBe(800);
    expect(layout2550.portaSuperiorAlturaMm).toBe(612);
    expect(layout2550.costaSuperiorAlturaMm).toBe(612);

    const layout2700 = computeCaixaFornoLayout({
      dimensoes: { largura: 600, altura: 2700, profundidade: 600 },
      espessura: 19,
      profundidadeExterna: 600,
      portaTipo: "porta_simples",
      doorsLayer: [],
      costaAtiva: true,
    });
    expect(layout2700.portaInferiorAlturaMm).toBe(800);
    expect(layout2700.portaSuperiorAlturaMm).toBe(762);
  });

  it("createCaixaForno — sem fundo, sem pés, 3 seps e 2 portas", () => {
    const cfg = createCaixaForno();
    expect(cfg.tipoFundo).toBe("sem_fundo");
    expect(cfg.feetEnabled).toBe(false);
    expect(cfg.separadores).toHaveLength(3);
    expect(cfg.doorsLayer).toHaveLength(2);
    expect(cfg.dimensoes.altura).toBe(2550);
  });

  it("gerarPaineisCaixaForno — inclui laterais, cima, seps, portas e costa superior", () => {
    const cfg = createCaixaForno({ id: "forno-test" });
    const box = convertWorkspaceToBox({
      ...cfg,
      models: [],
      posicaoX_mm: 0,
      posicaoY_mm: 1275,
      rotacaoY_90: false,
      tipoBorda: "reta",
      locked: false,
      drawersLayer: [],
    } as WorkspaceBox);

    const paineis = gerarPaineisCaixaForno(box);
    const tipos = paineis.map((p) => p.tipo);
    expect(tipos).toContain("lateral_esquerda");
    expect(tipos).toContain("lateral_direita");
    expect(tipos).toContain("cima");
    expect(tipos.filter((t) => t === "separador")).toHaveLength(3);
    expect(tipos).toContain("porta_inferior");
    expect(tipos).toContain("porta_superior");
    expect(tipos).toContain("costa_superior");
    expect(tipos).not.toContain("fundo");
  });

  it("buildCutlistForCaixaForno — integração industrial", () => {
    const cfg = createCaixaForno({ id: "forno-cutlist" });
    const box = convertWorkspaceToBox({
      ...cfg,
      models: [],
      posicaoX_mm: 0,
      posicaoY_mm: 1275,
      rotacaoY_90: false,
      tipoBorda: "reta",
      locked: false,
      drawersLayer: [],
    } as WorkspaceBox);

    const items = buildCutlistForCaixaForno(box, defaultRulesConfig, "mdf_branco");
    expect(items.length).toBe(9);
    expect(items.some((i) => i.tipo === "porta_inferior")).toBe(true);
    expect(items.some((i) => i.tipo === "porta_superior")).toBe(true);
    expect(items.some((i) => i.tipo === "costa_superior")).toBe(true);
  });

  it("syncCaixaFornoOnDimensoesChange — preserva seps ao redimensionar altura", () => {
    const cfg = createCaixaForno();
    const synced = syncCaixaFornoOnDimensoesChange({
      ...cfg,
      dimensoes: { ...cfg.dimensoes, altura: 2700 },
      models: [],
      posicaoX_mm: 0,
      posicaoY_mm: 1350,
      rotacaoY_90: false,
      tipoBorda: "reta",
      locked: false,
      drawersLayer: [],
    } as WorkspaceBox);

    expect(synced.separadores[0]?.positionMm).toBe(cfg.separadores[0]?.positionMm);
    expect(synced.doorsLayer[1]?.height).toBe(762);
  });
});
