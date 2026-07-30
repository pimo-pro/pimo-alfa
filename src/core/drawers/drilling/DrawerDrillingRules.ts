/**
 * DrawerDrillingRules — FASE 3
 * Fonte única de regras de furação de corrediças (moderno + PI).
 * Não altera geometria das peças — apenas coordenadas de furos.
 */

import type { PieceType } from "../../drilling/drillingService";
import { defaultRulesConfig, type RulesConfig } from "../../rules/rulesConfig";
import type { PanelDrillHole, TechnicalDrillHole } from "../../types";
import {
  settingsDefaults,
  type DrawerMetalBoxType,
  type DrawerSlideType,
  type SettingsSchema,
} from "../../settings/settingsSchema";
import { getSettings } from "../../settings/settingsService";
import type { DrillFace } from "../../types";
import {
  isMetalBoxCatalogType,
  normalizeDrawerMetalBoxType,
  resolveMetalBoxProfile,
} from "../drawerMetalBoxCatalog";
import {
  clampHoleToPanel,
  mirrorSlideHoleXFromFront,
  resolveSlideDrillingPattern,
  type ResolvedSlideDrillingPattern,
  type SlideDrillingHoleDef,
} from "./drawerSlideDrillingCatalog";
import { DRAWER_VERTICAL_BASE_OFFSET_MM } from "../drawerVerticalPosition";

export type DrawerDrillingMode = "drawer_piece" | "pi_module_lateral";

export type DrawerDrillingContext = {
  slideType?: string;
  metalBoxType?: string;
  softClose?: boolean;
  drawerCount?: number;
  mode?: DrawerDrillingMode;
  corredicaConfig?: RulesConfig["furos"]["tecnicos"]["corredica"];
  gavetasSettings?: SettingsSchema["gavetas"];
  /** Profundidade do painel lateral (mm) — resolve comprimento/padrão X. */
  panelDepthMm?: number;
  /** Comprimento de corrediça forçado (mm). */
  slideLengthMm?: number;
  /** Altura do painel (mm) — clamp Y. */
  panelHeightMm?: number;
};

export type DrawerSlideDrillingRules = {
  enabled: boolean;
  slideType: string;
  metalBoxType: string;
  softClose: boolean;
  skipLateralWoodPieces: boolean;
  skipCorredicaOnDrawerPieces: boolean;
  yLineMode: "single_from_bottom" | "pi_runner_lines";
  offsetFrenteMm: number;
  offsetFundoMm: number;
  offsetMarkMm: number;
  alturaRelativaFundoMm: number;
  offsetVerticalAdicionalMm: number;
  softCloseVerticalOffsetMm: number;
  diametroMm: number;
  profundidadeMm: number;
  profundidadeMarkMm: number;
  mirrorLeftRight: boolean;
  /** Comprimento industrial resolvido. */
  slideLengthMm: number;
  /** Padrão X a partir da frente (catálogo por slideType). */
  holePatternFromFront: SlideDrillingHoleDef[];
  patternSource: string;
};

export type DrawerCorredicaHoleSpec = {
  x: number;
  y: number;
  diametro: number;
  profundidade: number;
  face: DrillFace;
  isMarkOnly?: boolean;
};

const PI_LEGACY_REAR_X = 293;
const PI_LEGACY_MARK_X = 69;
const PI_LEGACY_FRONT_X = 37;
/** Distância industrial da base ao eixo da corrediça / pino inferior (mm). */
export const DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM = 41;

function clampMm(value: number, min: number, max?: number): number {
  const v = Number.isFinite(value) ? value : min;
  if (max != null) return Math.min(max, Math.max(min, v));
  return Math.max(min, v);
}

function normalizeMetalBoxType(value?: string): DrawerMetalBoxType {
  return normalizeDrawerMetalBoxType(value);
}

function isMetalBoxEnabled(metalBoxType?: string): boolean {
  return isMetalBoxCatalogType(metalBoxType);
}

