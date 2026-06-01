/**
 * Motor de sequência de produção v5 (etiquetas).
 * Fase 2 — sem integração com PDF, QR ou cutlist.
 */

import type { LabelConfig } from "./labelConfig";

export interface PieceProductionSequence {
  nisting: number | null;
  manual: number | null;
  orlar: number | null;
  drill: number | null;
  limpezas: number | null;
  montagem: number | null;
  embalagem: number | null;
  paletteGroup: string;
  orlarSides: { front: boolean; back: boolean; right: boolean; left: boolean };
  /** F2, F3, F4, F5 — distâncias de furação por face (mm). */
  drillDistances: [number, number, number, number] | null;
}

/** Categoria v5 para routing de sequência. */
export type PieceProductionKind =
  | "FUNDO"
  | "CIMA"
  | "PRATELEIRA"
  | "FRENTE_GAVETA"
  | "REMATE"
  | "RODAPE"
  | "LATERAL"
  | "GAV_LATERAIS"
  | "GAV_TRAS"
  | "LATERAIS_COM_LED"
  | "FUNDO_COM_SENSOR"
  | "CNC"
  | "LAMINACAO"
  | "GENERIC";

export interface PieceOrlaSidesInput {
  front?: boolean;
  back?: boolean;
  left?: boolean;
  right?: boolean;
}

/** Entrada alinhada a ProjectState.orlaPieces (lados enabled). */
export interface PieceOrlaConfigInput {
  sides?: Partial<
    Record<"front" | "back" | "left" | "right", { enabled?: boolean } | undefined>
  >;
}

export interface PieceDrillHoleInput {
  x: number;
  y: number;
}

export interface PieceData {
  name: string;
  kind: PieceProductionKind;
  thicknessMm: number;
  /** Se existe ficheiro DRILL exportado para esta peça. */
  hasDrillFile?: boolean;
  /** Lados orlados (booleanos directos). */
  orlaSides?: PieceOrlaSidesInput;
  /** Config orla (ex.: derivada de ProjectState.orlaPieces). */
  orlaPieceConfig?: PieceOrlaConfigInput;
  drillHoles?: PieceDrillHoleInput[];
  /** Largura e altura da peça (mm) — necessárias para F2–F5. */
  widthMm?: number;
  heightMm?: number;
}

type ProductionStepKey =
  | "nisting"
  | "manual"
  | "orlar"
  | "drill"
  | "limpezas"
  | "montagem"
  | "embalagem";

const ORLAR_FIRST_KINDS: ReadonlySet<PieceProductionKind> = new Set([
  "FUNDO",
  "CIMA",
  "PRATELEIRA",
  "FRENTE_GAVETA",
  "REMATE",
  "RODAPE",
]);

const DRILL_BEFORE_ORLAR_KINDS: ReadonlySet<PieceProductionKind> = new Set([
  "LATERAL",
  "GAV_LATERAIS",
  "GAV_TRAS",
]);

const ORLAR_DRILL_ORLAR_KINDS: ReadonlySet<PieceProductionKind> = new Set([
  "LATERAIS_COM_LED",
  "FUNDO_COM_SENSOR",
]);

