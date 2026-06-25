/**
 * Validação final estrutural — Caixa Forno vs Normal vs PI.
 * Gera asserções explícitas para cutlist, 3D mesh specs e compatibilidade.
 */
import { describe, expect, it } from "vitest";
import {
  createCaixaForno,
  gerarPaineisCaixaForno,
  computeCaixaFornoLayout,
  buildCaixaFornoSeparadores,
} from "./caixaFornoGenerator";
import { convertWorkspaceToBox } from "../../../context/projectState";
import type { WorkspaceBox } from "../../types";
import { cutlistComPrecoFromBox } from "../../manufacturing/cutlistFromBoxes";
import { gerarPaineis } from "../../manufacturing/boxManufacturing";
import { gerarPaineisPi } from "../../../data/moveisUnificados/pi/manufacturing";
import { defaultRulesConfig } from "../../rules/rulesConfig";
import { COSTA_FIXED_THICKNESS_MM, resolveSeparadorMaterialForBox } from "../../materials/materials.api";
import { getDivSepMeshSpecs } from "../../divSep/visualSpecs";
import { SYSTEM_BACK_MM } from "../../baseCabinets";
import { buildViewerDrillMarkersByPanel } from "../../../modules/drilling/drillingAdapter";

function toBox(cfg: ReturnType<typeof createCaixaForno>, extra: Partial<WorkspaceBox> = {}): WorkspaceBox {
  return convertWorkspaceToBox({
    ...cfg,
    models: [],
    posicaoX_mm: 0,
    posicaoY_mm: 1275,
    rotacaoY_90: false,
    tipoBorda: "reta",
    locked: false,
    drawersLayer: [],
    ...extra,
  } as WorkspaceBox);
}

