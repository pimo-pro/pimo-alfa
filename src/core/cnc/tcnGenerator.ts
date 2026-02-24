/**
 * Geração de ficheiro TCN (Nesting) — padrão ALBATROS/EDICAD.
 * Blocos SIDE no formato exato da máquina: }SIDE, SIDE#N{ $=top ::LF=DL HF=DH SF=DS ::NSEQ=N }.
 * LF/HF/SF = dimensões da chapa (DL, DH, DS). W#81 iniciais dentro de SIDE#1.
 */

import type { SheetResult } from "../cutlayout/cutLayoutTypes";

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

function buildContourPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  z: number
): Array<{ x: number; y: number; z: number }> {
  return [
    { x, y, z },
    { x: x + w, y, z },
    { x: x + w, y: y + h, z },
    { x, y: y + h, z },
    { x, y, z },
  ];
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

/** Bloco W#89 no formato ALBATROS real. */
function buildToolBlock(x: number, y: number, z: number): string {
  return `W#89{ ::WTs WS=1 #8015=0 #1=${fmt(x)} #2=${fmt(y)} #3=${fmt(z)} #205=113 #1001=100 #2005=3 #2002=21000 #40=1 }W`;
}

/**
 * W#81 no formato exato da máquina (evita Erro 284).
 * Formato: W#81{ ::WTs WS=1 #8015=0 #1=<X> #2=<Y> #3=<Z> #1002=10 #201=1 #203=1 #1001=0 }W
 */
function buildW81(points: Array<{ x: number; y: number; z: number }>, zSafety: number): string {
  return points
    .map(
      (p) =>
        `W#81{ ::WTs WS=1 #8015=0 #1=${fmt(p.x)} #2=${fmt(p.y)} #3=${fmt(zSafety)} #1002=10 #201=1 #203=1 #1001=0 }W`
    )
    .join("\n");
}

/**
 * W#2201 no formato original ALBATROS/EDICAD:
 * W#2201{ ::WTl #8015=0 #1=<X> #2=<Y> #3=<Z> [#2008=8] }W
 * - primeiro ponto: inclui #2008=8
 * - último ponto (retorno): #3=10 (saída)
 */
function buildW2201(
  points: Array<{ x: number; y: number; z: number }>,
  zCut: number
): string {
  const lastIndex = points.length - 1;
  return points.map((p, i) => {
    const z = i === lastIndex ? 10 : zCut;
    const startFlag = i === 0 ? " #2008=8" : "";
    return `W#2201{ ::WTl #8015=0 #1=${fmt(p.x)} #2=${fmt(p.y)} #3=${fmtZ(z)}${startFlag} }W`;
  }).join("\n");
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
 * Gera TCN para um painel (sheet) único.
 * - Header: DL, DH, DS do próprio painel.
 * - SIDE#1 com operações W#81/W#89/W#2201 somente das peças desse painel.
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
  const zTool = Number(Math.abs(zCut).toFixed(2));

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
  const sideInnerLines: string[] = [];
  placements.forEach((pl) => {
    const w = pl.largura_mm;
    const h = pl.altura_mm;
    const x = pl.x_mm;
    const y = pl.y_mm;
    const points = buildContourPoints(x, y, w, h, zCut);
    const firstPoint = points[0];
    sideInnerLines.push(buildW81(points, Z_SAFETY_MM));
    sideInnerLines.push(buildToolBlock(firstPoint.x, firstPoint.y, zTool));
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