function resolveSlideType(
  slideType?: string,
  gavetas?: SettingsSchema["gavetas"]
): DrawerSlideType | string {
  return slideType ?? gavetas?.gavetaTipoCorredica ?? settingsDefaults.gavetas.gavetaTipoCorredica;
}

/**
 * API principal — regras industriais por tipo de corrediça (catálogo) + caixa metálica.
 */
export function getDrawerSlideDrillingRules(
  slideType?: string,
  metalBoxType?: string,
  ctx: DrawerDrillingContext = {}
): DrawerSlideDrillingRules {
  const gavetas = ctx.gavetasSettings ?? getSettings().gavetas;
  const cfg = ctx.corredicaConfig ?? defaultRulesConfig.furos.tecnicos.corredica;
  const resolvedSlide = resolveSlideType(slideType, gavetas);
  const resolvedMetal = normalizeMetalBoxType(metalBoxType ?? gavetas.gavetaTipoCaixaMetalica);
  const softClose = ctx.softClose === true;
  const metalEnabled = isMetalBoxEnabled(resolvedMetal);
  const metalProfile = metalEnabled ? resolveMetalBoxProfile(resolvedMetal) : null;

  const panelDepthMm = clampMm(ctx.panelDepthMm ?? 500, 50);
  const pattern: ResolvedSlideDrillingPattern = resolveSlideDrillingPattern({
    slideType: resolvedSlide,
    panelDepthMm,
    preferredLengthMm: ctx.slideLengthMm,
  });

  const offsetFrente =
    metalProfile?.slideOffsetFrontMm ??
    pattern.holes.find((h) => h.role === "front")?.xFromFrontMm ??
    clampMm(cfg?.offsetFrente ?? 38, 5);
  const rearHole = [...pattern.holes].reverse().find((h) => h.role === "rear" || h.role === "mount");
  const offsetFundo =
    metalProfile?.slideOffsetRearMm ??
    (rearHole ? Math.max(5, pattern.comprimentoMm - rearHole.xFromFrontMm) : clampMm(cfg?.offsetFundo ?? 38, 5));
  const offsetMark =
    pattern.holes.find((h) => h.role === "mark")?.xFromFrontMm ??
    clampMm(cfg?.offsetMark ?? PI_LEGACY_MARK_X, 5);

  const alturaRelativaFundo = clampMm(
    pattern.alturaRelativaFundoMm ?? cfg?.alturaRelativaFundo ?? 41,
    5
  );
  const offsetVerticalAdicional = clampMm(cfg?.offsetVerticalAdicional ?? 0, 0);
  const softCloseVerticalOffsetMm = softClose ? 2 : 0;
  const mode = ctx.mode ?? "drawer_piece";
  const profundidadeMm = clampMm(cfg?.profundidade ?? pattern.profundidadeMm, 0.1);
  const profundidadeMarkMm = clampMm(
    cfg?.profundidadeMark ?? cfg?.profundidade ?? pattern.profundidadeMarkMm,
    0.1
  );

  // Metal box: offsets frente/traseiro do perfil; manter padrão de furos do slideType.
  let holePatternFromFront = pattern.holes;
  if (metalProfile) {
    const mid = pattern.holes.filter((h) => h.role === "mark" || h.role === "mount");
    holePatternFromFront = [
      { xFromFrontMm: offsetFrente, role: "front" as const },
      ...mid,
      {
        xFromFrontMm: Math.max(offsetFrente + 10, pattern.comprimentoMm - offsetFundo),
        role: "rear" as const,
      },
    ];
  }

  return {
    enabled: cfg?.enabled !== false,
    slideType: resolvedSlide,
    metalBoxType: resolvedMetal,
    softClose,
    skipLateralWoodPieces: metalEnabled,
    skipCorredicaOnDrawerPieces: metalEnabled,
    yLineMode: mode === "pi_module_lateral" ? "pi_runner_lines" : "single_from_bottom",
    offsetFrenteMm: offsetFrente,
    offsetFundoMm: offsetFundo,
    offsetMarkMm: offsetMark,
    alturaRelativaFundoMm: alturaRelativaFundo,
    offsetVerticalAdicionalMm: offsetVerticalAdicional,
    softCloseVerticalOffsetMm,
    diametroMm: clampMm(cfg?.diametro ?? pattern.diametroMm, 1),
    profundidadeMm,
    profundidadeMarkMm,
    mirrorLeftRight: pattern.mirrorLeftRight,
    slideLengthMm: pattern.comprimentoMm,
    holePatternFromFront,
    patternSource: pattern.source,
  };
}

