import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import {
  runSafetyConfigGate,
  runSafetyMeasuresGate,
  runSafetyGeometryGate,
  runSafetyDrillingGate,
  runSafetyCutlistGate,
  runSafetyPdfGate,
  runSafetyViewerGate,
  buildSafetyReport,
  formatSafetyReportText,
} from "./index";
import { getEuropeanDrawerModel } from "../catalog";
import { generateEuropeanDrawer } from "../index";
import type {
  DrawerCutlistItem,
  DrawerGeometry,
  DrawerPDFSection,
  EuropeanDrawerHole,
} from "../types";

const model = getEuropeanDrawerModel("hettich-innotech-atira");

const goodBox = {
  id: "cx",
  nome: "CX",
  dimensoes: { largura: 538, altura: 720, profundidade: 560 },
  espessura: 19,
  gavetas: 1,
  material: "mdf_branco",
  profundidadeInternaUtilMm: 500,
};

const goodConfig = {
  systemId: "hettich-innotech-atira" as const,
  heightMm: model.heights[1]?.heightMm ?? model.heights[0]!.heightMm,
  depthMm: 450,
  softClose: true,
  pushOpen: false,
  count: 1,
  dualFront: false,
};

describe("safety gates  bloqueio de invalidos", () => {
  it("config: bloqueia runner >= profundidade util", () => {
    const r = runSafetyConfigGate({ ...goodConfig, depthMm: 500 }, goodBox, model);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "RUNNER_VS_USEFUL")).toBe(true);
  });

  it("config: bloqueia count invalido", () => {
    const r = runSafetyConfigGate({ ...goodConfig, count: 0 }, { ...goodBox, gavetas: 0 }, model);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "COUNT_INVALID")).toBe(true);
  });

  it("config: bloqueia frente maior que a caixa", () => {
    const r = runSafetyConfigGate({ ...goodConfig, frontWidthMm: 900 }, goodBox, model);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "FRONT_WIDER_THAN_BOX")).toBe(true);
  });

  it("measures: passa para config industrial valida", () => {
    const r = runSafetyMeasuresGate(goodConfig, goodBox, model);
    expect(r.ok).toBe(true);
  });

  it("geometry: bloqueia origem NaN", () => {
    const geo = {
      systemId: "hettich-innotech-atira",
      front: {
        widthMm: 100,
        heightMm: 100,
        depthMm: 19,
        thicknessMm: 19,
        originXMm: NaN,
        originYMm: 0,
        originZMm: 0,
      },
      bottom: {
        widthMm: 100,
        heightMm: 10,
        depthMm: 100,
        thicknessMm: 10,
        originXMm: 0,
        originYMm: 0,
        originZMm: 0,
      },
      leftSide: {
        widthMm: 16,
        heightMm: 100,
        depthMm: 400,
        thicknessMm: 16,
        originXMm: -50,
        originYMm: 0,
        originZMm: 0,
      },
      rightSide: {
        widthMm: 16,
        heightMm: 100,
        depthMm: 400,
        thicknessMm: 16,
        originXMm: 50,
        originYMm: 0,
        originZMm: 0,
      },
      back: {
        widthMm: 80,
        heightMm: 90,
        depthMm: 16,
        thicknessMm: 16,
        originXMm: 0,
        originYMm: 0,
        originZMm: -100,
      },
      externalWidthMm: 100,
      internalWidthMm: 68,
      usefulHeightMm: 144,
      runnerDepthMm: 450,
      bodyDepthMm: 440,
    } as DrawerGeometry;
    const r = runSafetyGeometryGate(geo);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "ORIGIN_NAN")).toBe(true);
  });

  it("drilling: bloqueia diametro NaN/negativo", () => {
    const holes: EuropeanDrawerHole[] = [
      {
        x: 10,
        y: 10,
        z: 0,
        diameter: -1,
        depth: 12,
        holeType: "corredica",
        face: "A",
        pieceRef: "gav_fren",
      },
      {
        x: NaN,
        y: 10,
        z: 0,
        diameter: 5,
        depth: 12,
        holeType: "corredica",
        face: "A",
        pieceRef: "gav_fun",
      },
    ];
    const r = runSafetyDrillingGate(holes);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "HOLE_DIA_INVALID")).toBe(true);
    expect(r.errors.some((e) => e.code === "HOLE_NAN")).toBe(true);
  });

  it("cutlist: bloqueia madeira sem codigo/nome", () => {
    const items: DrawerCutlistItem[] = [
      {
        id: "1",
        nome: "",
        codigo: "",
        quantidade: 1,
        larguraMm: 100,
        alturaMm: 100,
        profundidadeMm: 19,
        espessuraMm: 19,
        material: "m",
        kind: "wood",
        tipo: "gaveta_frente",
      },
    ];
    const r = runSafetyCutlistGate(items);
    expect(r.ok).toBe(false);
  });

  it("pdf: bloqueia linha incompleta", () => {
    const pdf: DrawerPDFSection = {
      title: "T",
      measureRows: [],
      pieceRows: [{ nome: "", qty: "1", dims: "1x1x1", material: "m" }],
      holeRows: [],
      notes: [],
      explodedViewNotes: [],
    };
    const r = runSafetyPdfGate(pdf);
    expect(r.ok).toBe(false);
  });

  it("viewer: bloqueia openProgress invalido", () => {
    const r = runSafetyViewerGate({
      drawers: [
        {
          id: "d0",
          index: 0,
          geometry: {
            systemId: "hettich-innotech-atira",
            front: {
              widthMm: 100,
              heightMm: 100,
              depthMm: 19,
              thicknessMm: 19,
              originXMm: 0,
              originYMm: 0,
              originZMm: 0,
            },
            bottom: {
              widthMm: 100,
              heightMm: 10,
              depthMm: 100,
              thicknessMm: 10,
              originXMm: 0,
              originYMm: 0,
              originZMm: 0,
            },
            leftSide: {
              widthMm: 16,
              heightMm: 100,
              depthMm: 400,
              thicknessMm: 16,
              originXMm: -50,
              originYMm: 0,
              originZMm: 0,
            },
            rightSide: {
              widthMm: 16,
              heightMm: 100,
              depthMm: 400,
              thicknessMm: 16,
              originXMm: 50,
              originYMm: 0,
              originZMm: 0,
            },
            back: {
              widthMm: 80,
              heightMm: 90,
              depthMm: 16,
              thicknessMm: 16,
              originXMm: 0,
              originYMm: 0,
              originZMm: -100,
            },
            externalWidthMm: 100,
            internalWidthMm: 68,
            usefulHeightMm: 144,
            runnerDepthMm: 450,
            bodyDepthMm: 440,
          },
          holes: [],
          openProgress: 2,
          maxPullMm: 100,
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "SCALE_INVALID")).toBe(true);
  });

  it("buildSafetyReport agrega status INVALID", () => {
    const report = buildSafetyReport([
      runSafetyConfigGate({ ...goodConfig, depthMm: 600 }, goodBox, model),
    ]);
    expect(report.status).toBe("INVALID");
    expect(formatSafetyReportText(report)).toContain("INVALID");
  });
});

describe("safety  resultados validos intactos", () => {
  it("generateEuropeanDrawer valido inclui safetyReport VALID", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const result = generateEuropeanDrawer("hettich-innotech-atira", goodBox, goodConfig);
    expect(result.valid).toBe(true);
    expect(result.safetyReport?.status).toBe("VALID");
    expect(result.cutlist.filter((i) => i.kind === "wood").length).toBeGreaterThan(0);
    expect(result.holes.length).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });
});
