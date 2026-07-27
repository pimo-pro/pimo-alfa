import { describe, expect, it } from "vitest";
import {
  computeDrawerCostaStructuralHoles,
  computeDrawerFrenteIntStructuralHoles,
  computeDrawerLateralStructuralHoles,
} from "./DrawerDrillingRules";
import { calculateTechnicalDrillingsForPiece } from "../../drilling/drillingService";
import { defaultRulesConfig } from "../../rules/rulesConfig";
import { buildPanelDrillingResult } from "../../../modules/drilling/drillingAdapter";
import { buildDrillFilesForProject } from "../../drill/drillExport";
import { cutlistComPrecoFromBox } from "../../manufacturing/cutlistFromBoxes";
import { isDrawerPieceTipo } from "../../../services/drawerCutlistAdapter";
import {
  buildDrawerScenario,
  minimalBoxWithDrawers,
} from "../../../validation/drawerCertificationTestHelpers";

/** Dimensões de referência (L×W×T) alinhadas com cenário industrial típico. */
const LATERAL = { largura: 521, altura: 150, espessura: 16 } as const;
const COSTA = { largura: 489, altura: 150, espessura: 16 } as const;
const FRENTE = { largura: 598, altura: 178, espessura: 19 } as const;

describe("Furação estrutural de gaveta (TechnicalDrillHole)", () => {
  it("lateral — 5 furos (2 cavilha + 2 costa + 1 rasgo)", () => {
    const holes = computeDrawerLateralStructuralHoles({
      ...LATERAL,
      side: "esq",
    });

    expect(holes).toHaveLength(5);

    const cavilhas = holes.filter((h) => h.tipo === "cavilha");
    expect(cavilhas).toHaveLength(2);
    expect(cavilhas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          x: LATERAL.espessura / 2,
          y: 15,
          diametro: 10,
          profundidade: 13,
          face: "cima",
        }),
        expect.objectContaining({
          x: LATERAL.espessura / 2,
          y: LATERAL.altura - 41,
          diametro: 10,
          profundidade: 13,
          face: "cima",
        }),
      ])
    );

    const costaFix = holes.filter((h) => h.tipo === "fixacao_estrutural" && h.holeSubtype !== "groove");
    expect(costaFix).toHaveLength(2);
    expect(costaFix).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: LATERAL.largura, y: 15, diametro: 10, profundidade: 30, face: "tras" }),
        expect.objectContaining({
          x: LATERAL.largura,
          y: LATERAL.altura - 35,
          diametro: 10,
          profundidade: 30,
          face: "tras",
        }),
      ])
    );

    const groove = holes.find((h) => h.holeSubtype === "groove");
    expect(groove).toMatchObject({
      x: 0,
      y: LATERAL.altura - 13,
      profundidade: 3,
      face: "cima",
      grooveWidth: 13,
      grooveLength: LATERAL.largura,
      tipo: "fixacao_estrutural",
    });
  });

  it("lateral esq — cavilha T/2 e costa em X=L face tras", () => {
    const holes = computeDrawerLateralStructuralHoles({
      ...LATERAL,
      side: "esq",
    });

    const cavilhas = holes.filter((h) => h.tipo === "cavilha");
    expect(cavilhas.every((h) => h.x === LATERAL.espessura / 2)).toBe(true);

    const costaFix = holes.filter((h) => h.tipo === "fixacao_estrutural" && h.holeSubtype !== "groove");
    expect(costaFix.every((h) => h.x === LATERAL.largura && h.face === "tras")).toBe(true);
  });

  it("lateral dir — cavilha L-T/2 e costa em X=0 face frente (espelho KDT)", () => {
    const holes = computeDrawerLateralStructuralHoles({
      ...LATERAL,
      side: "dir",
    });

    expect(holes).toHaveLength(5);

    const cavilhas = holes.filter((h) => h.tipo === "cavilha");
    expect(cavilhas).toHaveLength(2);
    expect(cavilhas.every((h) => h.x === LATERAL.largura - LATERAL.espessura / 2)).toBe(true);
    expect(cavilhas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ y: 15, diametro: 10, profundidade: 13, face: "cima" }),
        expect.objectContaining({ y: LATERAL.altura - 41, diametro: 10, profundidade: 13, face: "cima" }),
      ])
    );

    const costaFix = holes.filter((h) => h.tipo === "fixacao_estrutural" && h.holeSubtype !== "groove");
    expect(costaFix).toHaveLength(2);
    expect(costaFix.every((h) => h.x === 0 && h.face === "frente")).toBe(true);
    expect(costaFix).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ y: 15, profundidade: 30 }),
        expect.objectContaining({ y: LATERAL.altura - 35, profundidade: 30 }),
      ])
    );

    const groove = holes.find((h) => h.holeSubtype === "groove");
    expect(groove).toMatchObject({
      y: LATERAL.altura - 13,
      grooveWidth: 13,
      profundidade: 3,
    });
  });

  it("lateral esq/dir — Y e rasgo iguais; X espelhado", () => {
    const esq = computeDrawerLateralStructuralHoles({ ...LATERAL, side: "esq" });
    const dir = computeDrawerLateralStructuralHoles({ ...LATERAL, side: "dir" });
    expect(esq.map((h) => h.y)).toEqual(dir.map((h) => h.y));
    expect(esq.find((h) => h.holeSubtype === "groove")).toEqual(dir.find((h) => h.holeSubtype === "groove"));
    expect(esq.filter((h) => h.tipo === "cavilha")[0].x).toBe(8);
    expect(dir.filter((h) => h.tipo === "cavilha")[0].x).toBe(LATERAL.largura - 8);
  });

  it("costa — 6 furos horizontais/verticais de fixação", () => {
    const holes = computeDrawerCostaStructuralHoles(COSTA);
    expect(holes).toHaveLength(6);
    expect(holes.every((h) => h.tipo === "fixacao_estrutural")).toBe(true);

    expect(holes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 0, y: 15, face: "esquerda", profundidade: 30 }),
        expect.objectContaining({ x: 0, y: COSTA.altura - 15, face: "esquerda", profundidade: 30 }),
        expect.objectContaining({ x: COSTA.largura, y: 15, face: "direita", profundidade: 30 }),
        expect.objectContaining({
          x: COSTA.largura,
          y: COSTA.altura - 15,
          face: "direita",
          profundidade: 30,
        }),
        expect.objectContaining({ x: 8, y: COSTA.altura, face: "cima", profundidade: 10 }),
        expect.objectContaining({ x: COSTA.largura - 8, y: COSTA.altura, face: "cima", profundidade: 10 }),
      ])
    );
  });

  it("frente interna — 4 fixações horizontais (sem rasgo KDT)", () => {
    const holes = computeDrawerFrenteIntStructuralHoles(FRENTE);
    expect(holes).toHaveLength(4);
    expect(holes.every((h) => h.tipo === "fixacao_estrutural" && h.holeSubtype !== "groove")).toBe(true);
    expect(holes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 0, y: 30, face: "esquerda", profundidade: 30 }),
        expect.objectContaining({ x: 0, y: FRENTE.altura - 30, face: "esquerda", profundidade: 30 }),
        expect.objectContaining({ x: FRENTE.largura, y: 30, face: "direita", profundidade: 30 }),
        expect.objectContaining({ x: FRENTE.largura, y: FRENTE.altura - 30, face: "direita", profundidade: 30 }),
      ])
    );
  });

  it("pipeline — calcDrawerStructural via calculateTechnicalDrillingsForPiece", () => {
    const lat = calculateTechnicalDrillingsForPiece(
      { tipo: "gaveta_lat_esq", largura: LATERAL.largura, altura: LATERAL.altura, espessura: LATERAL.espessura },
      defaultRulesConfig
    );
    const structuralLat = lat.filter((h) => h.tipo === "fixacao_estrutural" || h.tipo === "cavilha");
    expect(structuralLat.length).toBeGreaterThanOrEqual(5);
    expect(lat.some((h) => h.holeSubtype === "groove")).toBe(true);
    expect(lat.filter((h) => h.tipo === "corredica")).toHaveLength(3);

    const costa = calculateTechnicalDrillingsForPiece(
      { tipo: "gaveta_traseira", largura: COSTA.largura, altura: COSTA.altura, espessura: COSTA.espessura },
      defaultRulesConfig
    );
    expect(costa.filter((h) => h.tipo === "fixacao_estrutural")).toHaveLength(6);

    const frente = calculateTechnicalDrillingsForPiece(
      { tipo: "gaveta_frente", largura: FRENTE.largura, altura: FRENTE.altura, espessura: FRENTE.espessura },
      defaultRulesConfig
    );
    expect(frente.filter((h) => h.tipo === "fixacao_estrutural")).toHaveLength(4);
    expect(frente.some((h) => h.holeSubtype === "groove")).toBe(false);
  });

  it("adapter — groove propagado para PanelDrillHole", () => {
    const result = buildPanelDrillingResult(
      {
        tipo: "gaveta_lat_esq",
        larguraMm: LATERAL.largura,
        alturaMm: LATERAL.altura,
        espessuraMm: LATERAL.espessura,
      },
      defaultRulesConfig
    );
    expect(result.success).toBe(true);
    const groove = result.data?.drillHoles.find((h) => h.holeSubtype === "groove");
    expect(groove).toMatchObject({
      grooveWidth: 13,
      grooveLength: LATERAL.largura,
      depth: 3,
    });
  });

  it("XML — rasgos estruturais exportam TypeNo=3 (schema BeginX/EndX)", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      drawerCount: 1,
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig).filter((p) => isDrawerPieceTipo(p.tipo));
    const xmlFiles = buildDrillFilesForProject(cutlist, {
      projectName: "Teste",
      boxes: [box],
      rules: defaultRulesConfig,
    });

    const lateralXml = xmlFiles.find((f) => f.partName.includes("gav_lat"));
    const costaXml = xmlFiles.find((f) => f.partName.includes("gav_cost"));
    const frenteExtXml = xmlFiles.find((f) => f.partName.includes("gav_frent_ext"));
    expect(lateralXml?.xml).toContain("<TypeNo>3</TypeNo>");
    expect(lateralXml?.xml).toContain("<BeginX>");
    expect(lateralXml?.xml).not.toContain("<X2>");
    expect(costaXml?.xml).not.toContain("<TypeNo>3</TypeNo>");
    // Contagem actual do export industrial na costa da gaveta.
    expect((costaXml?.xml.match(/<TypeNo>2<\/TypeNo>/g) ?? []).length).toBe(7);
    expect((costaXml?.xml.match(/<TypeNo>1<\/TypeNo>/g) ?? []).length).toBe(2);
    expect(frenteExtXml).toBeUndefined();
  });
});
