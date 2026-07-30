/**
 * Catalogo industrial de furacao de corredicas nos laterais do modulo.
 *
 * Coordenadas X: distancia a frente interior do corpo (mm).
 * Coordenadas Y: altura do eixo da linha de furacao acima da base da gaveta (mm).
 *
 * Hettich Quadro V6 YOU M Silent System: Bohrbild oficial (X1=38, CC=b1 por NL,
 * X2=X1+b1-1). ArciTech: System 32 / Actro (37 + grelha 32).
 */

import type { DrawerSlideType } from "../../settings/settingsSchema";
import {
  DRAWER_SLIDE_LENGTHS_MM,
  type DrawerSlideLengthMm,
  resolveDrawerSlideLength,
} from "../drawerSlideDepth";

/** Altura estrutural partilhada com o stack de gavetas (mm). */
export const SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM = 41;

export type SlideHoleRole = "front" | "mark" | "mount" | "rear";

export type SlideDrillingHoleDef = {
  /** Distancia a frente do painel (mm). */
  xFromFrontMm: number;
  role: SlideHoleRole;
  /** Furo so de marcacao (profundidade reduzida). */
  isMarkOnly?: boolean;
};

export type SlideDrillingLengthTable = {
  comprimentoMm: DrawerSlideLengthMm;
  holes: SlideDrillingHoleDef[];
};

export type SlideDrillingSystemTable = {
  slideType: DrawerSlideType | string;
  /** Altura do eixo da corredica acima da base da gaveta (mm). */
  alturaRelativaFundoMm: number;
  diametroMm: number;
  profundidadeMm: number;
  profundidadeMarkMm: number;
  /** Espelhar X completo entre esquerda e direita. */
  mirrorLeftRight: boolean;
  /** Fonte / notas de validacao. */
  source: string;
  byLength: SlideDrillingLengthTable[];
};

function holes(
  xs: Array<{ x: number; role: SlideHoleRole; mark?: boolean }>
): SlideDrillingHoleDef[] {
  return xs.map((h) => ({
    xFromFrontMm: h.x,
    role: h.role,
    isMarkOnly: h.mark === true,
  }));
}

/**
 * Padrao System 32: frente 37, intermedios em grelha, traseiro = NL - 37.
 * Inclui furo de marca a 69 mm (pratica atelier / legado PI).
 */
function system32WithMark(nl: DrawerSlideLengthMm, midXs: number[]): SlideDrillingLengthTable {
  const rear = Math.max(37, nl - 37);
  const mids = midXs.filter((x) => x > 37 + 5 && x < rear - 5);
  return {
    comprimentoMm: nl,
    holes: holes([
      { x: 37, role: "front" },
      { x: 69, role: "mark", mark: true },
      ...mids.map((x) => ({ x, role: "mount" as const })),
      { x: rear, role: "rear" },
    ]),
  };
}

/** ArciTech / Actro � grelha System 32 por comprimento nominal. */
const ARCITECH_LENGTHS: SlideDrillingLengthTable[] = [
  system32WithMark(350, [165]),
  system32WithMark(400, [165]),
  system32WithMark(450, [165, 261]),
  system32WithMark(500, [165, 261]),
  system32WithMark(550, [165, 261, 389]),
  system32WithMark(600, [165, 261, 389]),
];

/**
 * Quadro V6 YOU M Silent System � distancia CC (b1) oficial Hettich
 * (Silent System / Push to open; nao Push to open Silent).
 * Fonte: ficha Quadro V6 YOU (NL -> b1).
 */
export const QUADRO_V6_YOU_M_B1_MM: Record<DrawerSlideLengthMm, number> = {
  350: 224,
  400: 224,
  450: 256,
  500: 256,
  550: 256,
  600: 256,
};

/** Frente do modulo -> 1.o furo (atelier / ficha YOU: 38 mm). */
export const QUADRO_V6_YOU_M_FRONT_X_MM = 38;
/** Recuo de seguranca no 2.o furo (evita fragilidade na madeira). */
export const QUADRO_V6_YOU_M_SECOND_HOLE_SETBACK_MM = 1;

/**
 * Padrao Quadro V6 YOU M Silent System por NL:
 * X1 = 38; X2 = X1 + b1 - 1 (CC oficial = b1; recuo 1 mm no 2.o furo).
 * A ficha YOU lista apenas b1 (sem b2) para Silent System � 2 furos de montagem.
 */
function quadroV6YouMSilentSystemLengths(): SlideDrillingLengthTable[] {
  return DRAWER_SLIDE_LENGTHS_MM.map((nl) => {
    const b1 = QUADRO_V6_YOU_M_B1_MM[nl];
    const x1 = QUADRO_V6_YOU_M_FRONT_X_MM;
    const x2 = x1 + b1 - QUADRO_V6_YOU_M_SECOND_HOLE_SETBACK_MM;
    return {
      comprimentoMm: nl,
      holes: holes([
        { x: x1, role: "front" },
        { x: x2, role: "rear" },
      ]),
    };
  });
}

