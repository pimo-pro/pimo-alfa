import type { DrillType, PanelDrillHole } from "../../../core/types";
import {
  computePiModuleLateralCorredicaHoles,
  getDrawerSlideDrillingRules,
  resolvePiDrawerCountForDrilling,
  resolvePiRunnerLinesYMm,
} from "../../../core/drawers/drilling/DrawerDrillingRules";
import { getSettings } from "../../../core/settings/settingsService";
import {
  PI_CORREDICA_DRILL_LINE_COUNT,
  PI_MODEL_DEFAULT_SETTINGS,
  clampPiNumeroGavetas,
  type PiModelSettings,
} from "./settings";

type PiLateralSide = "left" | "right";

type PiDrawerLayout = {
  frontHeightsMm: number[];
  runnerLinesYMm: number[];
};

export type PiLateralDrillingInput = {
  alturaMm: number;
  profundidadeMm: number;
  side: PiLateralSide;
  /**
   * Só afeta corrediça (todas as linhas). Grelha 32 mm e dobradiça seguem só `ativarFuracao*` do modelo.
   */
  piHideDrawerHoles: boolean;
  /** Preferências PI (merge com defaults dentro de buildPiUniversalLateralDrilling). */
  piSettings: Partial<PiModelSettings> | PiModelSettings;
  /** FASE 3: contagem oficial quando pipeline moderno ativo. */
  drawersLayerCount?: number;
  slideType?: string;
  metalBoxType?: string;
  softClose?: boolean;
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
  const usefulHeight = Math.max(1, alturaMm - 8);
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

/** Legado PI — offsets fixos 37/69/293 mm (comportamento pré-FASE 3). */
function addDrawerSlideHolesLegacy(
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

function addDrawerSlideHolesUnified(
  holes: PanelDrillHole[],
  runnerLinesYMm: number[],
  profundidadeMm: number,
  side: PiLateralSide,
  slideType?: string,
  metalBoxType?: string,
  softClose?: boolean
) {
  const gavetas = getSettings().gavetas;
  const rules = getDrawerSlideDrillingRules(slideType ?? gavetas.gavetaTipoCorredica, metalBoxType, {
    softClose: softClose === true,
    mode: "pi_module_lateral",
    gavetasSettings: gavetas,
    panelDepthMm: profundidadeMm,
  });

  const specs = computePiModuleLateralCorredicaHoles({
    runnerLinesYMm,
    panelDepthMm: profundidadeMm,
    panelHeightMm: Math.max(...runnerLinesYMm, 1) + 40,
    side,
    rules,
    useLegacyPiOffsets: false,
  });

  for (const spec of specs) {
    addHole(holes, spec.x, spec.y, spec.depth, "corredica");
  }
}

export function buildPiDrawerLayoutForFronts(alturaMm: number, numeroGavetas: number): PiDrawerLayout {
  return getDrawerLayout(alturaMm, numeroGavetas);
}

export function buildPiUniversalLateralDrilling(input: PiLateralDrillingInput): PanelDrillHole[] {
  const holes: PanelDrillHole[] = [];
  const s = mergePiSettings(input.piSettings);
  const useUnifiedPipeline = (input.drawersLayerCount ?? 0) > 0;

  const drawerCountForLayout = useUnifiedPipeline
    ? resolvePiDrawerCountForDrilling({
        drawersLayerCount: input.drawersLayerCount,
        numeroGavetasSettings: s.numeroGavetas,
      })
    : clampPiNumeroGavetas(PI_CORREDICA_DRILL_LINE_COUNT);

  const layout = useUnifiedPipeline
    ? {
        frontHeightsMm: [] as number[],
        runnerLinesYMm: resolvePiRunnerLinesYMm(input.alturaMm, drawerCountForLayout),
      }
    : getDrawerLayout(input.alturaMm, drawerCountForLayout);

  if (s.ativarFuracaoPrateleiras) {
    addUniversalGridHoles(holes, input.alturaMm, input.profundidadeMm, input.side);
  }

  if (s.ativarFuracaoDobradicas) {
    addHingeGridHoles(holes, input.alturaMm, input.profundidadeMm, input.side);
  }

  if (s.ativarFuracaoGavetas && !input.piHideDrawerHoles) {
    if (useUnifiedPipeline) {
      addDrawerSlideHolesUnified(
        holes,
        layout.runnerLinesYMm,
        input.profundidadeMm,
        input.side,
        input.slideType,
        input.metalBoxType,
        input.softClose
      );
    } else {
      addDrawerSlideHolesLegacy(holes, layout.runnerLinesYMm, input.profundidadeMm, input.side);
    }
  }

  return holes;
}
