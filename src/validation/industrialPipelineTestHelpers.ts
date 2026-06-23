/**
 * Fixture partilhado — Fase E certificação pipeline industrial A→D.
 * Apenas testes; não altera código de produção.
 */

import {
  defaultDivisorItem,
  defaultSeparadorItem,
  makeDivSepTestBox,
} from "../core/divSep/divSepTestHelpers";
import { createRematePieces } from "../core/remate/rematePieceFactory";
import { createRodapesForBox } from "../core/rodape/rodapeFactory";
import {
  buildDrawerScenario,
  minimalBoxWithDrawers,
} from "./drawerCertificationTestHelpers";
import type { IndustrialExportProjectSnapshot } from "../core/fabrication/buildCutlistItemsForIndustrialExport";
import type { BoxModule, CutListItemComPreco } from "../core/types";
import type { DoorLayerItem } from "../models/BoxLayers";
import type { RematePiece } from "../core/remate/rematePieceTypes";
import type { ProjectRodape } from "../core/rodape/rodapeTypes";
import { defaultRulesConfig } from "../core/rules/rulesConfig";

export const FULL_INDUSTRIAL_BOX_ID = "box-full-pipeline";
export const FULL_INDUSTRIAL_BOX_NOME = "Armario_Full";
export const FULL_INDUSTRIAL_PROJECT = "NP260621";

export type FullIndustrialScenario = {
  snap: IndustrialExportProjectSnapshot;
  box: BoxModule;
  wsBox: import("../core/types").WorkspaceBox;
  remates: RematePiece[];
  rodapes: ProjectRodape[];
};

export function buildFullIndustrialScenario(): FullIndustrialScenario {
  const { layers } = buildDrawerScenario({
    boxWidth: 600,
    boxHeight: 720,
    boxDepth: 560,
    drawerCount: 1,
    boxId: FULL_INDUSTRIAL_BOX_ID,
  });

  const box = makeDivSepTestBox({
    id: FULL_INDUSTRIAL_BOX_ID,
    nome: FULL_INDUSTRIAL_BOX_NOME,
    divisores: [defaultDivisorItem({ id: "div-full-1" })],
    separadores: [defaultSeparadorItem({ id: "sep-full-1" })],
    gavetas: 1,
    drawersLayer: layers,
    portaTipo: "sem_porta",
  });

  const wsBox = {
    ...box,
    drawersLayer: layers,
    posicaoX_mm: 0,
    posicaoY_mm: 0,
    posicaoZ_mm: 0,
    rotacaoY_90: false,
    rotacaoY: 0,
  } as import("../core/types").WorkspaceBox;

  const remates = createRematePieces(
    {
      productType: "COMPLETO",
      mountSlot: "DIR",
      parentBoxId: FULL_INDUSTRIAL_BOX_ID,
      followBox: true,
    },
    {
      box: wsBox,
      materialPresetId: "mdf_branco",
      thicknessMm: 19,
      boxDimsM: { widthM: 0.6, heightM: 0.72, depthM: 0.56 },
    }
  );

  const rodapes = createRodapesForBox({
    box: wsBox,
    allBoxes: [wsBox],
    room: null,
    roomBoundsM: null,
    input: { kind: "SIMPLE", parentBoxId: FULL_INDUSTRIAL_BOX_ID },
    materialId: "mdf_branco",
    thicknessMm: 19,
    heightMm: 100,
    existingCount: 0,
  });

  const snap: IndustrialExportProjectSnapshot = {
    boxes: [box],
    rules: defaultRulesConfig,
    materialId: "mdf_branco",
    projectName: FULL_INDUSTRIAL_PROJECT,
    remates,
    rodapes,
  };

  return { snap, box, wsBox, remates, rodapes };
}

export function buildDoorGrainRegressionBox(): BoxModule {
  return makeDivSepTestBox({
    id: "box-door-regression",
    nome: "Porta_Box",
    portaTipo: "porta_simples",
    gavetas: 0,
    divisores: [],
    separadores: [],
  });
}

export const REAL_WORLD_BENCH_BOX_ID = "box-realworld-bench";
export const REAL_WORLD_BENCH_NOME = "Roupeiro_RealBench";
export const REAL_WORLD_BENCH_PROJECT = "NP260621RB";

/**
 * Cenário de benchmark — roupeiro 900×2100 com porta, 3 gavetas, 2 divisores,
 * 3 prateleiras (separadores), costa, remate e rodapé. Tipicamente 26–32 peças.
 */