export function shouldDrillCorredicaOnDrawerPieceType(
  pieceType: PieceType,
  rules: DrawerSlideDrillingRules
): boolean {
  if (!rules.enabled) return false;
  if (rules.skipCorredicaOnDrawerPieces) return false;

  const isSide =
    pieceType === "gaveta_lat_esq" || pieceType === "gaveta_lat_dir" || pieceType === "gaveta";
  const isFrontOrBack =
    pieceType === "gaveta_frente_int" ||
    pieceType === "gaveta_frente" ||
    pieceType === "gaveta_traseira";

  if (
    rules.skipLateralWoodPieces &&
    (isSide || pieceType === "gaveta_fundo" || pieceType === "gaveta_traseira")
  ) {
    return false;
  }

  return isSide || isFrontOrBack;
}

export function getDrawerPieceCorredicaFace(pieceType: PieceType): DrillFace {
  if (pieceType === "gaveta_lat_esq") return "direita";
  if (pieceType === "gaveta_lat_dir") return "esquerda";
  if (pieceType === "gaveta_frente_int" || pieceType === "gaveta_frente") return "tras";
  if (pieceType === "gaveta_traseira") return "frente";
  return "frente";
}

function yFromBottomOffset(panelHeightMm: number, rules: DrawerSlideDrillingRules): number {
  const fromBottom =
    rules.alturaRelativaFundoMm +
    rules.offsetVerticalAdicionalMm +
    rules.softCloseVerticalOffsetMm;
  return clampMm(panelHeightMm - fromBottom, 1, panelHeightMm);
}

/**
 * Furos de corrediça numa peça de gaveta (1 linha Y, padrão X do catálogo).
 */
export function computeDrawerPieceCorredicaHoles(params: {
  pieceType: PieceType;
  largura: number;
  altura: number;
  rules: DrawerSlideDrillingRules;
}): DrawerCorredicaHoleSpec[] {
  const { pieceType, largura, altura, rules } = params;
  if (!shouldDrillCorredicaOnDrawerPieceType(pieceType, rules)) return [];

  const face = getDrawerPieceCorredicaFace(pieceType);
  const y = yFromBottomOffset(altura, rules);
  const pattern =
    rules.holePatternFromFront?.length > 0
      ? rules.holePatternFromFront
      : [
          { xFromFrontMm: rules.offsetFrenteMm, role: "front" as const },
          { xFromFrontMm: rules.offsetMarkMm, role: "mark" as const, isMarkOnly: true },
          { xFromFrontMm: Math.max(rules.offsetFrenteMm, largura - rules.offsetFundoMm), role: "rear" as const },
        ];

  return pattern.map((hole) => {
    const clamped = clampHoleToPanel(hole.xFromFrontMm, y, largura, altura, rules.diametroMm);
    return {
      x: clamped.x,
      y: clamped.y,
      diametro: rules.diametroMm,
      profundidade: hole.isMarkOnly ? rules.profundidadeMarkMm : rules.profundidadeMm,
      face,
      isMarkOnly: hole.isMarkOnly === true,
    };
  });
}

const DRAWER_FRONT_BASE_HEIGHTS_MM = [122, 178, 350, 350] as const;
const GRID_STEP_MM = 32;

/**
 * Linhas Y para módulo PI — alinhadas ao centro de cada gaveta.
 */