/** Generica � 3 furos classicos (frente / marca / traseiro no NL). */
const GENERICA_LENGTHS: SlideDrillingLengthTable[] = DRAWER_SLIDE_LENGTHS_MM.map((nl) => ({
  comprimentoMm: nl,
  holes: holes([
    { x: 38, role: "front" },
    { x: 69, role: "mark", mark: true },
    { x: Math.max(38, nl - 38), role: "rear" },
  ]),
}));

/** Blum Tandem / Movento � System 32 sem marca a 69 (so montagem). */
function blumLengths(midFor: (nl: DrawerSlideLengthMm) => number[]): SlideDrillingLengthTable[] {
  return DRAWER_SLIDE_LENGTHS_MM.map((nl) => {
    const rear = Math.max(37, nl - 37);
    const mids = midFor(nl).filter((x) => x > 42 && x < rear - 5);
    return {
      comprimentoMm: nl,
      holes: holes([
        { x: 37, role: "front" },
        ...mids.map((x) => ({ x, role: "mount" as const })),
        { x: rear, role: "rear" },
      ]),
    };
  });
}

export const HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM =
  "Hettich Quadro V6 You M Silent System" as const;

const SLIDE_DRILLING_CATALOG: SlideDrillingSystemTable[] = [
  {
    slideType: HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM,
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: 1,
    profundidadeMarkMm: 1,
    mirrorLeftRight: true,
    source:
      "Hettich Quadro V6 YOU M Silent System � Bohrbild oficial (X1=38 mm, CC=b1 por NL, X2=X1+b1-1).",
    byLength: quadroV6YouMSilentSystemLengths(),
  },
  {
    slideType: "Hettich ArciTech",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: 1,
    profundidadeMarkMm: 1,
    mirrorLeftRight: true,
    source:
      "Hettich ArciTech/Actro System 32 (37 mm + grelha). Validar com ficha oficial do atelier.",
    byLength: ARCITECH_LENGTHS,
  },
  {
    slideType: "Hettich InnoTech",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: 1,
    profundidadeMarkMm: 1,
    mirrorLeftRight: true,
    source: "Hettich InnoTech � mesmo padrao System 32 que ArciTech (familia Hettich).",
    byLength: ARCITECH_LENGTHS,
  },
  {
    slideType: "Gen�rica",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: 1,
    profundidadeMarkMm: 1,
    mirrorLeftRight: true,
    source: "Padrao atelier legado (38/69/NL-38) � opcao secundaria.",
    byLength: GENERICA_LENGTHS,
  },
  {
    slideType: "Blum Tandem",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: 1,
    profundidadeMarkMm: 1,
    mirrorLeftRight: true,
    source: "Blum TANDEM System 32 (37 / NL-37 + intermedios).",
    byLength: blumLengths((nl) => (nl >= 500 ? [165, 261] : [165])),
  },
  {
    slideType: "Blum Movento",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: 1,
    profundidadeMarkMm: 1,
    mirrorLeftRight: true,
    source: "Blum MOVENTO System 32 (37 / NL-37 + intermedios).",
    byLength: blumLengths((nl) =>
      nl >= 500 ? [165, 261, 357] : nl >= 400 ? [165, 261] : [165]
    ),
  },
  {
    slideType: "Hafele Matrix",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: 1,
    profundidadeMarkMm: 1,
    mirrorLeftRight: true,
    source: "Hafele Matrix � System 32 alinhado a Blum/Hettich.",
    byLength: blumLengths((nl) => (nl >= 500 ? [165, 261] : [165])),
  },
];

const BY_TYPE = new Map(SLIDE_DRILLING_CATALOG.map((e) => [e.slideType, e]));

/** Aliases de UI / legado -> entrada canonica do catalogo. */
const SLIDE_TYPE_ALIASES: Record<string, string> = {
  "Hettich Quadro V6 You M Silent System": HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM,
  "Hettich Quadro V6 YOU M Silent System": HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM,
  "Hettich Quadro V6": HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM,
  "Quadro V6 You M Silent System": HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM,
  "Quadro V6 YOU M": HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM,
  "Quadro V6": HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM,
};

export function listSlideDrillingCatalog(): readonly SlideDrillingSystemTable[] {
  return SLIDE_DRILLING_CATALOG;
}

