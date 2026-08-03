/**
 * Catálogo único de tipos de furo industrial (SSOT).
 * Usado na Workspace de Design, geração cutlist/TXML e módulos existentes.
 */

import type { DrillType } from "../types";
import { defaultRulesConfig } from "../rules/rulesConfig";
import {
  CORNER_FF_EDGE_DOWEL_DEPTH_MM,
  CORNER_FF_FACE_DOWEL_DEPTH_MM,
} from "../cornerCabinet/cornerFixedFrontDowels";
import { DRILL_DOWEL_DIAMETER_MM } from "./drillConfig";
import { CAVILHA_10x40_FERRAGEM_ID } from "./cavilha10x40Rule";

/** Face de perfuração relativa à peça. */
export type HoleFaceKind = "espessura" | "face";

/** Uso industrial do tipo de furo. */
export type HoleUsageKind = "cavilha" | "dobradica" | "tecnico" | "parafuso" | "corredica" | "estrutural";

export type HoleTypeId =
  | "cavilha_10x30"
  | "cavilha_10x13"
  | "parafuso_4x19"
  | "dobradica_caneco"
  | "dobradica_fixacao_calco"
  | "dobradica_parafuso_uniao"
  | "tecnico_prateleira"
  | "corredica"
  | "corredica_marca"
  | "fixacao_estrutural"
  | "minifix";

export interface HoleType {
  id: HoleTypeId;
  nome: string;
  diametroMm: number;
  profundidadeMm: number;
  face: HoleFaceKind;
  uso: HoleUsageKind;
  /** Tipo DrillType usado no pipeline cutlist/TXML existente. */
  drillType: DrillType;
  /**
   * Para cavilhas: ID do furo complementar na peça oposta.
   * Ex.: cavilha_10x30 (espessura) ↔ cavilha_10x13 (face).
   */
  pairedHoleTypeId?: HoleTypeId;
  /** Ferragem física gerada por cada par (CAVILHA_10x40). */
  ferragemId?: string;
}

const t = defaultRulesConfig.furos.tecnicos;

/** Catálogo industrial completo — alinhado com rulesConfig.furos.tecnicos. */
export const HOLE_CATALOG: readonly HoleType[] = [
  {
    id: "cavilha_10x30",
    nome: "Cavilha vinculada Ø10 × 30 mm (espessura)",
    diametroMm: DRILL_DOWEL_DIAMETER_MM,
    profundidadeMm: CORNER_FF_EDGE_DOWEL_DEPTH_MM,
    face: "espessura",
    uso: "cavilha",
    drillType: "cavilha",
    pairedHoleTypeId: "cavilha_10x13",
    ferragemId: CAVILHA_10x40_FERRAGEM_ID,
  },
  {
    id: "cavilha_10x13",
    nome: "Cavilha vinculada Ø10 × 13 mm (face)",
    diametroMm: DRILL_DOWEL_DIAMETER_MM,
    profundidadeMm: CORNER_FF_FACE_DOWEL_DEPTH_MM,
    face: "face",
    uso: "cavilha",
    drillType: "cavilha",
    pairedHoleTypeId: "cavilha_10x30",
    ferragemId: CAVILHA_10x40_FERRAGEM_ID,
  },
  {
    id: "parafuso_4x19",
    nome: "Parafuso Ø5 × 19 mm",
    diametroMm: t.parafuso.diametro,
    profundidadeMm: t.parafuso.profundidade,
    face: "espessura",
    uso: "parafuso",
    drillType: "parafuso",
  },
  {
    id: "dobradica_caneco",
    nome: "Dobradiça — caneco (Ø35 × 13 mm)",
    diametroMm: t.dobradica.diametro,
    profundidadeMm: t.dobradica.profundidade,
    face: "face",
    uso: "dobradica",
    drillType: "dobradica",
  },
  {
    id: "dobradica_fixacao_calco",
    nome: "Dobradiça — fixação calço (Ø5 × 12 mm)",
    diametroMm: t.dobradica_fixacao.diametro,
    profundidadeMm: t.dobradica_fixacao.profundidadeFuro,
    face: "face",
    uso: "dobradica",
    drillType: "dobradica_fixacao",
  },
  {
    id: "dobradica_parafuso_uniao",
    nome: "Dobradiça — parafuso união (marca Ø5)",
    diametroMm: t.dobradica_fixacao.diametroParafusoUniao,
    profundidadeMm: t.dobradica_fixacao.profundidadeParafusoUniao,
    face: "face",
    uso: "dobradica",
    drillType: "dobradica_parafuso_uniao",
  },
  {
    id: "tecnico_prateleira",
    nome: "Furo técnico prateleira (Ø5 × 13 mm)",
    diametroMm: t.prateleira.diametro,
    profundidadeMm: t.prateleira.profundidade,
    face: "face",
    uso: "tecnico",
    drillType: "prateleira",
  },
  {
    id: "corredica",
    nome: "Corrediça (Ø5 × 1 mm)",
    diametroMm: t.corredica.diametro,
    profundidadeMm: t.corredica.profundidade,
    face: "face",
    uso: "corredica",
    drillType: "corredica",
  },
  {
    id: "corredica_marca",
    nome: "Corrediça — marca (Ø5 × 1 mm)",
    diametroMm: t.corredica.diametro,
    profundidadeMm: t.corredica.profundidadeMark ?? t.corredica.profundidade,
    face: "face",
    uso: "corredica",
    drillType: "corredica",
  },
  {
    id: "fixacao_estrutural",
    nome: "Fixação estrutural (Ø10)",
    diametroMm: 10,
    profundidadeMm: 10,
    face: "espessura",
    uso: "estrutural",
    drillType: "fixacao_estrutural",
  },
  {
    id: "minifix",
    nome: "Minifix",
    diametroMm: 15,
    profundidadeMm: 12,
    face: "espessura",
    uso: "estrutural",
    drillType: "minifix",
  },
] as const;

const HOLE_CATALOG_BY_ID = new Map<HoleTypeId, HoleType>(
  HOLE_CATALOG.map((entry) => [entry.id, entry])
);

export function getHoleTypeById(id: HoleTypeId): HoleType {
  const entry = HOLE_CATALOG_BY_ID.get(id);
  if (!entry) throw new Error(`Tipo de furo desconhecido: ${id}`);
  return entry;
}

export function tryGetHoleTypeById(id: string): HoleType | undefined {
  return HOLE_CATALOG_BY_ID.get(id as HoleTypeId);
}

export function getPairedHoleTypeId(id: HoleTypeId): HoleTypeId | undefined {
  return getHoleTypeById(id).pairedHoleTypeId;
}

export function listHoleTypesByUsage(uso: HoleUsageKind): HoleType[] {
  return HOLE_CATALOG.filter((entry) => entry.uso === uso);
}

export function holeTypeToDrillType(id: HoleTypeId): DrillType {
  return getHoleTypeById(id).drillType;
}