function normalizeName(name: string): string {
  return String(name ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function isManualPiece(piece: PieceData, config: LabelConfig): boolean {
  const n = normalizeName(piece.name);
  return config.manualPieceNames.some((m) => normalizeName(m) === n);
}

function shouldSkipOrlar(piece: PieceData, config: LabelConfig): boolean {
  return piece.thicknessMm <= config.noOrlarThickness_mm;
}

function usesDrillBeforeOrlar(piece: PieceData): boolean {
  if (piece.hasDrillFile) return true;
  return DRILL_BEFORE_ORLAR_KINDS.has(piece.kind);
}

function usesOrlarDrillOrlarCycle(piece: PieceData): boolean {
  return ORLAR_DRILL_ORLAR_KINDS.has(piece.kind);
}

function usesOrlarDirectAfterNisting(piece: PieceData): boolean {
  return ORLAR_FIRST_KINDS.has(piece.kind);
}

function resolveBaseSequence(piece: PieceData, config: LabelConfig): ProductionStepKey[] {
  if (isManualPiece(piece, config)) {
    return ["manual"];
  }

  const skipOrlar = shouldSkipOrlar(piece, config);
  const steps: ProductionStepKey[] = ["nisting"];

  // Grupo C — CNC
  if (piece.kind === "CNC") {
    steps.push("limpezas", "montagem", "embalagem");
    return steps;
  }

  // Grupo L — laminação/colagem primeiro
  if (piece.kind === "LAMINACAO") {
    if (!skipOrlar) steps.push("orlar");
    steps.push("limpezas", "montagem", "embalagem");
    return steps;
  }

  // Grupo OD — Orlar → Drill → Orlar
  if (usesOrlarDrillOrlarCycle(piece)) {
    if (!skipOrlar) steps.push("orlar");
    steps.push("drill");
    if (!skipOrlar) steps.push("orlar");
    steps.push("limpezas", "montagem", "embalagem");
    return steps;
  }

  // Grupo D — Drill antes de Orlar
  if (usesDrillBeforeOrlar(piece)) {
    steps.push("drill");
    if (!skipOrlar) steps.push("orlar");
    steps.push("limpezas", "montagem", "embalagem");
    return steps;
  }

  // Grupo O — Orlar directo após Nisting
  if (usesOrlarDirectAfterNisting(piece)) {
    if (!skipOrlar) steps.push("orlar");
    steps.push("limpezas", "montagem", "embalagem");
    return steps;
  }

  // GENERIC: Orlar se permitido, senão limpezas directo (grupo E)
  if (!skipOrlar) steps.push("orlar");
  steps.push("limpezas", "montagem", "embalagem");
  return steps;
}

function resolvePaletteGroup(piece: PieceData, steps: ProductionStepKey[]): string {
  if (piece.kind === "CNC") return "C";
  if (piece.kind === "LAMINACAO") return "L";
  if (usesOrlarDrillOrlarCycle(piece)) return "OD";

  const firstOrlar = steps.indexOf("orlar");
  const firstDrill = steps.indexOf("drill");

  if (firstDrill >= 0 && firstOrlar >= 0) {
    return firstDrill < firstOrlar ? "D" : "OD";
  }
  if (firstDrill >= 0 && firstOrlar < 0) return "D";
  if (firstOrlar >= 0 && firstDrill < 0) return "O";
  return "E";
}

function resolveOrlarSides(
  piece: PieceData
): PieceProductionSequence["orlarSides"] {
  const cfg = piece.orlaPieceConfig?.sides;
  if (cfg) {
    return {
      front: Boolean(cfg.front?.enabled),
      back: Boolean(cfg.back?.enabled),
      right: Boolean(cfg.right?.enabled),
      left: Boolean(cfg.left?.enabled),
    };
  }
  if (piece.orlaSides) {
    return {
      front: piece.orlaSides.front ?? false,
      back: piece.orlaSides.back ?? false,
      right: piece.orlaSides.right ?? false,
      left: piece.orlaSides.left ?? false,
    };
  }
  return { front: false, back: false, right: false, left: false };
}

function resolveDrillDistances(
  piece: PieceData
): [number, number, number, number] | null {
  if (!piece.drillHoles?.length) return null;
  const w = piece.widthMm ?? 0;
  const h = piece.heightMm ?? 0;
  if (w <= 0 || h <= 0) return null;

  let f2 = Infinity;
  let f3 = Infinity;
  let f4 = Infinity;
  let f5 = Infinity;

  for (const hole of piece.drillHoles) {
    f2 = Math.min(f2, h - hole.y);
    f3 = Math.min(f3, hole.y);
    f4 = Math.min(f4, hole.x);
    f5 = Math.min(f5, w - hole.x);
  }

  const toMm = (v: number) => (Number.isFinite(v) ? Math.round(v) : 0);
  return [toMm(f2), toMm(f3), toMm(f4), toMm(f5)];
}

type StepNumbers = Pick<
  PieceProductionSequence,
  "nisting" | "manual" | "orlar" | "drill" | "limpezas" | "montagem" | "embalagem"
>;

function assignStepNumbers(steps: ProductionStepKey[]): StepNumbers {
  const result: StepNumbers = {
    nisting: null,
    manual: null,
    orlar: null,
    drill: null,
    limpezas: null,
    montagem: null,
    embalagem: null,
  };

  let order = 1;
  for (const step of steps) {
    if (step === "orlar" && result.orlar != null) {
      order += 1;
      continue;
    }
    if (result[step] == null) {
      result[step] = order;
    }
    order += 1;
  }

  return result;
}

export function computePieceSequence(
  piece: PieceData,
  config: LabelConfig
): PieceProductionSequence {
  if (isManualPiece(piece, config)) {
    return {
      nisting: null,
      manual: 1,
      orlar: null,
      drill: null,
      limpezas: null,
      montagem: null,
      embalagem: null,
      paletteGroup: "E",
      orlarSides: resolveOrlarSides(piece),
      drillDistances: resolveDrillDistances(piece),
    };
  }

  const steps = resolveBaseSequence(piece, config);
  const numbers = assignStepNumbers(steps);

  return {
    ...numbers,
    paletteGroup: resolvePaletteGroup(piece, steps),
    orlarSides: resolveOrlarSides(piece),
    drillDistances: resolveDrillDistances(piece),
  };
}
