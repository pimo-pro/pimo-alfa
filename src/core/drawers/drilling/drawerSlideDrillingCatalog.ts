/**
 * Catalogo industrial de furacao de corredicas nos laterais do modulo.
 *
 * Coordenadas X: distancia a frente interior do corpo (mm).
 * Coordenadas Y: altura do eixo da linha de furacao acima da base da gaveta (mm).
 *
 * Padrao de marcacao (modulo):
 *   X1 = 38 mm (frente)
 *   X_last = profundidadeLateral - 38 mm (traseira)
 *   NL 350-400 → 4 furos; NL 450-600 → 5 furos
 *   Todos os furos: marcacao, profundidade 1 mm (nao estruturais).
 *
 * Hettich Quadro V6 YOU M: intermedios ancorados no CC oficial (b1).
 * ArciTech / Blum / etc.: distribuicao proporcional entre X1 e X_last.
 */

import type { DrawerSlideType } from "../../settings/settingsSchema";
import {
  DRAWER_SLIDE_LENGTHS_MM,
  type DrawerSlideLengthMm,
  resolveDrawerSlideLength,
} from "../drawerSlideDepth";

/** Altura estrutural partilhada com o stack de gavetas (mm). */
export const SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM = 41;

/** Recuo frontal / traseiro simetrico nos laterais do modulo (mm). */
export const MODULE_SLIDE_EDGE_SETBACK_MM = 38;

/** Profundidade de marcacao dos furos de corredica no modulo (mm). */
export const MODULE_SLIDE_MARK_DEPTH_MM = 1;

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
  /** CC oficial (b1) por NL — Quadro V6; indefinido nos restantes. */
  officialB1ByLength?: Partial<Record<DrawerSlideLengthMm, number>>;
};

/**
 * Quadro V6 YOU M Silent System — distancia CC (b1) oficial Hettich
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
export const QUADRO_V6_YOU_M_FRONT_X_MM = MODULE_SLIDE_EDGE_SETBACK_MM;
/** Recuo de seguranca no 2.o furo oficial CC (evita fragilidade na madeira). */
export const QUADRO_V6_YOU_M_SECOND_HOLE_SETBACK_MM = 1;

export const HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM =
  "Hettich Quadro V6 You M Silent System" as const;

