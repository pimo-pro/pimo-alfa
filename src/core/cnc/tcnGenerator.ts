/**
 * Geração de ficheiro TCN (Nesting) — compatível HARNNETT TRACK (TPA/WSCM).
 * Padrão ALBATROS/EDICAD. Blocos SIDE: }SIDE, SIDE#N{ $=top ::LF=DL HF=DH SF=DS ::NSEQ=N }.
 *
 * Regras HARNNETT TRACK:
 * - Modo CENTERLINE: todas as coordenadas X/Y representam o centro da ferramenta.
 *   A máquina NÃO usa compensação no controle (sem G41/G42/G40). A compensação é feita
 *   integralmente no CAM: as coordenadas do TCN já vêm com o contorno compensado geometricamente.
 * - Corte EXTERNO: contorno da peça com offset para FORA (outset = +raio da fresa), para que a
 *   borda de corte fique exatamente na linha teórica da peça.
 * - Corte INTERNO (rasgos/recortes): contorno com offset para DENTRO (inset = -raio da fresa).
 * - #40=1 no bloco W#89 indica semanticamente "corte externo"; não é compensação no controlo.
 * - Ferramenta padrão: #205=113 (diâmetro nominal 12 mm para cálculo do offset).
 * - Espaçamento mínimo entre peças: 15 mm (margem de segurança).
 * - Estrutura por operação de corte: W#89 (início) + W#2201 (segmentos lineares); Z negativo = profundidade total.
 *
 * Furação: apenas top drilling (W#81); furos emitidos via buildDrillLines() no mesmo .tcn.
 */

import type { SheetResult } from "../cutlayout/cutLayoutTypes";
import type { CncDrillOperation } from "./cncTypes";
import { getSettings } from "../settings/settingsService";
import { CUT_LAYOUT_SAFETY_MARGIN_MM, toLayoutAbsoluteX } from "../cutlayout/layoutCoordinateSystem";
import { DOBRADICA_TERCEIRO_FURO } from "../drilling/drillingService";

const HEADER = "TPA\\ALBATROS\\EDICAD\\00.00:0";

const fmt = (n: number) => Number.isFinite(n) ? n.toFixed(2) : "0.00";
const fmtZ = (n: number) => {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n);
  return Math.abs(n - rounded) < 0.0001 ? String(rounded) : n.toFixed(2);
};

/** Inteiro para DL/DH/DS/LF/HF/SF (ficheiro original usa sem decimais). */
const intVal = (n: number) => Math.round(Number.isFinite(n) ? n : 0);

/** Z de segurança (acima do material). */
const Z_SAFETY_MM = 10;
const EPSILON_MM = 0.001;
type ContourPoint = { x: number; y: number; z: number };

/** Espaçamento mínimo entre peças (mm) — HARNNETT TRACK: margem para diâmetro real da ferramenta. */
const MIN_SPACING_BETWEEN_PIECES_MM = 15;

/** Diâmetro nominal ferramenta 113 (mm) — fallback quando diâmetro não está definido nas definições. */
const TOOL_113_NOMINAL_DIAMETER_MM = 12;

/** Diâmetro mínimo para compensação geométrica (evitar raio 0). */
const MIN_TOOL_DIAMETER_MM = 1;
const EXTERNAL_OFFSET_SIGN = 1;
const INTERNAL_OFFSET_SIGN = -1;