export function resolvePiRunnerLinesYMm(
  panelHeightMm: number,
  drawerCount: number,
  frontHeightsMm?: number[]
): number[] {
  const qty = clampMm(drawerCount, 1, 4);
  const usefulHeight = Math.max(1, panelHeightMm - 8);
  const baseHeights =
    frontHeightsMm && frontHeightsMm.length === qty
      ? frontHeightsMm
      : DRAWER_FRONT_BASE_HEIGHTS_MM.slice(0, qty);
  const baseSum = baseHeights.reduce((s, h) => s + h, 0);
  const ratio = usefulHeight / Math.max(1, baseSum);
  const scaled = baseHeights.map((h) => h * ratio);

  let cursor = 2;
  const centers = scaled.map((h) => {
    const center = cursor + h / 2;
    cursor += h + 2;
    return center;
  });

  const roundToGrid = (value: number) => Math.round(value / GRID_STEP_MM) * GRID_STEP_MM;

  return centers.map((centerY) => {
    const snapped = clampMm(
      roundToGrid(centerY),
      GRID_STEP_MM,
      Math.max(GRID_STEP_MM, panelHeightMm - GRID_STEP_MM)
    );
    return clampCorredicaYFromTop(snapped, panelHeightMm, DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM);
  });
}

/**
 * Furos de corrediça nas laterais do módulo (padrão industrial por slideType).
 * Espelhamento L/R completo e simétrico; clamp à peça.
 */
export function computePiModuleLateralCorredicaHoles(params: {
  runnerLinesYMm: number[];
  panelDepthMm: number;
  panelHeightMm?: number;
  side: "left" | "right";
  rules: DrawerSlideDrillingRules;
  useLegacyPiOffsets: boolean;
}): Array<{
  x: number;
  y: number;
  depth: number;
  holeType: "corredica";
  isMarkOnly?: boolean;
}> {
  if (!params.rules.enabled) return [];

  const { runnerLinesYMm, panelDepthMm, side, rules, useLegacyPiOffsets } = params;
  const panelHeightMm = params.panelHeightMm ?? Math.max(...runnerLinesYMm, 1) + 1;

  const holes: Array<{
    x: number;
    y: number;
    depth: number;
    holeType: "corredica";
    isMarkOnly?: boolean;
  }> = [];

  if (useLegacyPiOffsets) {
    const frontOff = PI_LEGACY_FRONT_X;
    const markOff = PI_LEGACY_MARK_X;
    const rearOff = PI_LEGACY_REAR_X;
    for (const y of runnerLinesYMm) {
      const xs =
        side === "left"
          ? [panelDepthMm - frontOff, panelDepthMm - markOff, panelDepthMm - rearOff]
          : [frontOff, markOff, rearOff];
      const depths = [rules.profundidadeMm, rules.profundidadeMarkMm, rules.profundidadeMm];
      const marks = [false, true, false];
      xs.forEach((xRaw, i) => {
        const clamped = clampHoleToPanel(xRaw, y, panelDepthMm, panelHeightMm, rules.diametroMm);
        holes.push({
          x: clamped.x,
          y: clamped.y,
          depth: depths[i]!,
          holeType: "corredica",
          isMarkOnly: marks[i],
        });
      });
    }
    return holes;
  }

  const pattern =
    rules.holePatternFromFront?.length > 0
      ? rules.holePatternFromFront
      : [
          { xFromFrontMm: rules.offsetFrenteMm, role: "front" as const },
          { xFromFrontMm: rules.offsetMarkMm, role: "mark" as const, isMarkOnly: true },
          {
            xFromFrontMm: Math.max(
              rules.offsetFrenteMm,
              (rules.slideLengthMm || panelDepthMm) - rules.offsetFundoMm
            ),
            role: "rear" as const,
          },
        ];

  for (const y of runnerLinesYMm) {
    for (const hole of pattern) {
      const xRaw = mirrorSlideHoleXFromFront(
        hole.xFromFrontMm,
        panelDepthMm,
        side,
        rules.mirrorLeftRight
      );
      const ySafe = clampCorredicaYFromTop(
        y,
        panelHeightMm,
        rules.alturaRelativaFundoMm || DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM
      );
      const clamped = clampHoleToPanel(xRaw, ySafe, panelDepthMm, panelHeightMm, rules.diametroMm);
      // Re-aplicar piso de 41 mm após clamp geométrico (raio).
      const yFinal = clampCorredicaYFromTop(
        clamped.y,
        panelHeightMm,
        rules.alturaRelativaFundoMm || DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM
      );
      holes.push({
        x: clamped.x,
        y: yFinal,
        depth: hole.isMarkOnly ? rules.profundidadeMarkMm : rules.profundidadeMm,
        holeType: "corredica",
        isMarkOnly: hole.isMarkOnly === true,
      });
    }
  }

  return holes;
}

