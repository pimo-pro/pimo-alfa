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
  MODULE_SLIDE_EDGE_SETBACK_MM,
  MODULE_SLIDE_MARK_DEPTH_MM,
  resolveSlideDrillingPattern,
  type ResolvedSlideDrillingPattern,
  type SlideDrillingHoleDef,
} from "./drawerSlideDrillingCatalog";
import { DRAWER_VERTICAL_BASE_OFFSET_MM } from "../drawerVerticalPosition";
import {
  clampDrawerEdgeDowelDepthMm,
  clampDrawerFaceDowelDepthMm,
  DRAWER_DOWEL_DIAMETER_MM,
  DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM,
  drawerThicknessCenterMm,
  getDrawerFrontDowelYPositionsMm,
  getDrawerRearDowelYPositionsMm,
} from "./drawerDowelInterlock";

export {
  DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM,
  clampDrawerEdgeDowelDepthMm,
  clampDrawerFaceDowelDepthMm,
  DRAWER_DOWEL_DIAMETER_MM,
  DRAWER_DOWEL_FACE_DEPTH_MM,
  DRAWER_DOWEL_EDGE_DEPTH_MM,
  DRAWER_REAR_DOWEL_Y_FROM_BOTTOM_MM,
  getDrawerFrontDowelYPositionsMm,
  getDrawerRearDowelYPositionsMm,
  drawerThicknessCenterMm,
} from "./drawerDowelInterlock";

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
    clampMm(cfg?.offsetFrente ?? MODULE_SLIDE_EDGE_SETBACK_MM, 5);
  const rearHole = [...pattern.holes].reverse().find((h) => h.role === "rear" || h.role === "mount" || h.role === "mark");
  const offsetFundo =
    metalProfile?.slideOffsetRearMm ??
    (rearHole
      ? Math.max(5, panelDepthMm - rearHole.xFromFrontMm)
      : clampMm(cfg?.offsetFundo ?? MODULE_SLIDE_EDGE_SETBACK_MM, 5));
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
  // Furos de corredica no modulo = apenas marcacao (1 mm). Nao estruturais.
  const profundidadeMm = clampMm(
    cfg?.profundidade ?? pattern.profundidadeMm ?? MODULE_SLIDE_MARK_DEPTH_MM,
    0.1
  );
  const profundidadeMarkMm = clampMm(
    cfg?.profundidadeMark ?? pattern.profundidadeMarkMm ?? MODULE_SLIDE_MARK_DEPTH_MM,
    0.1
  );

  // Metal box: offsets frente/traseiro do perfil; manter padrao de furos do slideType.
  let holePatternFromFront = pattern.holes.map((h) => ({ ...h, isMarkOnly: true as const }));
  if (metalProfile) {
    const mid = pattern.holes.filter((h) => h.role === "mark" || h.role === "mount");
    holePatternFromFront = [
      { xFromFrontMm: offsetFrente, role: "front" as const, isMarkOnly: true },
      ...mid.map((h) => ({ ...h, isMarkOnly: true as const })),
      {
        xFromFrontMm: Math.max(offsetFrente + 10, panelDepthMm - offsetFundo),
        role: "rear" as const,
        isMarkOnly: true,
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

/**
 * Corrediças furam-se apenas nos laterais do MÓDULO (`pi_module_lateral`).
 * Peças da gaveta (lat/costa/frente) — modelo industrial: apenas cavilhas + rasgo.
 * Nunca injectar Ø5 / marcação de corrediça nestas peças.
 *
 * @deprecated Mantido por compatibilidade de API; retorna sempre `false`.
 */
export function shouldDrillCorredicaOnDrawerPieceType(
  _pieceType: PieceType,
  _rules: DrawerSlideDrillingRules
): boolean {
  return false;
}

export function getDrawerPieceCorredicaFace(pieceType: PieceType): DrillFace {
  if (pieceType === "gaveta_lat_esq") return "direita";
  if (pieceType === "gaveta_lat_dir") return "esquerda";
  if (pieceType === "gaveta_frente_int" || pieceType === "gaveta_frente") return "tras";
  if (pieceType === "gaveta_traseira") return "frente";
  return "frente";
}

/**
 * @deprecated Não usar no pipeline. Corrediças = laterais do módulo apenas.
 * Peças da gaveta não recebem furos Ø5 — retorna sempre `[]`.
 */
export function computeDrawerPieceCorredicaHoles(_params: {
  pieceType: PieceType;
  largura: number;
  altura: number;
  rules: DrawerSlideDrillingRules;
}): DrawerCorredicaHoleSpec[] {
  return [];
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
      // Legacy PI: tambem marcacao 1 mm (nao atravessa a peca).
      const markDepth = rules.profundidadeMarkMm || MODULE_SLIDE_MARK_DEPTH_MM;
      xs.forEach((xRaw) => {
        const clamped = clampHoleToPanel(xRaw, y, panelDepthMm, panelHeightMm, rules.diametroMm);
        holes.push({
          x: clamped.x,
          y: clamped.y,
          depth: markDepth,
          holeType: "corredica",
          isMarkOnly: true,
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
      // Laterais do modulo: todos os furos de corredica sao so marcacao (1 mm).
      const markDepth = rules.profundidadeMarkMm || MODULE_SLIDE_MARK_DEPTH_MM;
      holes.push({
        x: clamped.x,
        y: yFinal,
        depth: markDepth,
        holeType: "corredica",
        isMarkOnly: true,
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

  const markDepth = rules.profundidadeMarkMm || MODULE_SLIDE_MARK_DEPTH_MM;
  return specs.map((spec) => ({
    x: spec.x,
    y: spec.y,
    diameter: rules.diametroMm,
    depth: markDepth,
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

// ─── Furação Estrutural de Montagem (interlock face ↔ espessura) ───

/**
 * Furação estrutural das laterais da gaveta.
 *
 * Sistema de coordenadas da peça:
 *   x = ao longo de largura (= profundidade do corpo da gaveta, L no KDT)
 *   y = ao longo de altura  (= altura da gaveta, W no KDT)
 *
 * Interlock:
 *   - Aresta traseira ↔ costa (face): Y = 39 / H−39, prof. aresta clamp(30)
 *   - Aresta frontal ↔ frente (face): Y tabela SSOT, prof. aresta clamp(30)
 *   - Centro na espessura: Z KDT = T/2 (modelado via face de aresta)
 *
 * LAT_ESQ: traseira X=L face tras; frente X=0 face frente (Q1).
 * LAT_DIR: traseira X=0 face frente; frente X=L face tras (Q2, espelho).
 */
export function computeDrawerLateralStructuralHoles(params: {
  largura: number;
  altura: number;
  espessura: number;
  side: "esq" | "dir";
  isLowestDrawer?: boolean;
}): TechnicalDrillHole[] {
  const { largura, altura, espessura, side, isLowestDrawer } = params;
  const holes: TechnicalDrillHole[] = [];
  const edgeDepth = clampDrawerEdgeDowelDepthMm(espessura);
  const dia = DRAWER_DOWEL_DIAMETER_MM;

  const rearX = side === "dir" ? 0 : largura;
  const rearFace: DrillFace = side === "dir" ? "frente" : "tras";
  const frontX = side === "dir" ? largura : 0;
  const frontFace: DrillFace = side === "dir" ? "tras" : "frente";

  for (const y of getDrawerRearDowelYPositionsMm(altura)) {
    holes.push({
      x: rearX,
      y,
      diametro: dia,
      profundidade: edgeDepth,
      tipo: "cavilha",
      face: rearFace,
    });
  }

  for (const y of getDrawerFrontDowelYPositionsMm(altura, isLowestDrawer)) {
    holes.push({
      x: frontX,
      y,
      diametro: dia,
      profundidade: edgeDepth,
      tipo: "cavilha",
      face: frontFace,
    });
  }

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
 * Furação estrutural da costa da gaveta (gaveta_traseira).
 * Furos de face/aresta sincronizados com laterais (Y=39 / H−39, prof. 13 mm).
 * Face "cima": fixação do fundo (mantida).
 */
export function computeDrawerCostaStructuralHoles(params: {
  largura: number;
  altura: number;
  espessura: number;
}): TechnicalDrillHole[] {
  const { largura, altura, espessura } = params;
  const holes: TechnicalDrillHole[] = [];
  const faceDepth = clampDrawerFaceDowelDepthMm(espessura);
  const dia = DRAWER_DOWEL_DIAMETER_MM;
  const ys = getDrawerRearDowelYPositionsMm(altura);

  for (const y of ys) {
    holes.push({
      x: 0,
      y,
      diametro: dia,
      profundidade: faceDepth,
      tipo: "cavilha",
      face: "esquerda",
    });
    holes.push({
      x: largura,
      y,
      diametro: dia,
      profundidade: faceDepth,
      tipo: "cavilha",
      face: "direita",
    });
  }

  // Furos verticais — face "cima" (fixação do fundo)
  const inset = drawerThicknessCenterMm(espessura) || 8;
  holes.push({
    x: inset,
    y: altura,
    diametro: dia,
    profundidade: Math.min(10, clampDrawerFaceDowelDepthMm(espessura)),
    tipo: "fixacao_estrutural",
    face: "cima",
  });
  holes.push({
    x: largura - inset,
    y: altura,
    diametro: dia,
    profundidade: Math.min(10, clampDrawerFaceDowelDepthMm(espessura)),
    tipo: "fixacao_estrutural",
    face: "cima",
  });

  return holes;
}

/**
 * Furação estrutural da frente interna da gaveta (gaveta_frente).
 * Y sincronizados com laterais (tabela SSOT); profundidade face 13 mm.
 */
export function computeDrawerFrenteIntStructuralHoles(params: {
  largura: number;
  altura: number;
  espessura: number;
  /** Gaveta mais baixa do módulo — pino inferior a 41 mm da base da frente. */
  isLowestDrawer?: boolean;
}): TechnicalDrillHole[] {
  const { largura, altura, espessura, isLowestDrawer } = params;
  const holes: TechnicalDrillHole[] = [];
  const faceDepth = clampDrawerFaceDowelDepthMm(espessura);
  const dia = DRAWER_DOWEL_DIAMETER_MM;

  for (const y of getDrawerFrontDowelYPositionsMm(altura, isLowestDrawer)) {
    holes.push({
      x: 0,
      y,
      diametro: dia,
      profundidade: faceDepth,
      tipo: "cavilha",
      face: "esquerda",
    });
    holes.push({
      x: largura,
      y,
      diametro: dia,
      profundidade: faceDepth,
      tipo: "cavilha",
      face: "direita",
    });
  }

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
