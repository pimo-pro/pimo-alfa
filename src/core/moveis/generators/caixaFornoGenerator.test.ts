import { describe, expect, it } from "vitest";
import {
  buildCutlistForCaixaForno,
  CAIXA_FORNO_SEPARADOR_ESPESSURA_MM,
  computeCaixaFornoCostaSuperiorAlturaMm,
  computeCaixaFornoLayout,
  createCaixaForno,
  getCaixaFornoSepBottomsMm,
  gerarPaineisCaixaForno,
  resolveCaixaFornoSeparadorProfundidadeMm,
  syncCaixaFornoOnDimensoesChange,
} from "./caixaFornoGenerator";
import { defaultRulesConfig, getNumDobradicas } from "../../rules/rulesConfig";
import { convertWorkspaceToBox } from "../../../context/projectState";
import type { PanelDrillHole, WorkspaceBox } from "../../types";
import { buildViewerDrillMarkersByPanel } from "../../../modules/drilling/drillingAdapter";
import { computeDoorVerticalGaps } from "../../doors/doorLayerGeometry";
import { COSTA_FIXED_THICKNESS_MM } from "../../materials/materials.api";

function hingeOffsetsFromDoorBottom(holes: PanelDrillHole[] | undefined, doorHeightMm: number): number[] {
  if (!holes?.length || doorHeightMm <= 0) return [];
  return holes
    .filter((h) => h.holeType === "dobradica")
    .map((h) => doorHeightMm - Number(h.y))
    .filter((o) => Number.isFinite(o))
    .sort((a, b) => a - b);
}

function parafusoUniaoOffsetsFromLateralBottom(
  holes: PanelDrillHole[] | undefined,
  lateralHeightMm: number
): number[] {
  if (!holes?.length || lateralHeightMm <= 0) return [];
  return holes
    .filter((h) => h.holeType === "dobradica_parafuso_uniao")
    .map((h) => lateralHeightMm - Number(h.y))
    .filter((o) => Number.isFinite(o))
    .map((o) => Math.round(o * 1000) / 1000)
    .sort((a, b) => a - b);
}