/**
 * Linhas Y (topo=0) nas laterais do módulo europeu.
 *
 * Regra industrial:
 * - eixo da corrediça = 41 mm acima da base de cada gaveta
 * - nunca < 41 mm acima do bordo inferior do painel lateral
 * - nunca < 41 mm abaixo do bordo superior
 */
export function resolveEuropeanModuleRunnerLinesYMm(params: {
  panelHeightMm: number;
  boxInternalHeightMm: number;
  drawers: Array<{ posYMm: number; frontHeightMm: number }>;
  rules?: DrawerSlideDrillingRules;
}): number[] {
  const rules =
    params.rules ??
    getDrawerSlideDrillingRules(undefined, undefined, {
      mode: "pi_module_lateral",
      panelDepthMm: 500,
    });
  const axisFromDrawerBottomMm = Math.max(1, rules.alturaRelativaFundoMm); // 41
  const minFromPanelBottomMm = axisFromDrawerBottomMm;
  const panelH = Math.max(1, params.panelHeightMm);
  const internalH = Math.max(1, params.boxInternalHeightMm);
  const internalBottomCenterY = -internalH / 2;
  const sorted = [...params.drawers].sort((a, b) => a.posYMm - b.posYMm);

  return sorted.map((drawer) => {
    const frontH = Math.max(0, Number(drawer.frontHeightMm) || 0);
    const drawerBottomCenterY = Number(drawer.posYMm) - frontH / 2;
    /** mm acima do piso interno do vão. */
    const drawerBottomFromFloorMm = drawerBottomCenterY - internalBottomCenterY;
    /**
     * O offset de stack (10 mm) não puxa a 1ª linha para a aresta:
     * base de furação da gaveta inferior = piso útil → eixo a +41 mm do bordo do painel.
     */
    const drawerBottomDrillingMm = Math.max(
      0,
      drawerBottomFromFloorMm - DRAWER_VERTICAL_BASE_OFFSET_MM
    );
    let yFromPanelBottomMm = drawerBottomDrillingMm + axisFromDrawerBottomMm;
    yFromPanelBottomMm = Math.max(minFromPanelBottomMm, yFromPanelBottomMm);
    yFromPanelBottomMm = Math.min(panelH - minFromPanelBottomMm, yFromPanelBottomMm);
    /** Coordenada de painel topo→baixo (Y=0 no topo). */
    return panelH - yFromPanelBottomMm;
  });
}

/** Garante Y de corrediça com ≥ minFromBottom mm às arestas inferior/superior. */
export function clampCorredicaYFromTop(
  yFromTopMm: number,
  panelHeightMm: number,
  minFromBottomMm: number = DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM
): number {
  const panelH = Math.max(1, panelHeightMm);
  const minB = Math.max(1, minFromBottomMm);
  const yFromBottom = panelH - yFromTopMm;
  const clampedBottom = Math.min(panelH - minB, Math.max(minB, yFromBottom));
  return panelH - clampedBottom;
}