export function buildRealWorldBenchmarkScenario(): FullIndustrialScenario {
  const boxW = 900;
  const boxH = 2100;
  const boxD = 560;

  const { layers } = buildDrawerScenario({
    boxWidth: boxW,
    boxHeight: boxH,
    boxDepth: boxD,
    drawerCount: 3,
    boxId: REAL_WORLD_BENCH_BOX_ID,
    heightMode: "top_small_mid_medium_bottom_large",
  });

  const doorLayer: DoorLayerItem = {
    id: "door-rw-1",
    parentBoxId: REAL_WORLD_BENCH_BOX_ID,
    width: boxW - 6,
    height: boxH - 36,
    thickness: 19,
    materialId: "carvalho",
    material: "carvalho",
    openDirection: "left",
    isOpen: false,
    hingeSide: "left",
    pivot: "left-edge",
    posX: 0,
    posY: 0,
    posZ: boxD / 2,
    rotY: 0,
  };

  const box = makeDivSepTestBox({
    id: REAL_WORLD_BENCH_BOX_ID,
    nome: REAL_WORLD_BENCH_NOME,
    dimensoes: { largura: boxW, altura: boxH, profundidade: boxD },
    divisores: [
      defaultDivisorItem({ id: "div-rw-1", positionMm: 295 }),
      defaultDivisorItem({ id: "div-rw-2", positionMm: 597 }),
    ],
    separadores: [
      defaultSeparadorItem({ id: "sep-rw-1", positionMm: 520, referenceEdge: "bottom" }),
      defaultSeparadorItem({ id: "sep-rw-2", positionMm: 1050, referenceEdge: "bottom" }),
      defaultSeparadorItem({ id: "sep-rw-3", positionMm: 1580, referenceEdge: "bottom" }),
    ],
    gavetas: 3,
    drawersLayer: layers,
    portaTipo: "porta_simples",
    doorsLayer: [doorLayer],
    costaAtiva: true,
  });

  const wsBox = {
    ...box,
    drawersLayer: layers,
    material: "mdf_branco",
    posicaoX_mm: 0,
    posicaoY_mm: 0,
    posicaoZ_mm: 0,
    rotacaoY_90: false,
    rotacaoY: 0,
  } as import("../core/types").WorkspaceBox;

  const remates = createRematePieces(
    {
      productType: "COMPLETO",
      mountSlot: "DIR",
      parentBoxId: REAL_WORLD_BENCH_BOX_ID,
      followBox: true,
    },
    {
      box: wsBox,
      materialPresetId: "carvalho",
      thicknessMm: 19,
      boxDimsM: { widthM: boxW / 1000, heightM: boxH / 1000, depthM: boxD / 1000 },
    }
  );

  const rodapes = createRodapesForBox({
    box: wsBox,
    allBoxes: [wsBox],
    room: null,
    roomBoundsM: null,
    input: { kind: "SIMPLE", parentBoxId: REAL_WORLD_BENCH_BOX_ID },
    materialId: "mdf_branco",
    thicknessMm: 19,
    heightMm: 100,
    existingCount: 0,
  });

  const snap: IndustrialExportProjectSnapshot = {
    boxes: [box],
    rules: defaultRulesConfig,
    materialId: "mdf_branco",
    projectName: REAL_WORLD_BENCH_PROJECT,
    remates,
    rodapes,
  };

  return { snap, box, wsBox, remates, rodapes };
}

/** Materiais mistos (19 mm): carvalho em frentes/porta/remate; MDF branco no corpo. */
export function applyRealWorldMixedMaterials(items: CutListItemComPreco[]): CutListItemComPreco[] {
  return items.map((item) => {
    const tipo = String(item.tipo ?? "");
    if (tipo === "porta_simples" || tipo === "gaveta_frente_ext" || tipo === "gaveta_frente" || tipo === "remate") {
      return { ...item, materialId: "carvalho", material: "carvalho" };
    }
    return {
      ...item,
      materialId: item.materialId ?? "mdf_branco",
      material: item.material ?? "mdf_branco",
    };
  });
}

export const MONO19_BENCH_BOX_ID = "box-mono19-bench";
export const MONO19_BENCH_NOME = "Cozinha_Mono19";
export const MONO19_BENCH_PROJECT = "NP260621M19";

const MONO19_DRAWER_SETTINGS = {
  gavetaEspessuraFrenteMm: 19,
  gavetaEspessuraLateralMm: 19,
  gavetaEspessuraTraseiraMm: 19,
  gavetaEspessuraFundoMm: 19,
} as const;

/**
 * Benchmark mono-espessura 19 mm — sem costa 10 mm, mix fragmentado (gavetas + prateleiras + divisores).
 * Objectivo: stress de consolidação numa única chapa/grupo de chapas 19 mm.
 */