describe("caixaFornoGenerator", () => {
  it("mantém seps fixos e ajusta só o compartimento superior", () => {
    const seps = getCaixaFornoSepBottomsMm();
    expect(seps.sep1BottomMm).toBe(900);
    expect(seps.sep2BottomMm).toBe(1510);
    expect(seps.sep3BottomMm).toBe(1920);

    const layout2550 = computeCaixaFornoLayout({
      dimensoes: { largura: 600, altura: 2550, profundidade: 600 },
      espessura: 19,
      profundidadeExterna: 600,
      portaTipo: "porta_simples",
      doorsLayer: [],
      costaAtiva: true,
    });
    expect(layout2550.portaInferiorAlturaMm).toBe(800);
    expect(layout2550.portaSuperiorAlturaMm).toBe(630);
    expect(layout2550.costaSuperiorAlturaMm).toBe(611);
    expect(layout2550.profundidadeSeparadorMm).toBe(571);
    expect(computeCaixaFornoCostaSuperiorAlturaMm(2550, 1920, 19)).toBe(611);

    const layout2700 = computeCaixaFornoLayout({
      dimensoes: { largura: 600, altura: 2700, profundidade: 600 },
      espessura: 19,
      profundidadeExterna: 600,
      portaTipo: "porta_simples",
      doorsLayer: [],
      costaAtiva: true,
    });
    expect(layout2700.portaInferiorAlturaMm).toBe(800);
    expect(layout2700.portaSuperiorAlturaMm).toBe(780);
  });

  it("createCaixaForno — sem fundo, sem pés, 3 seps e 2 portas", () => {
    const cfg = createCaixaForno();
    expect(cfg.tipoFundo).toBe("sem_fundo");
    expect(cfg.feetEnabled).toBe(false);
    expect(cfg.separadores).toHaveLength(3);
    expect(cfg.doorsLayer).toHaveLength(2);
    expect(cfg.dimensoes.altura).toBe(2550);
  });

  it("gerarPaineisCaixaForno — separadores com espessura 10 mm e profundidade correta", () => {
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
    const seps = paineis.filter((p) => p.tipo === "separador");
    expect(seps).toHaveLength(3);
    seps.forEach((sep) => {
      expect(sep.espessura_mm).toBe(CAIXA_FORNO_SEPARADOR_ESPESSURA_MM);
      expect(sep.altura_mm).toBe(571);
    });
  });

  it("resolveCaixaFornoSeparadorProfundidadeMm — profundidade da CIMA (P útil interna)", () => {
    const withDoor = resolveCaixaFornoSeparadorProfundidadeMm({
      dimensoes: { largura: 600, altura: 2550, profundidade: 600 },
      profundidadeExterna: 600,
      portaTipo: "porta_simples",
      doorsLayer: [{ thickness: 19 } as import("../../../models/BoxLayers").DoorLayerItem],
      espessura: 19,
      costaAtiva: true,
    });
    expect(withDoor).toBe(571);

    const withoutDoor = resolveCaixaFornoSeparadorProfundidadeMm({
      dimensoes: { largura: 600, altura: 2550, profundidade: 600 },
      profundidadeExterna: 600,
      portaTipo: "sem_porta",
      doorsLayer: [],
      espessura: 19,
      costaAtiva: true,
    });
    expect(withoutDoor).toBe(590);
  });

  it("gerarPaineisCaixaForno — costa superior com espessura 10 mm e altura correta", () => {
    const cfg = createCaixaForno({ id: "forno-costa" });
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
    const costa = paineis.find((p) => p.tipo === "costa_superior");
    const cima = paineis.find((p) => p.tipo === "cima");
    expect(costa?.espessura_mm).toBe(COSTA_FIXED_THICKNESS_MM);
    expect(costa?.altura_mm).toBe(611);
    expect(costa?.largura_mm).toBe(562);
    expect(cima?.altura_mm).toBe(571);
    expect(paineis.filter((p) => p.tipo === "separador").every((sep) => sep.altura_mm === cima?.altura_mm)).toBe(true);
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
    expect(synced.doorsLayer[1]?.height).toBe(780);
  });

  it("buildCutlistForCaixaForno — portas independentes com furos e laterais alinhados", () => {
    const cfg = createCaixaForno({ id: "forno-hinges" });
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
    const portaInf = items.find((i) => i.tipo === "porta_inferior");
    const portaSup = items.find((i) => i.tipo === "porta_superior");
    const latEsq = items.find((i) => i.tipo === "lateral_esquerda");

    expect(portaInf?.drillHoles?.some((h) => h.holeType === "dobradica")).toBe(true);
    expect(portaSup?.drillHoles?.some((h) => h.holeType === "dobradica")).toBe(true);
    expect(latEsq?.drillHoles?.some((h) => h.holeType === "dobradica_parafuso_uniao")).toBe(true);

    const layout = computeCaixaFornoLayout(box);
    const openingH = layout.alturaTotalMm;
    const lowerDoor = box.doorsLayer[0]!;
    const upperDoor = box.doorsLayer[1]!;
    const lowerBottomGap = computeDoorVerticalGaps(openingH, lowerDoor.height, lowerDoor.posY).bottomGapMm;
    const upperBottomGap = computeDoorVerticalGaps(openingH, upperDoor.height, upperDoor.posY).bottomGapMm;

    const lowerGlobal = hingeOffsetsFromDoorBottom(portaInf?.drillHoles, lowerDoor.height).map(
      (o) => Math.round((o + lowerBottomGap) * 1000) / 1000
    );
    const upperGlobal = hingeOffsetsFromDoorBottom(portaSup?.drillHoles, upperDoor.height).map(
      (o) => Math.round((o + upperBottomGap) * 1000) / 1000
    );
    const lateralGlobal = parafusoUniaoOffsetsFromLateralBottom(latEsq?.drillHoles, layout.alturaTotalMm);

    expect(lowerGlobal.length).toBe(getNumDobradicas(lowerDoor.height, defaultRulesConfig));
    expect(upperGlobal.length).toBe(getNumDobradicas(upperDoor.height, defaultRulesConfig));
    expect(lateralGlobal).toEqual([...lowerGlobal, ...upperGlobal].sort((a, b) => a - b));

    const drillMarkers = buildViewerDrillMarkersByPanel(items);
    expect(drillMarkers.portaPerDoor).toHaveLength(2);
    expect(drillMarkers.portaPerDoor?.[0]?.length ?? 0).toBeGreaterThan(0);
    expect(drillMarkers.portaPerDoor?.[1]?.length ?? 0).toBeGreaterThan(0);
    expect(drillMarkers.portaPerDoor?.[0]).not.toEqual(drillMarkers.portaPerDoor?.[1]);
  });
});