/** Contagem de furos de marcacao por comprimento nominal. */
export function moduleSlideHoleCountForNl(nl: number): 4 | 5 {
  return nl <= 400 ? 4 : 5;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Constroi o padrao de marcacao simetrico nos laterais do modulo.
 * X1 = 38; X_last = D - 38; intermedios proporcionais (ancorados em CC se houver b1).
 */
export function buildModuleSlideMarkingPattern(input: {
  comprimentoMm: DrawerSlideLengthMm;
  panelDepthMm: number;
  officialB1Mm?: number;
}): SlideDrillingHoleDef[] {
  const x1 = MODULE_SLIDE_EDGE_SETBACK_MM;
  const depth = Math.max(x1 * 2 + 10, Number(input.panelDepthMm) || input.comprimentoMm);
  const xLast = depth - MODULE_SLIDE_EDGE_SETBACK_MM;
  const nTotal = moduleSlideHoleCountForNl(input.comprimentoMm);
  const nMid = nTotal - 2;

  const xs: number[] = [x1];
  for (let i = 1; i <= nMid; i++) {
    xs.push(round1(x1 + ((xLast - x1) * i) / (nMid + 1)));
  }
  xs.push(xLast);

  if (input.officialB1Mm != null && Number.isFinite(input.officialB1Mm)) {
    const cc = round1(
      MODULE_SLIDE_EDGE_SETBACK_MM +
        input.officialB1Mm -
        QUADRO_V6_YOU_M_SECOND_HOLE_SETBACK_MM
    );
    if (cc > x1 + 5 && cc < xLast - 5 && xs.length >= 3) {
      let bestIdx = 1;
      let bestDist = Infinity;
      for (let i = 1; i < xs.length - 1; i++) {
        const d = Math.abs(xs[i]! - cc);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      xs[bestIdx] = cc;
    }
  }

  // Dedup + sort (caso CC coincida com um interpolado).
  const unique = [...new Set(xs.map((x) => round1(x)))].sort((a, b) => a - b);
  // Garantir extremos exactos.
  if (unique[0] !== x1) unique[0] = x1;
  if (unique[unique.length - 1] !== xLast) unique[unique.length - 1] = xLast;

  // Se dedup reduziu abaixo do alvo, repor proporcao simples.
  let finalXs = unique;
  if (finalXs.length < nTotal) {
    finalXs = [];
    for (let i = 0; i < nTotal; i++) {
      finalXs.push(round1(x1 + ((xLast - x1) * i) / (nTotal - 1)));
    }
    if (input.officialB1Mm != null) {
      const cc = round1(
        MODULE_SLIDE_EDGE_SETBACK_MM +
          input.officialB1Mm -
          QUADRO_V6_YOU_M_SECOND_HOLE_SETBACK_MM
      );
      if (cc > x1 + 5 && cc < xLast - 5) {
        let bestIdx = 1;
        let bestDist = Infinity;
        for (let i = 1; i < finalXs.length - 1; i++) {
          const d = Math.abs(finalXs[i]! - cc);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        finalXs[bestIdx] = cc;
      }
    }
  }

  return finalXs.map((x, i) => {
    const role: SlideHoleRole =
      i === 0 ? "front" : i === finalXs.length - 1 ? "rear" : "mark";
    return { xFromFrontMm: x, role, isMarkOnly: true };
  });
}

function lengthsForSystem(officialB1ByLength?: Partial<Record<DrawerSlideLengthMm, number>>): SlideDrillingLengthTable[] {
  // Lazy: evita TDZ/ciclo de imports com drawerSlideDepth durante o boot do módulo.
  const lengths = DRAWER_SLIDE_LENGTHS_MM ?? [];
  return lengths.map((nl) => ({
    comprimentoMm: nl,
    // Tabela nominal: D = NL (referencia). resolveSlideDrillingPattern recalcula com panelDepth real.
    holes: buildModuleSlideMarkingPattern({
      comprimentoMm: nl,
      panelDepthMm: nl,
      officialB1Mm: officialB1ByLength?.[nl],
    }),
  }));
}

function buildSlideDrillingCatalog(): SlideDrillingSystemTable[] {
  return [
  {
    slideType: HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM,
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: MODULE_SLIDE_MARK_DEPTH_MM,
    profundidadeMarkMm: MODULE_SLIDE_MARK_DEPTH_MM,
    mirrorLeftRight: true,
    source:
      "Hettich Quadro V6 YOU M Silent System — marcacao modulo (X1=38, X_last=D-38, CC=b1, prof. 1 mm).",
    officialB1ByLength: QUADRO_V6_YOU_M_B1_MM,
    byLength: lengthsForSystem(QUADRO_V6_YOU_M_B1_MM),
  },
  {
    slideType: "Hettich ArciTech",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: MODULE_SLIDE_MARK_DEPTH_MM,
    profundidadeMarkMm: MODULE_SLIDE_MARK_DEPTH_MM,
    mirrorLeftRight: true,
    source:
      "Hettich ArciTech — marcacao modulo (X1=38, X_last=D-38, 4/5 furos, prof. 1 mm).",
    byLength: lengthsForSystem(),
  },
  {
    slideType: "Hettich InnoTech",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: MODULE_SLIDE_MARK_DEPTH_MM,
    profundidadeMarkMm: MODULE_SLIDE_MARK_DEPTH_MM,
    mirrorLeftRight: true,
    source: "Hettich InnoTech — mesmo padrao de marcacao que ArciTech.",
    byLength: lengthsForSystem(),
  },
  {
    slideType: "Genérica",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: MODULE_SLIDE_MARK_DEPTH_MM,
    profundidadeMarkMm: MODULE_SLIDE_MARK_DEPTH_MM,
    mirrorLeftRight: true,
    source: "Padrao atelier generico — marcacao modulo (X1=38, X_last=D-38, prof. 1 mm).",
    byLength: lengthsForSystem(),
  },
  {
    slideType: "Blum Tandem",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: MODULE_SLIDE_MARK_DEPTH_MM,
    profundidadeMarkMm: MODULE_SLIDE_MARK_DEPTH_MM,
    mirrorLeftRight: true,
    source: "Blum TANDEM — marcacao modulo (X1=38, X_last=D-38, prof. 1 mm).",
    byLength: lengthsForSystem(),
  },
  {
    slideType: "Blum Movento",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: MODULE_SLIDE_MARK_DEPTH_MM,
    profundidadeMarkMm: MODULE_SLIDE_MARK_DEPTH_MM,
    mirrorLeftRight: true,
    source: "Blum MOVENTO — marcacao modulo (X1=38, X_last=D-38, prof. 1 mm).",
    byLength: lengthsForSystem(),
  },
  {
    slideType: "Hafele Matrix",
    alturaRelativaFundoMm: SLIDE_AXIS_FROM_DRAWER_BOTTOM_MM,
    diametroMm: 5,
    profundidadeMm: MODULE_SLIDE_MARK_DEPTH_MM,
    profundidadeMarkMm: MODULE_SLIDE_MARK_DEPTH_MM,
    mirrorLeftRight: true,
    source: "Hafele Matrix — marcacao modulo (X1=38, X_last=D-38, prof. 1 mm).",
    byLength: lengthsForSystem(),
  },
  ];
}

let _slideDrillingCatalog: SlideDrillingSystemTable[] | null = null;
function getSlideDrillingCatalog(): SlideDrillingSystemTable[] {
  if (!_slideDrillingCatalog) _slideDrillingCatalog = buildSlideDrillingCatalog();
  return _slideDrillingCatalog;
}

function getByTypeMap(): Map<string, SlideDrillingSystemTable> {
  return new Map(getSlideDrillingCatalog().map((e) => [e.slideType, e]));
}

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
  return getSlideDrillingCatalog();
}

export function getSlideDrillingSystemTable(
  slideType?: string | null
): SlideDrillingSystemTable {
  const BY_TYPE = getByTypeMap();
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
 * Furos recalculados com X_last = panelDepthMm - 38 (simetria L/R).
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

  const holes = buildModuleSlideMarkingPattern({
    comprimentoMm: length,
    panelDepthMm: input.panelDepthMm,
    officialB1Mm: table.officialB1ByLength?.[length],
  });

  return {
    slideType: table.slideType,
    comprimentoMm: length,
    alturaRelativaFundoMm: table.alturaRelativaFundoMm,
    diametroMm: table.diametroMm,
    profundidadeMm: table.profundidadeMm,
    profundidadeMarkMm: table.profundidadeMarkMm,
    mirrorLeftRight: table.mirrorLeftRight,
    holes,
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
