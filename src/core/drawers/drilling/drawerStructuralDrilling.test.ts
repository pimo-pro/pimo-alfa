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

describe("Furação estrutural de gaveta (TechnicalDrillHole) — interlock", () => {
  it("lateral — 5 furos (4 cavilha aresta + 1 rasgo)", () => {
    const holes = computeDrawerLateralStructuralHoles({
      ...LATERAL,
      side: "esq",
    });

    expect(holes).toHaveLength(5);

    const cavilhas = holes.filter((h) => h.tipo === "cavilha");
    expect(cavilhas).toHaveLength(4);
    expect(cavilhas.every((h) => h.diametro === 10 && h.profundidade === 14)).toBe(true);

    const rear = cavilhas.filter((h) => h.face === "tras");
    expect(rear).toHaveLength(2);
    expect(rear.every((h) => h.x === LATERAL.largura)).toBe(true);
    expect(rear.map((h) => h.y).sort((a, b) => a - b)).toEqual([39, 111]);

    const front = cavilhas.filter((h) => h.face === "frente");
    expect(front).toHaveLength(2);
    expect(front.every((h) => h.x === 0)).toBe(true);
    expect(front.map((h) => h.y).sort((a, b) => a - b)).toEqual([30, 120]);

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

  it("lateral esq — traseira X=L face tras; frente X=0 face frente", () => {
    const holes = computeDrawerLateralStructuralHoles({
      ...LATERAL,
      side: "esq",
    });
    const rear = holes.filter((h) => h.tipo === "cavilha" && h.face === "tras");
    const front = holes.filter((h) => h.tipo === "cavilha" && h.face === "frente");
    expect(rear.every((h) => h.x === LATERAL.largura)).toBe(true);
    expect(front.every((h) => h.x === 0)).toBe(true);
  });

  it("lateral dir — espelho KDT (traseira X=0 face frente)", () => {
    const holes = computeDrawerLateralStructuralHoles({
      ...LATERAL,
      side: "dir",
    });

    expect(holes).toHaveLength(5);
    const rear = holes.filter((h) => h.tipo === "cavilha" && h.face === "frente");
    expect(rear).toHaveLength(2);
    expect(rear.every((h) => h.x === 0 && h.profundidade === 14)).toBe(true);
    expect(rear.map((h) => h.y).sort((a, b) => a - b)).toEqual([39, 111]);

    const front = holes.filter((h) => h.tipo === "cavilha" && h.face === "tras");
    expect(front.every((h) => h.x === LATERAL.largura)).toBe(true);
  });

  it("lateral esq/dir — Y e rasgo iguais; X espelhado", () => {
    const esq = computeDrawerLateralStructuralHoles({ ...LATERAL, side: "esq" });
    const dir = computeDrawerLateralStructuralHoles({ ...LATERAL, side: "dir" });
    expect(esq.map((h) => h.y)).toEqual(dir.map((h) => h.y));
    expect(esq.find((h) => h.holeSubtype === "groove")).toEqual(dir.find((h) => h.holeSubtype === "groove"));
  });

  it("costa — cavilhas sync Y=39/H-39 prof.13 + 2 fundo", () => {
    const holes = computeDrawerCostaStructuralHoles(COSTA);
    expect(holes).toHaveLength(6);
    const cavilhas = holes.filter((h) => h.tipo === "cavilha");
    expect(cavilhas).toHaveLength(4);
    expect(cavilhas.every((h) => h.profundidade === 13 && h.diametro === 10)).toBe(true);
    expect([...new Set(cavilhas.map((h) => h.y))].sort((a, b) => a - b)).toEqual([39, 111]);
  });

  it("frente interna — 4 cavilhas face prof.13 (sem rasgo)", () => {
    const holes = computeDrawerFrenteIntStructuralHoles(FRENTE);
    expect(holes).toHaveLength(4);
    expect(holes.every((h) => h.tipo === "cavilha" && h.profundidade === 13)).toBe(true);
    expect([...new Set(holes.map((h) => h.y))].sort((a, b) => a - b)).toEqual([30, 148]);
  });

  it("pipeline — calcDrawerStructural via calculateTechnicalDrillingsForPiece", () => {
    const lat = calculateTechnicalDrillingsForPiece(
      { tipo: "gaveta_lat_esq", largura: LATERAL.largura, altura: LATERAL.altura, espessura: LATERAL.espessura },
      defaultRulesConfig
    );
    const structuralLat = lat.filter((h) => h.tipo === "fixacao_estrutural" || h.tipo === "cavilha");
    expect(structuralLat.length).toBeGreaterThanOrEqual(5);
    expect(lat.some((h) => h.holeSubtype === "groove")).toBe(true);
    expect(lat.filter((h) => h.tipo === "corredica").length).toBeGreaterThanOrEqual(3);

    const costa = calculateTechnicalDrillingsForPiece(
      { tipo: "gaveta_traseira", largura: COSTA.largura, altura: COSTA.altura, espessura: COSTA.espessura },
      defaultRulesConfig
    );
    expect(costa.filter((h) => h.tipo === "cavilha" || h.tipo === "fixacao_estrutural").length).toBeGreaterThanOrEqual(6);

    const frente = calculateTechnicalDrillingsForPiece(
      { tipo: "gaveta_frente", largura: FRENTE.largura, altura: FRENTE.altura, espessura: FRENTE.espessura },
      defaultRulesConfig
    );
    expect(frente.filter((h) => h.tipo === "cavilha")).toHaveLength(4);
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
    expect((costaXml?.xml.match(/<TypeNo>2<\/TypeNo>/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(frenteExtXml).toBeUndefined();
  });
});