/** Furos de corrediça nas laterais do módulo (europeu) — paridade com cutlist / viewer / XML. */
export function buildEuropeanModuleLateralCorredicaDrilling(input: {
  runnerLinesYMm: number[];
  panelDepthMm: number;
  panelHeightMm?: number;
  side: "left" | "right";
  slideType?: string;
  metalBoxType?: string;
  softClose?: boolean;
  slideLengthMm?: number;
  corredicaConfig?: RulesConfig["furos"]["tecnicos"]["corredica"];
}): PanelDrillHole[] {
  const rules = getDrawerSlideDrillingRules(input.slideType, input.metalBoxType, {
    softClose: input.softClose === true,
    mode: "pi_module_lateral",
    corredicaConfig: input.corredicaConfig,
    panelDepthMm: input.panelDepthMm,
    slideLengthMm: input.slideLengthMm,
    panelHeightMm: input.panelHeightMm,
  });
  if (!rules.enabled) return [];

  const specs = computePiModuleLateralCorredicaHoles({
    runnerLinesYMm: input.runnerLinesYMm,
    panelDepthMm: input.panelDepthMm,
    panelHeightMm: input.panelHeightMm ?? Math.max(...input.runnerLinesYMm, 1) + 40,
    side: input.side,
    rules,
    useLegacyPiOffsets: false,
  });

  return specs.map((spec) => ({
    x: spec.x,
    y: spec.y,
    diameter: rules.diametroMm,
    depth: spec.isMarkOnly ? rules.profundidadeMarkMm : rules.profundidadeMm,
    holeType: "corredica" as const,
    face: "B" as const,
    topDrillable: true,
  }));
}

/**
 * Contagem oficial de gavetas para furação PI.
 */
export function resolvePiDrawerCountForDrilling(input: {
  drawersLayerCount?: number;
  numeroGavetasSettings?: number;
  legacyFixedLineCount?: number;
}): number {
  if ((input.drawersLayerCount ?? 0) > 0) {
    return clampMm(Math.round(input.drawersLayerCount!), 1, 4);
  }
  if (Number.isFinite(input.numeroGavetasSettings) && (input.numeroGavetasSettings ?? 0) > 0) {
    return clampMm(Math.round(input.numeroGavetasSettings!), 1, 4);
  }
  return clampMm(input.legacyFixedLineCount ?? 3, 1, 4);
}

// ─── Furação Estrutural de Montagem (valores extraídos de XMLs industriais KDT) ───

/**
 * Furação estrutural real das laterais da gaveta.
 *
 * Sistema de coordenadas da peça:
 *   x = ao longo de largura (= profundidade do corpo da gaveta, L no KDT)
 *   y = ao longo de altura  (= altura da gaveta, W no KDT)
 *
 * LAT_ESQ (KDT): cavilha X=T/2, costa X=L face tras, Quadrant 1.
 * LAT_DIR (KDT): cavilha X=L-T/2, costa X=0 face frente, Quadrant 2.
 */
export function computeDrawerLateralStructuralHoles(params: {
  largura: number;
  altura: number;
  espessura: number;
  side: "esq" | "dir";
}): TechnicalDrillHole[] {
  const { largura, altura, espessura, side } = params;
  const holes: TechnicalDrillHole[] = [];

  const cavilhaX = side === "dir" ? largura - espessura / 2 : espessura / 2;
  const costaX = side === "dir" ? 0 : largura;
  const costaFace: DrillFace = side === "dir" ? "frente" : "tras";

  // Furos verticais — face "cima" (cavilha de montagem)
  holes.push({ x: cavilhaX, y: 15,          diametro: 10, profundidade: 13, tipo: "cavilha",             face: "cima" });
  holes.push({ x: cavilhaX, y: altura - DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM, diametro: 10, profundidade: 13, tipo: "cavilha", face: "cima" });

  // Furos horizontais — fixação da costa (tras em esq, frente em dir)
  holes.push({ x: costaX, y: 15,          diametro: 10, profundidade: 30, tipo: "fixacao_estrutural", face: costaFace });
  holes.push({ x: costaX, y: altura - 35, diametro: 10, profundidade: 30, tipo: "fixacao_estrutural", face: costaFace });

  // Rasgo — face "cima" (encaixe do fundo; igual em esq/dir no KDT)
  holes.push({
    x: 0,
    y: altura - 13,
    diametro: 0,
    profundidade: 3,
    tipo: "fixacao_estrutural",
    face: "cima",
    holeSubtype: "groove",
    grooveWidth: 13,
    grooveLength: largura,
  });

  return holes;
}

