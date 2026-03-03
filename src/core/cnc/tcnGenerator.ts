/**
 * Geração de ficheiro TCN (Nesting) — compatível HARNNETT TRACK (TPA/WSCM).
 * Padrão ALBATROS/EDICAD. Blocos SIDE: }SIDE, SIDE#N{ $=top ::LF=DL HF=DH SF=DS ::NSEQ=N }.
 *
 * Regras HARNNETT TRACK:
 * - Modo CENTERLINE: todas as coordenadas X/Y representam o centro da ferramenta.
 *   Não se aplica compensação manual; não se emitem G41, G42 ou G40.
 * - Corte EXTERNO: #40=1 no bloco de operação (compensação para fora com diâmetro real).
 * - Ferramenta padrão: #205=113 (diâmetro real medido automaticamente pela máquina).
 * - Espaçamento mínimo entre peças: 15 mm (margem de segurança).
 * - Estrutura por operação de corte: W#89 (início) + W#2201 (segmentos lineares); Z negativo = profundidade total.
 *
 * Furação: apenas top drilling (W#81); furos emitidos via buildDrillLines() no mesmo .tcn.
 */

import type { SheetResult } from "../cutlayout/cutLayoutTypes";
import type { CncDrillOperation } from "./cncTypes";
import { getSettings } from "../settings/settingsService";

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

/** Espaçamento mínimo entre peças (mm) — HARNNETT TRACK: margem para diâmetro real da ferramenta. */
const MIN_SPACING_BETWEEN_PIECES_MM = 15;

/** Diâmetro nominal ferramenta 113 (mm) — usado para outset do toolpath quando kerf não definido. */
const TOOL_113_NOMINAL_DIAMETER_MM = 12;

/**
 * Gera pontos do contorno em modo CENTERLINE para corte EXTERNO (outsideCut).
 * (x, y, w, h) = retângulo da PEÇA na chapa. O centro da ferramenta deve circular FORA da peça.
 * Offset OUTWARD pelo raio da ferramenta: toolpath = peça outset por toolRadiusMm.
 * Assim a borda de corte fica exatamente no contorno da peça e a margem de segurança fica para fora.
 * Ordem dos pontos: CCW com a peça à direita (contorno externo).
 */
function buildContourPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  toolRadiusMm: number
): Array<{ x: number; y: number; z: number }> {
  const outset = Math.max(0, toolRadiusMm);
  const x0 = x - outset;
  const y0 = y - outset;
  const x1 = x + w + outset;
  const y1 = y + h + outset;
  return [
    { x: x0, y: y0, z },
    { x: x1, y: y0, z },
    { x: x1, y: y1, z },
    { x: x0, y: y1, z },
    { x: x0, y: y0, z },
  ];
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
  if (x < -EPSILON_MM || y < -EPSILON_MM) return false;
  if (x + w > sheetW + EPSILON_MM) return false;
  if (y + h > sheetH + EPSILON_MM) return false;
  return true;
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
  const cutterDiameterMm = Math.max(0, Number(runtimeSettings.nesting.kerfPadraoMm) || 0);
  const effectiveCutterDiameterMm = cutterDiameterMm > 0 ? cutterDiameterMm : TOOL_113_NOMINAL_DIAMETER_MM;
  const toolRadiusMm = effectiveCutterDiameterMm / 2;

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
      drills.push({
        x: pl.x_mm + hole.x,
        y: pl.y_mm + hole.y,
        z: 0,
        diametro: hole.diameter,
        profundidade: Math.min(hole.depth, thicknessMm),
        tipo: "vertical",
      });
    }
  });
  
  // Segundo: inserir operações de furação no início do bloco SIDE#1
  sideInnerLines.push(...buildDrillLines(drills));
  
  // Terceiro: operações de corte (apenas W#89 + W#2201 por peça — HARNNETT TRACK)
  sanitizedPlacements.forEach((pl) => {
    const w = pl.largura_mm;
    const h = pl.altura_mm;
    const x = pl.x_mm;
    const y = pl.y_mm;
    const points = buildContourPoints(x, y, w, h, zCut, toolRadiusMm);
    const firstPoint = points[0];
    sideInnerLines.push(buildToolBlock(firstPoint.x, firstPoint.y, zSafe));
    sideInnerLines.push(buildW2201(points, zCut));
  });
  
  lines.push(...buildSideBlock(1, dl, dh, ds, sideInnerLines, true));

  lines.push(...buildSideBlock(3, dl, ds, dh, [], false));
  lines.push(...buildSideBlock(4, dh, ds, dl, [], false));
  lines.push(...buildSideBlock(5, dl, ds, dh, [], false));
  lines.push(...buildSideBlock(6, dh, ds, dl, [], false));
  lines.push(...buildSideBlock(2, dl, dh, ds, [], false));

  return lines.join("\n");
}
