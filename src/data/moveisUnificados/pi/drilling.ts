import type { DrillType, PanelDrillHole } from "../../../core/types";
import { PI_MODEL_DEFAULT_SETTINGS, clampPiNumeroGavetas, type PiModelSettings } from "./settings";

type PiLateralSide = "left" | "right";

type PiDrawerLayout = {
  frontHeightsMm: number[];
  runnerLinesYMm: number[];
};

export type PiLateralDrillingInput = {
  alturaMm: number;
  profundidadeMm: number;
  side: PiLateralSide;
  /** Número de linhas de corrediça: sempre a partir do modelo PI (settings), nunca de drawersLayer. */
  numeroGavetasParaCorrediça: number;
  /**
   * Só afeta corrediça. Grelha 32 mm (prateleira) e furos de dobradiça seguem só `ativarFuracao*` do modelo.
   */
  piHideDrawerHoles: boolean;
  /** Preferências PI (merge com defaults dentro de buildPiUniversalLateralDrilling). */
  piSettings: Partial<PiModelSettings> | PiModelSettings;
};

const GRID_STEP_MM = 32;
const GRID_FRONT_OFFSET_X_MM = 37;
const GRID_BACK_OFFSET_X_MM = 37;
const FULL_HOLE_DEPTH_MM = 11;
const MARK_HOLE_DEPTH_MM = 0.8;

const SLIDE_HOLES_X = {
  front: 37,
  mark: 69,
  rear: 293,
} as const;

const DRAWER_FRONT_BASE_HEIGHTS_MM = [122, 178, 350, 350] as const;
const HINGE_TARGETS_MM = [100, 400, 700] as const;

const roundToNearestGrid = (value: number) => Math.round(value / GRID_STEP_MM) * GRID_STEP_MM;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function mergePiSettings(partial: Partial<PiModelSettings> | PiModelSettings): PiModelSettings {
  return {
    ...PI_MODEL_DEFAULT_SETTINGS,
    ...partial,
    numeroGavetas: clampPiNumeroGavetas(
      partial?.numeroGavetas ?? PI_MODEL_DEFAULT_SETTINGS.numeroGavetas
    ),
  };
}

/** Paridade com `toPanelDrillHoles` (drillingAdapter) para TCN / layout. */
function isPiHoleTopDrillableForTcn(holeType: DrillType): boolean {
  return (
    holeType === "dobradica" ||
    holeType === "dobradica_fixacao" ||
    holeType === "dobradica_parafuso_uniao" ||
    holeType === "prateleira" ||
    holeType === "corredica"
  );
}

function addHole(
  holes: PanelDrillHole[],
  x: number,
  y: number,
  depth: number,
  holeType: DrillType,
  face: "A" | "B" = "B"
) {
  holes.push({
    x,
    y,
    diameter: 5,
    depth,
    holeType,
    face,
    topDrillable: isPiHoleTopDrillableForTcn(holeType),
  });
}

function getDrawerLayout(alturaMm: number, numeroGavetas: number): PiDrawerLayout {
  const qty = clamp(Math.round(numeroGavetas), 1, 4);
  const usefulHeight = Math.max(1, alturaMm - 8); // topo 2 + base 2 + 2 gaps entre frentes
  const base = DRAWER_FRONT_BASE_HEIGHTS_MM.slice(0, qty);
  const baseSum = base.reduce((sum, h) => sum + h, 0);
  const ratio = usefulHeight / Math.max(1, baseSum);
  const scaled = base.map((h) => h * ratio);

  let cursor = 2;
  const centers = scaled.map((h) => {
    const center = cursor + h / 2;
    cursor += h + 2;
    return center;
  });

  const runnerLines = centers.map((centerY) =>
    clamp(roundToNearestGrid(centerY), GRID_STEP_MM, Math.max(GRID_STEP_MM, alturaMm - GRID_STEP_MM))
  );

  return {
    frontHeightsMm: scaled.map((h) => Math.round(h)),
    runnerLinesYMm: runnerLines,
  };
}

