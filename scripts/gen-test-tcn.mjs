/**
 * Script standalone — gera ficheiro TCN v1 com o algoritmo actual de buildContourPathV1.
 * Replica EXACTAMENTE a lógica de src/core/cnc/tcnGenerator.ts (sem imports).
 * Executar: node scripts/gen-test-tcn.mjs
 *
 * Configurações usadas (defaults do sistema):
 *   diametroFresaContornoMm : 0  → toolDiameter = 12mm (TOOL_113), R = 6mm
 *   compensacaoFerramenta   : "fora"  → toolOffsetMm = R = 6mm
 *   rampDistanceMm          : 20mm
 *   zSafetyMm               : 10mm
 *   minSpacingMm            : 15mm
 *   sheetMarginMm           : 10mm
 *   tcnMetodo               : "v1_corner"
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Constantes ────────────────────────────────────────────────────────────
const HEADER = "TPA\\ALBATROS\\EDICAD\\00.00:0";
const EPSILON_MM = 0.001;
const TOOL_113_NOMINAL_DIAMETER_MM = 12;   // diâmetro nominal quando setting=0
const Z_SAFETY_MM = 10;
const EXIT_OVERRUN_MM = 20;

// ─── Configurações (defaults do sistema) ───────────────────────────────────
const settings = {
  diametroFresaContornoMm : 0,       // 0 → usa nominal 12mm
  compensacaoFerramenta   : "fora",  // "fora" = offset exterior completo
  rampDistanceMm          : 20,
  zSafetyMm               : 10,
  minSpacingMm            : 15,
  sheetMarginMm           : 10,
};
const toolDiameterMm  = settings.diametroFresaContornoMm > 0
  ? settings.diametroFresaContornoMm
  : TOOL_113_NOMINAL_DIAMETER_MM;
const toolRadiusMm   = toolDiameterMm / 2;                           // R = 6mm
const toolOffsetMm   = settings.compensacaoFerramenta === "dentro" ? 0 : toolRadiusMm; // 6mm
const rampDistMm     = settings.rampDistanceMm;                      // 20mm
const zSafe          = settings.zSafetyMm;                           // 10mm

console.log(`\n  ╔═══════════════════════════════════════════════════════╗`);
console.log(`  ║   PIMO TCN Generator — Simulação Standalone v1        ║`);
console.log(`  ╚═══════════════════════════════════════════════════════╝`);
console.log(`\n  Configurações activas:`);
console.log(`    toolDiâmetro    = ${toolDiameterMm}mm  (R = ${toolRadiusMm}mm)`);
console.log(`    compensação     = ${settings.compensacaoFerramenta}  → toolOffsetMm = ${toolOffsetMm}mm`);
console.log(`    rampDist        = ${rampDistMm}mm`);
console.log(`    zSafe           = ${zSafe}mm`);
console.log(`    minSpacing      = ${settings.minSpacingMm}mm`);
console.log(`    sheetMargin     = ${settings.sheetMarginMm}mm\n`);

// ─── Chapa ───────────────────────────────────────────────────────────────────
// Armário 400×1800×300, espessura 19mm, sem costa, sem prateleiras
// Chapa MDF Branco 19mm: DL=2800 × DH=2070
const sheet = {
  largura_mm   : 2800,
  altura_mm    : 2070,
  espessura_mm : 19,
  materialName : "MDF Branco 19mm",
};

// ─── Peças calculadas (gerarPaineis — calcularAlturaLaterais: true) ──────────
//   Cima     : largura × profundidade = 400 × 300
//   Fundo    : largura × profundidade = 400 × 300
//   Lat Esq  : profundidade × (altura − 2×esp) = 300 × 1762
//   Lat Dir  : profundidade × (altura − 2×esp) = 300 × 1762
//
// Nesting manual (top-right origin, kerf = minSpacing+2R = 15+12 = 27mm):
//   Lat Esq : x=10, y=10
//   Lat Dir : x=10+300+27=337, y=10
//   Cima    : x=337+300+27=664, y=10
//   Fundo   : x=664+400+27=1091, y=10
// Todas ficam dentro de x≤2790, y≤2060 → passam sanitize ✓
const placements = [
  {
    id       : "P1",
    partName : "Lateral Esq (300×1762)",
    x_mm     : 10,   y_mm: 10, largura_mm: 300, altura_mm: 1762,
    rotacao  : 0,
    drillHoles: [],   // sem furos laterais
  },
  {
    id       : "P2",
    partName : "Lateral Dir (300×1762)",
    x_mm     : 337,  y_mm: 10, largura_mm: 300, altura_mm: 1762,
    rotacao  : 0,
    drillHoles: [],
  },
  {
    id       : "P3",
    partName : "Cima (400×300)",
    x_mm     : 664,  y_mm: 10, largura_mm: 400, altura_mm: 300,
    rotacao  : 0,
    drillHoles: [],
  },
  {
    id       : "P4",
    partName : "Fundo (400×300)",
    x_mm     : 1091, y_mm: 10, largura_mm: 400, altura_mm: 300,
    rotacao  : 0,
    drillHoles: [],
  },
];

// ─── Formatadores ───────────────────────────────────────────────────────────
const fmt  = (n) => Number.isFinite(n) ? n.toFixed(2) : "0.00";
const fmtZ = (n) => {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n);
  return Math.abs(n - r) < 0.0001 ? String(r) : n.toFixed(2);
};
const intVal = (n) => Math.round(Number.isFinite(n) ? n : 0);

// ─── Transformação de coordenadas ────────────────────────────────────────────
// CUT_LAYOUT_X_ORIGIN = "right" → toLayoutAbsoluteX(x, sheetW) = sheetW - x
// flipToTopRight(x, y, maxW, maxH)  → { x: maxW - x, y: maxH - y }
// Resultado: TCN.x = x_layout, TCN.y = sheetH - y_layout (quando maxW=sheetW, maxH=sheetH)
const maxW = sheet.largura_mm;
const maxH = sheet.altura_mm;

function transformToTcn(px, py) {
  const xAbs   = sheet.largura_mm - px;   // toLayoutAbsoluteX
  const tcnX   = maxW - xAbs;             // flipToTopRight X
  const tcnY   = maxH - py;               // flipToTopRight Y
  return { x: tcnX, y: tcnY };
}

// ─── buildContourPathV1 (Y-ramp — protocolo fábrica) ────────────────────────
function buildContourPathV1(x, y, w, h, R, thicknessMm, zSf, rampDist) {
  const x0     = x - R;
  const x1     = x + w + R;
  const y0     = y - R;
  const y1     = y + h + R;
  const eyBase = (y0 + y1) / 2;
  const zCut   = -Math.abs(thicknessMm);

  const w89 = { x: x0, y: eyBase + rampDist };

  const yExit = Math.max(y0, eyBase - EXIT_OVERRUN_MM);
  const yLift = Math.max(y0, eyBase - EXIT_OVERRUN_MM - rampDist);

  const path = [
    { x: x0, y: eyBase, z: zCut },
    { x: x0, y: y0,     z: zCut },
    { x: x1, y: y0,     z: zCut },
    { x: x1, y: y1,     z: zCut },
    { x: x0, y: y1,     z: zCut },
    { x: x0, y: eyBase, z: zCut },
    { x: x0, y: yExit,  z: zCut },
    { x: x0, y: yLift,  z: zSf  },
  ];
  return { w89, path };
}

// ─── sanitize ────────────────────────────────────────────────────────────────
function rectToolCenter(x, y, w, h, R) {
  return { x0: x - R, y0: y - R, x1: x + w + R, y1: y + h + R };
}
function isInsideSheet(x, y, w, h) {
  if (x < -EPSILON_MM || y < -EPSILON_MM) return false;
  if (x + w > sheet.largura_mm + EPSILON_MM) return false;
  if (y + h > sheet.altura_mm + EPSILON_MM) return false;
  return true;
}
function sanitize(pls) {
  const minFromEdge = Math.max(0, settings.sheetMarginMm - toolRadiusMm); // 10-6=4mm
  const ok = [];
  const placed = [];
  for (const pl of pls) {
    const { x_mm: x, y_mm: y, largura_mm: w, altura_mm: h } = pl;
    if (!isInsideSheet(x, y, w, h)) {
      console.log(`  [SANITIZE] ❌ ${pl.partName}: fora da chapa`); continue;
    }
    const c = rectToolCenter(x, y, w, h, toolRadiusMm);
    if (c.x0 < -minFromEdge || c.y0 < -minFromEdge || c.x1 > sheet.largura_mm + minFromEdge || c.y1 > sheet.altura_mm + minFromEdge) {
      console.log(`  [SANITIZE] ❌ ${pl.partName}: contorno fora (x0=${c.x0.toFixed(1)} y0=${c.y0.toFixed(1)} x1=${c.x1.toFixed(1)} y1=${c.y1.toFixed(1)})`); continue;
    }
    const tooClose = placed.some(r => {
      const dx = Math.max(0, Math.max(r.x-(x+w), x-(r.x+r.w)));
      const dy = Math.max(0, Math.max(r.y-(y+h), y-(r.y+r.h)));
      return Math.sqrt(dx*dx+dy*dy) < settings.minSpacingMm - EPSILON_MM;
    });
    if (tooClose) { console.log(`  [SANITIZE] ❌ ${pl.partName}: demasiado próxima`); continue; }
    console.log(`  [SANITIZE] ✅ ${pl.partName}: aceite (x=${x} y=${y} w=${w} h=${h})`);
    placed.push({ x, y, w, h });
    ok.push(pl);
  }
  return ok;
}

// ─── buildW2201 ──────────────────────────────────────────────────────────────
function buildW2201(points, zSf) {
  const isSame = (a, b) => Math.abs(a.x-b.x)<EPSILON_MM && Math.abs(a.y-b.y)<EPSILON_MM && Math.abs(a.z-b.z)<0.02;
  const compact = [];
  for (const p of points) {
    const last = compact[compact.length-1];
    if (!last || !isSame(last, p)) compact.push(p);
  }
  if (compact.length === 0) return "";
  const feedIdx = compact.length > 1 && Math.abs(compact[0].z - zSf) < 0.02 ? 1 : 0;
  return compact.map((p, i) => {
    const flag = i === feedIdx ? " #2008=8" : "";
    return `W#2201{ ::WTl #8015=0 #1=${fmt(p.x)} #2=${fmt(p.y)} #3=${fmtZ(p.z)}${flag} }W`;
  }).join("\n");
}

// ─── buildW81 ────────────────────────────────────────────────────────────────
function buildW81(x, y, depth, diameter) {
  return `W#81{ ::WTs WS=1 #8015=0 #1=${fmt(x)} #2=${fmt(y)} #3=${fmtZ(-Math.abs(depth))} #1002=${fmt(diameter)} #2008=1000 #2002=18000 #201=1 #203=1 #1001=0 }W`;
}

// ─── Geração TCN ─────────────────────────────────────────────────────────────
console.log("\n  ── Sanitize ─────────────────────────────────────────────\n");
const validPlacements = sanitize(placements);

const lines = [];
lines.push(HEADER);
lines.push(`$=Acam Name=MDF_Branco_19mm`);
lines.push(`::UNm DL=${intVal(sheet.largura_mm)} DH=${intVal(sheet.altura_mm)} DS=${intVal(sheet.espessura_mm)} OX=0 OY=0 OZ=0`);
lines.push("VAR{");
lines.push("}VAR");
lines.push("OPTI{");
lines.push("}OPTI");

const sideInner = [];

// Loop 1 — todos os W#81 (furos)
console.log("\n  ── Loop 1: Furos W#81 ───────────────────────────────────\n");
for (const pl of validPlacements) {
  const holes = pl.drillHoles ?? pl.holes ?? [];
  for (const h of holes) {
    if (h.topDrillable === false) {
      console.log(`  [W#81] ⏭ ${pl.partName} furo d=${h.diameter}mm em (${h.x},${h.y}) — topDrillable=false → ignorado`);
      continue;
    }
    // holeLocalToSheetOffsetMm (rotacao=0: sx=hx, sy=hy)
    const rot = ((pl.rotacao ?? 0) % 360 + 360) % 360;
    const sx = rot === 90 ? h.y : h.x;
    const sy = rot === 90 ? h.x : h.y;
    const layoutX = pl.x_mm + sx;
    const layoutY = pl.y_mm + sy;
    const tcn = transformToTcn(layoutX, layoutY);
    const line = buildW81(tcn.x, tcn.y, h.depth, h.diameter);
    console.log(`  [W#81] ✅ ${pl.partName} d=${h.diameter}mm — layout(${layoutX},${layoutY}) → TCN(${tcn.x.toFixed(2)},${tcn.y.toFixed(2)}) → ${line}`);
    sideInner.push(line);
  }
}

// Loop 2 — todos os W#89+W#2201 (contornos exteriores)
console.log("\n  ── Loop 2: Contornos W#89+W#2201 ───────────────────────\n");
for (const pl of validPlacements) {
  const x = pl.x_mm, y = pl.y_mm, w = pl.largura_mm, h = pl.altura_mm;
  const R = toolOffsetMm;
  const thk = sheet.espessura_mm;

  const result = buildContourPathV1(x, y, w, h, R, thk, zSafe, rampDistMm);

  // Clamp W#89 aos limites da chapa
  const w89x = Math.max(0, Math.min(result.w89.x, sheet.largura_mm));
  const w89y = Math.max(0, Math.min(result.w89.y, sheet.altura_mm));
  const w89T = transformToTcn(w89x, w89y);
  const w89Line = `W#89{ ::WTs WS=1 #8015=0 #1=${fmt(w89T.x)} #2=${fmt(w89T.y)} #3=${fmtZ(zSafe)} #205=113 #1001=100 #2005=3 #2002=21000 #40=1 }W`;

  const pathT = result.path.map(p => {
    const t = transformToTcn(p.x, p.y);
    return { x: t.x, y: t.y, z: p.z };
  });
  const w2201Lines = buildW2201(pathT, zSafe);

  console.log(`  [W#89+W#2201] ${pl.partName}`);
  console.log(`    Layout: x=${x} y=${y} w=${w} h=${h} R=${R}`);
  const c = { x0: x-R, y0: y-R, x1: x+w+R, y1: y+h+R };
  const eyBase = (c.y0+c.y1)/2;
  console.log(`    Contorno exterior: x0=${c.x0} y0=${c.y0} x1=${c.x1} y1=${c.y1}`);
  console.log(`    eyBase (centro Y) = ${eyBase.toFixed(2)}mm`);
  console.log(`    W#89 layout=(${w89x.toFixed(2)}, ${w89y.toFixed(2)}) → TCN=(${w89T.x.toFixed(2)}, ${w89T.y.toFixed(2)})`);
  console.log(`    W#2201 (${pathT.length} linhas):`);
  pathT.forEach((p,i) => console.log(`      [${i}] X=${p.x.toFixed(2)} Y=${p.y.toFixed(2)} Z=${fmtZ(p.z)}`));

  sideInner.push(w89Line);
  sideInner.push(w2201Lines);
}

// ─── SIDE blocks (formato exacto TPA) ────────────────────────────────────────
const DL = intVal(sheet.largura_mm);
const DH = intVal(sheet.altura_mm);
const DS = intVal(sheet.espessura_mm);

// SIDE#1 — top (face de operações): $=top + ::NSEQ=1
lines.push("}SIDE");
lines.push("SIDE#1{");
lines.push("$=top");
lines.push(`::LF=${DL} HF=${DH} SF=${DS}`);
lines.push("::NSEQ=1");
for (const l of sideInner) { if (l !== "}") lines.push(l); }
lines.push("}SIDE");

// SIDE#3 — front: $=front, sem ::NSEQ
lines.push("SIDE#3{");
lines.push("$=front");
lines.push(`::LF=${DL} HF=${DS} SF=${DH}`);
lines.push("}SIDE");

// SIDE#4 — right: $=right, sem ::NSEQ
lines.push("SIDE#4{");
lines.push("$=right");
lines.push(`::LF=${DH} HF=${DS} SF=${DL}`);
lines.push("}SIDE");

// SIDE#5 — back: $=back, sem ::NSEQ
lines.push("SIDE#5{");
lines.push("$=back");
lines.push(`::LF=${DL} HF=${DS} SF=${DH}`);
lines.push("}SIDE");

// SIDE#6 — left: $=left, sem ::NSEQ
lines.push("SIDE#6{");
lines.push("$=left");
lines.push(`::LF=${DH} HF=${DS} SF=${DL}`);
lines.push("}SIDE");

// SIDE#2 — bottom: $=bottom, sem ::NSEQ (deve ser o último)
lines.push("SIDE#2{");
lines.push("$=bottom");
lines.push(`::LF=${DL} HF=${DH} SF=${DS}`);
lines.push("}SIDE");

const tcnContent = lines.join("\n");

// ─── Output ──────────────────────────────────────────────────────────────────
const outPath = join(__dirname, "armario_400x1800x300_v1.tcn");
writeFileSync(outPath, tcnContent, "utf8");

console.log("\n  ── Ficheiro TCN gerado ───────────────────────────────────\n");
console.log(tcnContent);
console.log(`\n  ✅ Ficheiro guardado em: ${outPath}`);