function computeSignedArea2D(points: ContourPoint[]): number {
  if (points.length < 3) return 0;
  const isClosed = points[0].x === points[points.length - 1].x && points[0].y === points[points.length - 1].y;
  const ring = isClosed ? points.slice(0, -1) : points;
  if (ring.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function normalizeContourWinding(points: ContourPoint[], expected: "CW" | "CCW"): ContourPoint[] {
  if (points.length < 4) return points;
  const isClockwise = computeSignedArea2D(points) < 0;
  const shouldBeClockwise = expected === "CW";
  if (isClockwise === shouldBeClockwise) return points;
  const isClosed = points[0].x === points[points.length - 1].x && points[0].y === points[points.length - 1].y;
  const ring = isClosed ? points.slice(0, -1) : points.slice();
  ring.reverse();
  return isClosed ? [...ring, ring[0]] : ring;
}

/**
 * Devolve o diâmetro da fresa a usar para compensação geométrica no CAM (mm).
 * Nunca devolve 0: usa definições ou fallback nominal (ferramenta 113 = 12 mm).
 */
function getContourToolDiameterMm(settings: { nesting?: { kerfPadraoMm?: number }; cnc?: { diametroFresaContornoMm?: number } }): number {
  const fromCnc = Number(settings?.cnc?.diametroFresaContornoMm);
  if (Number.isFinite(fromCnc) && fromCnc > 0) return Math.max(MIN_TOOL_DIAMETER_MM, fromCnc);
  const fromNesting = Number(settings?.nesting?.kerfPadraoMm);
  if (Number.isFinite(fromNesting) && fromNesting > 0) return Math.max(MIN_TOOL_DIAMETER_MM, fromNesting);
  return TOOL_113_NOMINAL_DIAMETER_MM;
}

/**
 * Gera pontos do contorno em modo CENTERLINE para corte EXTERNO (outsideCut).
 * (x, y, w, h) = retângulo da PEÇA na chapa (linha teórica). O centro da ferramenta circula FORA da peça.
 * Compensação geométrica: offset para FORA pelo raio da ferramenta (outset = +raio).
 * Assim a borda de corte fica exatamente no contorno da peça; sem G41/G42 no controlo.
 * Ordem dos pontos: CCW com a peça à direita (contorno externo).
 */
function buildExternalContourPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  toolRadiusMm: number
) : ContourPoint[] {
  const signedOffsetMm = EXTERNAL_OFFSET_SIGN * Math.abs(toolRadiusMm);
  const outset = Math.max(0, signedOffsetMm);
  const x0 = x - outset;
  const y0 = y - outset;
  const x1 = x + w + outset;
  const y1 = y + h + outset;
  const points: ContourPoint[] = [
    { x: x0, y: y0, z },
    { x: x1, y: y0, z },
    { x: x1, y: y1, z },
    { x: x0, y: y1, z },
    { x: x0, y: y0, z },
  ];
  return normalizeContourWinding(points, "CW");
}

/**
 * Gera pontos do contorno para corte INTERNO (rasgos, recortes).
 * Compensação geométrica: offset para DENTRO pelo raio da ferramenta (inset = -raio).
 * (x, y, w, h) = retângulo teórico do recorte; o centro da ferramenta circula no interior.
 * Ordem: CW com o material à direita (contorno interno). Para um retângulo interno.
 */
function buildInternalContourPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  toolRadiusMm: number
): ContourPoint[] {
  const signedOffsetMm = INTERNAL_OFFSET_SIGN * Math.abs(toolRadiusMm);
  const inset = Math.max(0, Math.abs(signedOffsetMm));
  if (w <= 2 * inset || h <= 2 * inset) return []; // recorte demasiado pequeno para esta fresa
  const x0 = x + inset;
  const y0 = y + inset;
  const x1 = x + w - inset;
  const y1 = y + h - inset;
  const points: ContourPoint[] = [
    { x: x0, y: y0, z },
    { x: x0, y: y1, z },
    { x: x1, y: y1, z },
    { x: x1, y: y0, z },
    { x: x0, y: y0, z },
  ];
  return normalizeContourWinding(points, "CCW");
}

/** Distância mínima entre dois retângulos (borda a borda). Se se sobrepõem, devolve 0. */
function rectDistance(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): number {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
  return Math.sqrt(dx * dx + dy * dy);
}

function sanitizePlacementsForTcn(
  placements: SheetResult["placements"],
  sheet: SheetResult["sheet"]
): SheetResult["placements"] {
  const unique: SheetResult["placements"] = [];
  const placedRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  const signatures = new Set<string>();

  for (const pl of placements) {
    const x = pl.x_mm;
    const y = pl.y_mm;
    const w = pl.largura_mm;
    const h = pl.altura_mm;
    const signature = `${Math.round(x * 1000)}:${Math.round(y * 1000)}:${Math.round(w * 1000)}:${Math.round(h * 1000)}`;
    if (signatures.has(signature)) continue;

    if (!isPlacementInsideSheet(x, y, w, h, sheet.largura_mm, sheet.altura_mm)) continue;

    const rect = { x, y, w, h };
    const tooClose = placedRects.some((r) => rectDistance(r, rect) < MIN_SPACING_BETWEEN_PIECES_MM - EPSILON_MM);
    if (tooClose) continue;

    signatures.add(signature);
    placedRects.push(rect);
    unique.push(pl);
  }

  return unique;
}

function isPlacementInsideSheet(
  x: number,
  y: number,
  w: number,
  h: number,
  sheetW: number,
  sheetH: number
): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) return false;
  if (w <= 0 || h <= 0) return false;
  const margin = CUT_LAYOUT_SAFETY_MARGIN_MM;
  if (x < margin - EPSILON_MM || y < margin - EPSILON_MM) return false;
  if (x + w > sheetW - margin + EPSILON_MM) return false;
  if (y + h > sheetH - margin + EPSILON_MM) return false;
  return true;
}