/**
 * Furação estrutural real da costa da gaveta (gaveta_traseira).
 *
 * Face "esquerda" (X=0) e "direita" (X=largura): fixação às laterais.
 * Face "cima" (Y=altura): fixação do fundo.
 */
export function computeDrawerCostaStructuralHoles(params: {
  largura: number;
  altura: number;
  espessura: number;
}): TechnicalDrillHole[] {
  const { largura, altura } = params;
  const holes: TechnicalDrillHole[] = [];

  // Furos horizontais — face esquerda (X=0, Quadrante 2)
  holes.push({ x: 0, y: 15,           diametro: 10, profundidade: 30, tipo: "fixacao_estrutural", face: "esquerda" });
  holes.push({ x: 0, y: altura - 15,  diametro: 10, profundidade: 30, tipo: "fixacao_estrutural", face: "esquerda" });

  // Furos horizontais — face direita (X=L, Quadrante 1)
  holes.push({ x: largura, y: 15,           diametro: 10, profundidade: 30, tipo: "fixacao_estrutural", face: "direita" });
  holes.push({ x: largura, y: altura - 15,  diametro: 10, profundidade: 30, tipo: "fixacao_estrutural", face: "direita" });

  // Furos verticais — face "cima" (fixação do fundo)
  // XML: X=8 e X=L-8, Y=W, Ø10, prof.10
  holes.push({ x: 8,             y: altura, diametro: 10, profundidade: 10, tipo: "fixacao_estrutural", face: "cima" });
  holes.push({ x: largura - 8,   y: altura, diametro: 10, profundidade: 10, tipo: "fixacao_estrutural", face: "cima" });

  return holes;
}

/**
 * Furação estrutural real da frente interna da gaveta (gaveta_frente).
 *
 * Face "esquerda" (X=0) e "direita" (X=largura): fixação às laterais.
 * KDT industrial (FRENTE_INT.xml): apenas 4 furos horizontais TypeNo=2 — sem rasgo.
 */
export function computeDrawerFrenteIntStructuralHoles(params: {
  largura: number;
  altura: number;
  espessura: number;
  /** Gaveta mais baixa do módulo — pino inferior a 41 mm da base da frente. */
  isLowestDrawer?: boolean;
}): TechnicalDrillHole[] {
  const { largura, altura, isLowestDrawer } = params;
  const holes: TechnicalDrillHole[] = [];
  const lowerPinY = isLowestDrawer ? altura - DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM : altura - 30;

  // Furos horizontais — face esquerda (X=0, Quadrante 2)
  holes.push({ x: 0, y: 30,           diametro: 10, profundidade: 30, tipo: "fixacao_estrutural", face: "esquerda" });
  holes.push({ x: 0, y: lowerPinY,   diametro: 10, profundidade: 30, tipo: "fixacao_estrutural", face: "esquerda" });

  // Furos horizontais — face direita (X=L, Quadrante 1)
  holes.push({ x: largura, y: 30,           diametro: 10, profundidade: 30, tipo: "fixacao_estrutural", face: "direita" });
  holes.push({ x: largura, y: lowerPinY,     diametro: 10, profundidade: 30, tipo: "fixacao_estrutural", face: "direita" });

  return holes;
}

/** Furação de puxadores — módulo independente (ver DrawerHandleDrillingRules). */
export {
  computeDrawerHandleHoles,
  type DrawerHandleDrillingInput,
} from "./DrawerHandleDrillingRules";

/** Furação da frente para caixas metálicas. */
export {
  computeDrawerMetalBoxFrontHoles,
  type DrawerMetalBoxFrontDrillingInput,
} from "./DrawerMetalBoxFrontDrilling";