describe("Validação final — Caixa Forno + sistema de caixas", () => {
  const fornoCfg = createCaixaForno({ id: "val-forno", espessura: 19 });
  const fornoBox = toBox(fornoCfg);
  const layout = computeCaixaFornoLayout(fornoBox);
  const cutlist = cutlistComPrecoFromBox(fornoBox, defaultRulesConfig, "mdf_branco");

  it("3D — COSTA 10 mm, largura total, posição Z atrás da caixa", () => {
    const widthM = fornoCfg.dimensoes.largura / 1000;
    const depthM = fornoCfg.dimensoes.profundidade / 1000;
    const backThicknessM = SYSTEM_BACK_MM / 1000;
    const costaHeightM = layout.costaSuperiorAlturaMm / 1000;
    const upperStartLocalM = layout.upperStartMm / 1000 - fornoCfg.dimensoes.altura / 1000 / 2;
    const costaCenterY = upperStartLocalM + costaHeightM / 2;
    const backPosZ = -depthM / 2 + backThicknessM / 2;

    expect(widthM).toBe(0.6);
    expect(backThicknessM).toBe(0.01);
    expect(costaHeightM).toBeCloseTo(0.593, 3);
    expect(costaCenterY).toBeGreaterThan(0);
    expect(backPosZ).toBeCloseTo(-0.295, 3);
  });

  it("3D — SEPARADORES com espessura da caixa (19 mm) via getDivSepMeshSpecs", () => {
    const specs = getDivSepMeshSpecs(
      {
        dimensoes: fornoCfg.dimensoes,
        espessura: 19,
        profundidadeExterna: 600,
        portaTipo: "porta_simples",
        doorsLayer: fornoCfg.doorsLayer,
        costaAtiva: true,
        separadores: fornoCfg.separadores,
      },
      0.6,
      2.55,
      0.6,
      0.019
    );
    expect(specs).toHaveLength(3);
    const thicknesses = specs.map((s) => s.size[1]);
    expect(new Set(thicknesses)).toEqual(new Set([0.019]));
    const centersY = specs.map((s) => s.pos[1]).sort((a, b) => a - b);
    expect(centersY[0]).toBeLessThan(centersY[1]);
    expect(centersY[1]).toBeLessThan(centersY[2]);
  });

  it("3D — portas com alturas recalculadas (800 + 612 mm)", () => {
    expect(layout.portaInferiorAlturaMm).toBe(800);
    expect(layout.portaSuperiorAlturaMm).toBe(612);
    expect(fornoBox.doorsLayer[0]?.height).toBe(800);
    expect(fornoBox.doorsLayer[1]?.height).toBe(612);
  });

  it("Industrial — COSTA 10 mm, largura total, tipo costa_superior", () => {
    const costa = cutlist.find((i) => i.tipo === "costa_superior");
    expect(costa).toBeDefined();
    expect(costa!.espessura).toBe(COSTA_FIXED_THICKNESS_MM);
    expect(costa!.dimensoes.largura).toBe(600);
    expect(costa!.dimensoes.altura).toBe(593);
    expect(costa!.dimensoes.profundidade).toBe(10);
  });

  it("Industrial — SEPARADORES 19 mm, profundidade útil 571 mm", () => {
    const seps = cutlist.filter((i) => i.tipo === "separador");
    expect(seps).toHaveLength(3);
    seps.forEach((sep) => {
      expect(sep.espessura).toBe(19);
      expect(sep.dimensoes.altura).toBe(571);
      expect(sep.dimensoes.largura).toBe(562);
    });
  });

  it("Industrial — furação portas e laterais sem regressão", () => {
    const portaInf = cutlist.find((i) => i.tipo === "porta_inferior");
    const portaSup = cutlist.find((i) => i.tipo === "porta_superior");
    const latEsq = cutlist.find((i) => i.tipo === "lateral_esquerda");
    expect(portaInf?.drillHoles?.some((h) => h.holeType === "dobradica")).toBe(true);
    expect(portaSup?.drillHoles?.some((h) => h.holeType === "dobradica")).toBe(true);
    expect(latEsq?.drillHoles?.some((h) => h.holeType === "dobradica_parafuso_uniao")).toBe(true);
    const markers = buildViewerDrillMarkersByPanel(cutlist);
    expect(markers.portaPerDoor?.length).toBe(2);
  });

  it("Industrial — materiais corpo, costa e separador", () => {
    const cima = cutlist.find((i) => i.tipo === "cima");
    const costa = cutlist.find((i) => i.tipo === "costa_superior");
    const sep = cutlist.find((i) => i.tipo === "separador");
    expect(cima?.materialId).toBeTruthy();
    expect(costa?.materialId).toBeTruthy();
    expect(sep?.materialId).toBeTruthy();
    expect(costa?.espessura).toBe(10);
    expect(sep?.espessura).toBe(19);
  });

  it("Compatibilidade — projeto antigo sem separadorMaterialId herda corpo", () => {
    const legacy = resolveSeparadorMaterialForBox(undefined, "mdf_branco");
    expect(legacy.materialId).toContain("mdf");
    const legacyBox = toBox(fornoCfg);
    expect(legacyBox.separadorMaterialId).toBeUndefined();
    const seps = gerarPaineisCaixaForno(legacyBox).filter((p) => p.tipo === "separador");
    expect(seps[0]?.material.toLowerCase()).toContain("mdf");
  });

  it("Espessura 15 mm — separadores e posições recalculam", () => {
    const cfg15 = createCaixaForno({ espessura: 15 });
    const seps = buildCaixaFornoSeparadores(cfg15);
    const layout15 = computeCaixaFornoLayout(cfg15);
    expect(layout15.upperStartMm).toBe(900 + 15 + 600 + 15 + 400);
    const cut15 = cutlistComPrecoFromBox(toBox(cfg15), defaultRulesConfig, "mdf_branco");
    cut15.filter((i) => i.tipo === "separador").forEach((s) => expect(s.espessura).toBe(15));
  });

  it("Sistema Normal — caixa base 600 não afectada (COSTA 10 mm, SEP = espessura)", () => {
    const normalBox = convertWorkspaceToBox({
      id: "val-normal",
      nome: "Base 600",
      dimensoes: { largura: 600, altura: 720, profundidade: 600 },
      espessura: 19,
      tipoBorda: "reta",
      tipoFundo: "com_fundo",
      models: [],
      prateleiras: 0,
      portaTipo: "porta_simples",
      gavetas: 0,
      alturaGaveta: 0,
      posicaoX_mm: 0,
      posicaoY_mm: 360,
      rotacaoY_90: false,
      locked: false,
      doorsLayer: [{ id: "d1", parentBoxId: "val-normal", groupType: "simples", width: 594, height: 717, thickness: 19, materialId: "mdf_branco", material: "mdf_branco", openDirection: "left", isOpen: false, hingeSide: "left", pivot: "left-edge", posX: 0, posY: 0, posZ: 300, rotY: 0 }],
      drawersLayer: [],
      divisores: [],
      separadores: [
        { id: "sep-n1", positionMm: 300, referenceEdge: "bottom", profundidadeMm: 571 },
      ],
      costaAtiva: true,
    } as WorkspaceBox);
    const paineis = gerarPaineis(normalBox, defaultRulesConfig);
    const costa = paineis.find((p) => p.tipo === "COSTA");
    const sep = paineis.find((p) => p.tipo === "separador");
    expect(costa?.espessura_mm).toBe(10);
    expect(costa?.largura_mm).toBe(600);
    expect(sep?.espessura_mm).toBe(19);
  });

  it("Sistema PI — painéis inalterados (760×560, espessura PI)", () => {
    const piBox = convertWorkspaceToBox({
      id: "val-pi",
      nome: "PI 600",
      dimensoes: { largura: 600, altura: 760, profundidade: 560 },
      espessura: 19,
      baseCabinetId: "pi-base-600",
      tipoBorda: "reta",
      tipoFundo: "com_fundo",
      models: [],
      prateleiras: 0,
      portaTipo: "sem_porta",
      gavetas: 0,
      alturaGaveta: 0,
      posicaoX_mm: 0,
      posicaoY_mm: 380,
      rotacaoY_90: false,
      locked: false,
      doorsLayer: [],
      drawersLayer: [],
      divisores: [],
      separadores: [],
      costaAtiva: true,
    } as WorkspaceBox);
    const piPaineis = gerarPaineisPi(piBox);
    expect(piPaineis.find((p) => p.tipo === "cima")?.altura_mm).toBe(560);
    expect(piPaineis.find((p) => p.tipo === "lateral_esquerda")?.altura_mm).toBe(760);
    expect(piPaineis.find((p) => p.tipo === "COSTA")?.espessura_mm).toBe(10);
    expect(piPaineis.some((p) => p.tipo === "separador")).toBe(false);
  });
});
