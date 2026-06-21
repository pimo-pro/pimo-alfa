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
import type { BoxModule } from "../core/types";
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
  if (tipo === "gaveta_frente") return "FRENTE_GAVETA";
  if (tipo === "porta_simples" || tipo === "porta_dupla" || tipo === "porta_correr") return "PORTA";
  if (tipo === "divisorio" || nome.includes("_DIV_")) return "DIV";
  if (tipo === "separador" || nome.includes("_SEP_")) return "SEP";
  return "GENERIC";
}