export function getSlideDrillingSystemTable(
  slideType?: string | null
): SlideDrillingSystemTable {
  if (slideType) {
    const canonical = SLIDE_TYPE_ALIASES[slideType] ?? slideType;
    if (BY_TYPE.has(canonical)) return BY_TYPE.get(canonical)!;
    const lower = slideType.toLowerCase();
    if (lower.includes("quadro")) {
      return BY_TYPE.get(HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM)!;
    }
  }
  return BY_TYPE.get("Hettich ArciTech")!;
}

export type ResolvedSlideDrillingPattern = {
  slideType: string;
  comprimentoMm: DrawerSlideLengthMm;
  alturaRelativaFundoMm: number;
  diametroMm: number;
  profundidadeMm: number;
  profundidadeMarkMm: number;
  mirrorLeftRight: boolean;
  holes: SlideDrillingHoleDef[];
  source: string;
};

/**
 * Resolve a tabela de furacao para um slideType + profundidade de painel/util.
 * Escolhe o maior comprimento industrial <= profundidade disponivel.
 */
export function resolveSlideDrillingPattern(input: {
  slideType?: string | null;
  panelDepthMm: number;
  /** Comprimento forcado (ex. settings.modeloPI.comprimentoCorredicaMm). */
  preferredLengthMm?: number | null;
}): ResolvedSlideDrillingPattern {
  const table = getSlideDrillingSystemTable(input.slideType);
  const preferred =
    input.preferredLengthMm != null && Number.isFinite(input.preferredLengthMm)
      ? Number(input.preferredLengthMm)
      : null;
  const length = (
    preferred != null && (DRAWER_SLIDE_LENGTHS_MM as readonly number[]).includes(preferred)
      ? preferred
      : resolveDrawerSlideLength(input.panelDepthMm)
  ) as DrawerSlideLengthMm;

  const row =
    table.byLength.find((r) => r.comprimentoMm === length) ??
    table.byLength.reduce((best, cur) =>
      Math.abs(cur.comprimentoMm - length) < Math.abs(best.comprimentoMm - length) ? cur : best
    );

  return {
    slideType: table.slideType,
    comprimentoMm: row.comprimentoMm,
    alturaRelativaFundoMm: table.alturaRelativaFundoMm,
    diametroMm: table.diametroMm,
    profundidadeMm: table.profundidadeMm,
    profundidadeMarkMm: table.profundidadeMarkMm,
    mirrorLeftRight: table.mirrorLeftRight,
    holes: row.holes,
    source: table.source,
  };
}

/**
 * Converte X a partir da frente para coordenada de painel por lado.
 * Espelhamento completo e simetrico (corrige bug do mark so a direita).
 */
export function mirrorSlideHoleXFromFront(
  xFromFrontMm: number,
  panelDepthMm: number,
  side: "left" | "right",
  mirrorLeftRight: boolean
): number {
  if (!mirrorLeftRight || side === "right") return xFromFrontMm;
  return panelDepthMm - xFromFrontMm;
}

/** Clamp de furo ao interior do painel com margem = raio. */
export function clampHoleToPanel(
  x: number,
  y: number,
  panelWidthMm: number,
  panelHeightMm: number,
  diameterMm: number
): { x: number; y: number; clamped: boolean } {
  const margin = Math.max(1, diameterMm / 2 + 0.5);
  const maxX = Math.max(margin, panelWidthMm - margin);
  const maxY = Math.max(margin, panelHeightMm - margin);
  const nx = Math.min(maxX, Math.max(margin, x));
  const ny = Math.min(maxY, Math.max(margin, y));
  return { x: nx, y: ny, clamped: nx !== x || ny !== y };
}

export const CORREDICA_OVERLAP_MIN_DIST_MM = 8;

/**
 * Ajusta Y de furos de corredica que colidem com furos existentes (DIV/SEP/etc.).
 * Tenta offsets pequenos; se impossivel, marca `overlapUnresolved`.
 */
export function resolveCorredicaOverlaps<T extends { x: number; y: number }>(
  corredica: T[],
  existing: Array<{ x: number; y: number }>,
  panelHeightMm: number,
  diameterMm: number
): { holes: T[]; unresolved: number } {
  if (!existing.length) return { holes: corredica, unresolved: 0 };
  const minDist = Math.max(CORREDICA_OVERLAP_MIN_DIST_MM, diameterMm + 2);
  const nudges = [0, 2, -2, 4, -4, 6, -6, 8, -8];
  let unresolved = 0;

  const result = corredica.map((hole) => {
    const collides = (y: number) =>
      existing.some((e) => {
        const dx = e.x - hole.x;
        const dy = e.y - y;
        return Math.hypot(dx, dy) < minDist;
      });

    for (const n of nudges) {
      const y = Math.min(panelHeightMm - 1, Math.max(1, hole.y + n));
      if (!collides(y)) {
        return y === hole.y ? hole : { ...hole, y };
      }
    }
    unresolved += 1;
    return hole;
  });

  return { holes: result, unresolved };
}