function mapContourToLayoutCoordinates(
  points: ContourPoint[],
  sheetWidthMm: number,
  expected: "CW" | "CCW"
): ContourPoint[] {
  const mapped = points.map((point) => ({
    ...point,
    x: toLayoutAbsoluteX(point.x, sheetWidthMm),
  }));
  return normalizeContourWinding(mapped, expected);
}

/** Bloco W#89 (início de operação de corte) — HARNNETT: #40=1 corte externo, #205=113 ferramenta. */
function buildToolBlock(x: number, y: number, zSafe: number): string {
  return `W#89{ ::WTs WS=1 #8015=0 #1=${fmt(x)} #2=${fmt(y)} #3=${fmt(zSafe)} #205=113 #1001=100 #2005=3 #2002=21000 #40=1 }W`;
}

/**
 * W#81 para furação superior (top drilling).
 * Formato: W#81{ ::WTs WS=1 #8015=0 #1=<X> #2=<Y> #3=<Z> #1002=<DIAMETRO> #2008=<FEED> #2002=<RPM> #201=1 #203=1 #1001=0 }W
 * 
 * Parâmetros:
 * - #1: coordenada X (mm)
 * - #2: coordenada Y (mm)
 * - #3: profundidade Z (negativo, ex: -13 para 13mm de profundidade)
 * - #1002: diâmetro da broca (mm)
 * - #2008: feed rate (mm/min, ex: 1000)
 * - #2002: rotação (RPM, ex: 18000)
 */
function buildW81Drill(x: number, y: number, zDepth: number, diameter: number): string {
  const feedRate = 1000;
  const rpm = 18000;
  return `W#81{ ::WTs WS=1 #8015=0 #1=${fmt(x)} #2=${fmt(y)} #3=${fmtZ(zDepth)} #1002=${fmt(diameter)} #2008=${feedRate} #2002=${rpm} #201=1 #203=1 #1001=0 }W`;
}

/**
 * W#2201 no formato ALBATROS/EDICAD para contorno de corte.
 */
function buildW2201(points: Array<{ x: number; y: number; z: number }>, zCut: number): string {
  const lastIndex = points.length - 1;
  return points
    .map((p, i) => {
      const z = i === lastIndex ? 10 : zCut;
      const startFlag = i === 0 ? " #2008=8" : "";
      return `W#2201{ ::WTl #8015=0 #1=${fmt(p.x)} #2=${fmt(p.y)} #3=${fmtZ(z)}${startFlag} }W`;
    })
    .join("\n");
}

/**
 * Gera linhas de furação para o bloco SIDE#1.
 * Cada furo gera uma operação W#81 com formato ALBATROS/EDICAD.
 * Apenas furação vertical (top drilling) é suportada.
 */
function buildDrillLines(drills: CncDrillOperation[]): string[] {
  const lines: string[] = [];
  for (const d of drills) {
    if (d.tipo !== "vertical") continue; // Apenas furação superior
    const zDepth = -Math.abs(d.profundidade);
    lines.push(buildW81Drill(d.x, d.y, zDepth, d.diametro));
  }
  return lines;
}

/**
 * Gera bloco SIDE#N no formato exato da máquina.
 * Fecha diretamente com "}SIDE" (sem linha "}" isolada). Entre blocos: }SIDE + SIDE#N{
 */
function buildSideBlock(
  n: number,
  lf: number,
  hf: number,
  sf: number,
  innerLines: string[] = [],
  leadingCloseSide: boolean = false
): string[] {
  const lines: string[] = [];
  if (leadingCloseSide) lines.push("}SIDE");
  lines.push(`SIDE#${n}{`);
  lines.push("$=top");
  lines.push(`::LF=${intVal(lf)} HF=${intVal(hf)} SF=${intVal(sf)}`);
  lines.push(`::NSEQ=${n}`);
  for (const ln of innerLines) {
    if (ln !== "}") lines.push(ln);
  }
  lines.push("}SIDE");
  return lines;
}

/**
 * Gera TCN para um painel (sheet) único (HARNNETT TRACK).
 * - Header: DL, DH, DS do próprio painel.
 * - SIDE#1: furação W#81 (top drilling) + corte W#89 + W#2201 por peça (toolpath externo outset, #40=1, #205=113).
 * - Final: SIDE#3, SIDE#4, SIDE#5, SIDE#6, SIDE#2 no mesmo padrão.
 */