export function buildMono19BenchmarkScenario(): FullIndustrialScenario {
  const boxW = 800;
  const boxH = 1800;
  const boxD = 560;

  const { layers } = buildDrawerScenario({
    boxWidth: boxW,
    boxHeight: boxH,
    boxDepth: boxD,
    drawerCount: 4,
    boxId: MONO19_BENCH_BOX_ID,
    heightMode: "top_small_mid_medium_bottom_large",
    drawerSettingsOverrides: MONO19_DRAWER_SETTINGS,
  });

  const box = makeDivSepTestBox({
    id: MONO19_BENCH_BOX_ID,
    nome: MONO19_BENCH_NOME,
    dimensoes: { largura: boxW, altura: boxH, profundidade: boxD },
    divisores: [
      defaultDivisorItem({ id: "div-m19-1", positionMm: 265 }),
      defaultDivisorItem({ id: "div-m19-2", positionMm: 531 }),
    ],
    separadores: [
      defaultSeparadorItem({ id: "sep-m19-1", positionMm: 450, referenceEdge: "bottom" }),
      defaultSeparadorItem({ id: "sep-m19-2", positionMm: 900, referenceEdge: "bottom" }),
      defaultSeparadorItem({ id: "sep-m19-3", positionMm: 1250, referenceEdge: "bottom" }),
      defaultSeparadorItem({ id: "sep-m19-4", positionMm: 1550, referenceEdge: "bottom" }),
    ],
    gavetas: 4,
    drawersLayer: layers,
    portaTipo: "sem_porta",
    doorsLayer: [],
    costaAtiva: false,
  });

  const wsBox = {
    ...box,
    drawersLayer: layers,
    material: "mdf_branco",
    posicaoX_mm: 0,
    posicaoY_mm: 0,
    posicaoZ_mm: 0,
    rotacaoY_90: false,
    rotacaoY: 0,
  } as import("../core/types").WorkspaceBox;

  const remates = createRematePieces(
    {
      productType: "COMPLETO",
      mountSlot: "ESQ",
      parentBoxId: MONO19_BENCH_BOX_ID,
      followBox: true,
    },
    {
      box: wsBox,
      materialPresetId: "mdf_branco",
      thicknessMm: 19,
      boxDimsM: { widthM: boxW / 1000, heightM: boxH / 1000, depthM: boxD / 1000 },
    }
  );

  const rodapes = createRodapesForBox({
    box: wsBox,
    allBoxes: [wsBox],
    room: null,
    roomBoundsM: null,
    input: { kind: "SIMPLE", parentBoxId: MONO19_BENCH_BOX_ID },
    materialId: "mdf_branco",
    thicknessMm: 19,
    heightMm: 100,
    existingCount: 0,
  });

  const snap: IndustrialExportProjectSnapshot = {
    boxes: [box],
    rules: defaultRulesConfig,
    materialId: "mdf_branco",
    projectName: MONO19_BENCH_PROJECT,
    remates,
    rodapes,
  };

  return { snap, box, wsBox, remates, rodapes };
}

/** Normaliza export mono-19: só peças 19 mm, material único, sem costa. */
export function applyMono19BenchmarkMaterials(items: CutListItemComPreco[]): CutListItemComPreco[] {
  return items
    .filter((item) => {
      const tipo = String(item.tipo ?? "").toLowerCase();
      if (tipo === "costa") return false;
      const t = Math.round(Number(item.espessura ?? item.dimensoes?.profundidade ?? 19));
      return t === 19;
    })
    .map((item) => ({
      ...item,
      materialId: "mdf_branco",
      material: "mdf_branco",
      espessura: 19,
    }));
}

export function buildDrawerOnlyBox(): BoxModule {
  const { layers } = buildDrawerScenario({
    boxWidth: 600,
    boxHeight: 600,
    boxDepth: 560,
    drawerCount: 1,
  });
  return minimalBoxWithDrawers(layers, { id: "box-drawer-regression", nome: "Gaveta_Box" });
}

/** Espelho simplificado de inferPieceKind (pdfEtiquetas) para QA. */
export function inferIndustrialPieceKind(item: {
  tipo?: string;
  nome?: string;
}): string {
  const tipo = String(item.tipo ?? "").toLowerCase();
  const nome = String(item.nome ?? "").toUpperCase();
  if (tipo === "remate" || nome.includes("_REMATE_")) return "REMATE";
  if (tipo === "rodape" || nome.includes("_RODA_PE_")) return "RODAPE";
  if (tipo === "gaveta_frente_ext" || tipo === "gaveta_frente_int" || tipo === "gaveta_frente") return "FRENTE_GAVETA";
  if (tipo === "porta_simples" || tipo === "porta_dupla" || tipo === "porta_correr") return "PORTA";
  if (tipo === "divisorio" || nome.includes("_DIV_")) return "DIV";
  if (tipo === "separador" || nome.includes("_SEP_")) return "SEP";
  return "GENERIC";
}
