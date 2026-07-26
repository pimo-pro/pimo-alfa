/**
 * cncFormats.ts — Serialização de programas CNC para formatos físicos.
 * Conteúdo estruturado mínimo (genérico / SCM / Biesse / Homag / XML).
 */

import type {
  CncCutOperation,
  CncDrillOperation,
  CncPieceMeta,
  CncPocketOperation,
} from "./cncMapping";
import type { EuropeanCncFormat } from "./cncFileNaming";

/** Shape serializável (evita ciclo com cncBuilder). */
export type CncSerializableProgram = {
  meta: CncPieceMeta;
  cuts: CncCutOperation[];
  drills: CncDrillOperation[];
  pockets: CncPocketOperation[];
};

export function utf8ByteLength(text: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }
  return Buffer.byteLength(text, "utf8");
}

export function serializeCncProgram(
  program: CncSerializableProgram,
  format: EuropeanCncFormat
): string {
  switch (format) {
    case "xml":
      return toXml(program);
    case "mpr":
      return toMpr(program);
    case "cix":
      return toCix(program);
    case "bpp":
      return toBpp(program);
    case "cnc":
    default:
      return toGenericCnc(program);
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toGenericCnc(p: CncSerializableProgram): string {
  const m = p.meta;
  const lines: string[] = [
    `; PIMO European CNC (Modelo B)`,
    `; piece=${m.pieceCode} group=${m.group}`,
    `; material=${m.material} thickness=${m.thicknessMm}mm`,
    `; size=${m.widthMm}x${m.heightMm} tolerance=${m.toleranceMm}mm`,
    `; origin=${m.originXMm},${m.originYMm},${m.originZMm}`,
    `G21`,
    `G90`,
    `G0 X0 Y0`,
    `; --- CUT ---`,
  ];
  for (const c of p.cuts) {
    lines.push(`G0 X${c.x0} Y${c.y0}`);
    lines.push(`G1 X${c.x1} Y${c.y1}`);
  }
  lines.push(`; --- DRILL ---`);
  for (const d of p.drills) {
    lines.push(
      `G81 X${d.x} Y${d.y} Z-${d.depthMm} R2 F120 ; Ø${d.diameterMm} ${d.holeType} face=${d.face}`
    );
  }
  if (p.pockets.length) {
    lines.push(`; --- POCKET ---`);
    for (const pk of p.pockets) {
      lines.push(
        `G0 X${pk.x} Y${pk.y} ; pocket ${pk.widthMm}x${pk.heightMm} depth=${pk.depthMm}`
      );
    }
  }
  lines.push(`G80`);
  lines.push(`M30`);
  return lines.join("\n") + "\n";
}

function toXml(p: CncSerializableProgram): string {
  const m = p.meta;
  const cuts = p.cuts
    .map(
      (c) =>
        `    <Cut x0="${c.x0}" y0="${c.y0}" x1="${c.x1}" y1="${c.y1}" layer="${esc(c.layer)}" />`
    )
    .join("\n");
  const drills = p.drills
    .map(
      (d) =>
        `    <Drill x="${d.x}" y="${d.y}" diameter="${d.diameterMm}" depth="${d.depthMm}" face="${d.face}" holeType="${esc(d.holeType)}" />`
    )
    .join("\n");
  const pockets = p.pockets
    .map(
      (pk) =>
        `    <Pocket x="${pk.x}" y="${pk.y}" width="${pk.widthMm}" height="${pk.heightMm}" depth="${pk.depthMm}" />`
    )
    .join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<CNC piece="${esc(m.pieceCode)}" group="${m.group}" material="${esc(m.material)}" thickness="${m.thicknessMm}" width="${m.widthMm}" height="${m.heightMm}" tolerance="${m.toleranceMm}">`,
    `  <Origin x="${m.originXMm}" y="${m.originYMm}" z="${m.originZMm}" />`,
    `  <Operations>`,
    cuts,
    drills,
    pockets,
    `  </Operations>`,
    `</CNC>`,
    ``,
  ].join("\n");
}

function toMpr(p: CncSerializableProgram): string {
  const m = p.meta;
  const lines: string[] = [
    `[H`,
    `VERSION="4.0"`,
    `OP="1"`,
    `FM="1"`,
    `IN="PIMO_EUROPEAN"`,
    `BN="${m.pieceCode}"`,
    `GX="0"`,
    `GY="0"`,
    `GZ="0"`,
    `AX="0"`,
    `LPS="0"`,
    `]`,
    `[001`,
    `l="1"`,
    `W="${m.widthMm}"`,
    `L="${m.heightMm}"`,
    `T="${m.thicknessMm}"`,
    `MAT="${m.material}"`,
    `TOL="${m.toleranceMm}"`,
    `]`,
  ];
  let idx = 100;
  for (const c of p.cuts) {
    lines.push(`[${idx}`);
    lines.push(`KP="1"`);
    lines.push(`X="${c.x0}"`);
    lines.push(`Y="${c.y0}"`);
    lines.push(`X1="${c.x1}"`);
    lines.push(`Y1="${c.y1}"`);
    lines.push(`]`);
    idx += 1;
  }
  for (const d of p.drills) {
    lines.push(`[${idx}`);
    lines.push(`KM="BO"`);
    lines.push(`XA="${d.x}"`);
    lines.push(`YA="${d.y}"`);
    lines.push(`DU="${d.diameterMm}"`);
    lines.push(`TI="${d.depthMm}"`);
    lines.push(`]`);
    idx += 1;
  }
  lines.push(``);
  return lines.join("\n");
}

function toCix(p: CncSerializableProgram): string {
  const m = p.meta;
  const lines: string[] = [
    `BEGIN ID CID3`,
    `  REL= 5.0`,
    `  AXIS=0`,
    `END ID`,
    `BEGIN MAINDATA`,
    `  LPX=${m.widthMm}`,
    `  LPY=${m.heightMm}`,
    `  LPZ=${m.thicknessMm}`,
    `  ORN=0`,
    `  SIMMETRY=0`,
    `  TL="PIMO"`,
    `  UNIQUE="${m.pieceCode}"`,
    `END MAINDATA`,
  ];
  for (const c of p.cuts) {
    lines.push(`BEGIN MACRO`);
    lines.push(`  NAME=CUT_LINE`);
    lines.push(`  PARAM,NAME=X,VALUE=${c.x0}`);
    lines.push(`  PARAM,NAME=Y,VALUE=${c.y0}`);
    lines.push(`  PARAM,NAME=X1,VALUE=${c.x1}`);
    lines.push(`  PARAM,NAME=Y1,VALUE=${c.y1}`);
    lines.push(`END MACRO`);
  }
  for (const d of p.drills) {
    lines.push(`BEGIN MACRO`);
    lines.push(`  NAME=BV`);
    lines.push(`  PARAM,NAME=SIDE,VALUE=${d.face === "A" ? 0 : 1}`);
    lines.push(`  PARAM,NAME=CRN,VALUE="1"`);
    lines.push(`  PARAM,NAME=X,VALUE=${d.x}`);
    lines.push(`  PARAM,NAME=Y,VALUE=${d.y}`);
    lines.push(`  PARAM,NAME=DIAM,VALUE=${d.diameterMm}`);
    lines.push(`  PARAM,NAME=DP,VALUE=${d.depthMm}`);
    lines.push(`END MACRO`);
  }
  lines.push(``);
  return lines.join("\n");
}

function toBpp(p: CncSerializableProgram): string {
  const m = p.meta;
  const lines: string[] = [
    `[HEADER]`,
    `TYPE=0`,
    `ORIGIN=0`,
    `COMMENT=PIMO European ${m.pieceCode}`,
    ``,
    `[PARAM]`,
    `PAN=1`,
    `L=${m.widthMm}`,
    `H=${m.heightMm}`,
    `S=${m.thicknessMm}`,
    `MAT=${m.material}`,
    `TOL=${m.toleranceMm}`,
    ``,
    `[CUTTING]`,
  ];
  for (const c of p.cuts) {
    lines.push(`LINE,${c.x0},${c.y0},${c.x1},${c.y1}`);
  }
  lines.push(``);
  lines.push(`[HOLES]`);
  for (const d of p.drills) {
    lines.push(`HOLE,${d.x},${d.y},${d.diameterMm},${d.depthMm},${d.face}`);
  }
  lines.push(``);
  lines.push(`[END]`);
  lines.push(``);
  return lines.join("\n");
}