export function generateTcnForPanel(
  sheetResult: SheetResult,
  _kerf_mm = 3,
  acamName = "Sheet"
): string {
  const lines: string[] = [];
  lines.push(HEADER);

  const thicknessMm = sheetResult.sheet.espessura_mm;
  const zCut = -thicknessMm;
  const zSafe = Z_SAFETY_MM; // Z de segurança no W#89 (acima do material)

  const sheet = sheetResult.sheet;
  const sheetWidthMm = sheet.largura_mm;
  const dl = sheet.largura_mm;
  const dh = sheet.altura_mm;
  const ds = thicknessMm;

  lines.push(`$=Acam Name=${acamName}`);
  lines.push(`::UNm DL=${intVal(dl)} DH=${intVal(dh)} DS=${intVal(ds)} OX=0 OY=0 OZ=0`);
  lines.push("VAR{");
  lines.push("}VAR");
  lines.push("OPTI{");
  lines.push("}OPTI");

  const runtimeSettings = getSettings();
  const toolDiameterMm = getContourToolDiameterMm(runtimeSettings);
  const toolRadiusMm = toolDiameterMm / 2;

  const placements = sheetResult.placements.filter((pl) =>
    isPlacementInsideSheet(
      pl.x_mm,
      pl.y_mm,
      pl.largura_mm,
      pl.altura_mm,
      sheet.largura_mm,
      sheet.altura_mm
    )
  );
  const sanitizedPlacements = sanitizePlacementsForTcn(placements, sheet);
  const sideInnerLines: string[] = [];
  const drills: CncDrillOperation[] = [];
  
  // Furos vêm exclusivamente dos painéis (panel.drillHoles → cutlistToPieces → placement.holes)
  sanitizedPlacements.forEach((pl) => {
    for (const hole of pl.holes ?? []) {
      const topDrillable = (hole as { topDrillable?: boolean }).topDrillable;
      if (!topDrillable) continue;
      const holeType = (hole as { holeType?: string }).holeType;
      const isTerceiroFuroDobradica = holeType === "dobradica_parafuso_uniao";
      drills.push({
        x: toLayoutAbsoluteX(pl.x_mm + hole.x, sheetWidthMm),
        y: pl.y_mm + hole.y,
        z: 0,
        diametro: isTerceiroFuroDobradica ? DOBRADICA_TERCEIRO_FURO.diametroMm : hole.diameter,
        profundidade: isTerceiroFuroDobradica ? DOBRADICA_TERCEIRO_FURO.profundidadeMm : Math.min(hole.depth, thicknessMm),
        tipo: "vertical",
      });
    }
  });
  
  // Segundo: inserir operações de furação no início do bloco SIDE#1
  sideInnerLines.push(...buildDrillLines(drills));
  
  // Terceiro: operações de corte — contorno EXTERNO já compensado para fora (+raio), sem G41/G42
  sanitizedPlacements.forEach((pl) => {
    const w = pl.largura_mm;
    const h = pl.altura_mm;
    const x = pl.x_mm;
    const y = pl.y_mm;
    const points = mapContourToLayoutCoordinates(
      buildExternalContourPoints(x, y, w, h, zCut, toolRadiusMm),
      sheetWidthMm,
      "CW"
    );
    const firstPoint = points[0];
    sideInnerLines.push(buildToolBlock(firstPoint.x, firstPoint.y, zSafe));
    sideInnerLines.push(buildW2201(points, zCut));
    // Contornos internos (rasgos, recortes): compensação para DENTRO (-raio)
    const innerContours = pl.innerContours;
    if (innerContours?.length) {
      for (const rect of innerContours) {
        const innerPoints = mapContourToLayoutCoordinates(
          buildInternalContourPoints(
            pl.x_mm + rect.x_mm,
            pl.y_mm + rect.y_mm,
            rect.largura_mm,
            rect.altura_mm,
            zCut,
            toolRadiusMm
          ),
          sheetWidthMm,
          "CCW"
        );
        if (innerPoints.length > 0) {
          const first = innerPoints[0];
          sideInnerLines.push(buildToolBlock(first.x, first.y, zSafe));
          sideInnerLines.push(buildW2201(innerPoints, zCut));
        }
      }
    }
  });
  
  lines.push(...buildSideBlock(1, dl, dh, ds, sideInnerLines, true));

  lines.push(...buildSideBlock(3, dl, ds, dh, [], false));
  lines.push(...buildSideBlock(4, dh, ds, dl, [], false));
  lines.push(...buildSideBlock(5, dl, ds, dh, [], false));
  lines.push(...buildSideBlock(6, dh, ds, dl, [], false));
  lines.push(...buildSideBlock(2, dl, dh, ds, [], false));

  return lines.join("\n");
}