function getGridYPositions(alturaMm: number): number[] {
  const y: number[] = [];
  for (let pos = GRID_STEP_MM; pos <= alturaMm - GRID_STEP_MM; pos += GRID_STEP_MM) {
    y.push(pos);
  }
  return y;
}

function getGridXPositions(profundidadeMm: number, side: PiLateralSide): [number, number] {
  const front = side === "left"
    ? profundidadeMm - GRID_FRONT_OFFSET_X_MM
    : GRID_FRONT_OFFSET_X_MM;
  const back = side === "left"
    ? GRID_BACK_OFFSET_X_MM
    : profundidadeMm - GRID_BACK_OFFSET_X_MM;
  return [front, back];
}

function addUniversalGridHoles(holes: PanelDrillHole[], alturaMm: number, profundidadeMm: number, side: PiLateralSide) {
  const ys = getGridYPositions(alturaMm);
  const [xFront, xBack] = getGridXPositions(profundidadeMm, side);
  for (const y of ys) {
    addHole(holes, xFront, y, FULL_HOLE_DEPTH_MM, "prateleira");
    addHole(holes, xBack, y, FULL_HOLE_DEPTH_MM, "prateleira");
  }
}

function addHingeGridHoles(holes: PanelDrillHole[], alturaMm: number, profundidadeMm: number, side: PiLateralSide) {
  const [xFront] = getGridXPositions(profundidadeMm, side);
  for (const rawY of HINGE_TARGETS_MM) {
    const y = clamp(roundToNearestGrid(rawY), GRID_STEP_MM, Math.max(GRID_STEP_MM, alturaMm - GRID_STEP_MM));
    addHole(holes, xFront, y, FULL_HOLE_DEPTH_MM, "dobradica_fixacao");
  }
}

function addDrawerSlideHoles(
  holes: PanelDrillHole[],
  runnerLinesYMm: number[],
  profundidadeMm: number,
  side: PiLateralSide
) {
  for (const y of runnerLinesYMm) {
    const xFront = side === "left" ? profundidadeMm - SLIDE_HOLES_X.front : SLIDE_HOLES_X.front;
    const xMark = side === "left" ? profundidadeMm - SLIDE_HOLES_X.mark : SLIDE_HOLES_X.mark;
    const xRear = side === "left" ? profundidadeMm - SLIDE_HOLES_X.rear : SLIDE_HOLES_X.rear;
    addHole(holes, xFront, y, FULL_HOLE_DEPTH_MM, "corredica");
    addHole(holes, xMark, y, MARK_HOLE_DEPTH_MM, "corredica");
    addHole(holes, xRear, y, FULL_HOLE_DEPTH_MM, "corredica");
  }
}

export function buildPiDrawerLayoutForFronts(alturaMm: number, numeroGavetas: number): PiDrawerLayout {
  return getDrawerLayout(alturaMm, numeroGavetas);
}

export function buildPiUniversalLateralDrilling(input: PiLateralDrillingInput): PanelDrillHole[] {
  const holes: PanelDrillHole[] = [];
  const s = mergePiSettings(input.piSettings);
  const nCorredica = clampPiNumeroGavetas(
    Number.isFinite(input.numeroGavetasParaCorrediça)
      ? input.numeroGavetasParaCorrediça
      : s.numeroGavetas
  );
  const layout = getDrawerLayout(input.alturaMm, nCorredica);

  // Malha base 32 mm (tipo prateleira): parte fixa do módulo PI; independente de prateleiras/portas na UI.
  if (s.ativarFuracaoPrateleiras) {
    addUniversalGridHoles(holes, input.alturaMm, input.profundidadeMm, input.side);
  }

  // Furos de dobradiça nas posições PI: base do módulo; independente de portaTipo / doorsLayer.
  if (s.ativarFuracaoDobradicas) {
    addHingeGridHoles(holes, input.alturaMm, input.profundidadeMm, input.side);
  }

  // Corrediça: sempre que ativo e não oculto; padrão só do modelo PI (nunca drawersLayer).
  if (s.ativarFuracaoGavetas && !input.piHideDrawerHoles) {
    addDrawerSlideHoles(holes, layout.runnerLinesYMm, input.profundidadeMm, input.side);
  }

  return holes;
}

