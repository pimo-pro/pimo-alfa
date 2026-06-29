import fs from "node:fs";
import path from "node:path";

const extractDir = path.join(process.cwd(), "test-output/xlsm-extract");
const sheet2 = fs.readFileSync(path.join(extractDir, "xl/worksheets/sheet2.xml"), "utf8");
const sst = fs.readFileSync(path.join(extractDir, "xl/sharedStrings.xml"), "utf8");

function parseSharedStrings(xml) {
  const strings = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml))) {
    const chunk = m[1];
    const parts = [...chunk.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]);
    strings.push(parts.join("").replace(/&amp;/g, "&").replace(/&lt;/g, "<"));
  }
  return strings;
}

const shared = parseSharedStrings(sst);

const colsMatch = sheet2.match(/<cols>([\s\S]*?)<\/cols>/);
const cols = [...(colsMatch?.[1]?.matchAll(/<col min="(\d+)" max="(\d+)" width="([^"]+)"[^/]*\/>/g) ?? [])].map(
  (m) => ({ min: +m[1], max: +m[2], width: +m[3] })
);

// Excel col width to mm: approximately width * 7 / 25.4 * some factor
// Standard: character width in Excel units; 1 unit ≈ 7 pixels at default; 
// For landscape A4 297mm, print area A1:T355
// Excel width in "characters" - conversion: (width + 0.71) * 256 / 256 * 7 px, then to mm at 96dpi
function excelColWidthToMm(w) {
  // Office Open XML: width is max digit width of normal font * count + padding
  // Approximation used by many tools: mm = Truncate(((256 * width + Truncate(128/7)) / 256) * 7) / 96 * 25.4
  const px = Math.floor(((256 * w + Math.floor(128 / 7)) / 256) * 7);
  return (px / 96) * 25.4;
}

const colWidthsMm = cols.map((c) => ({
  ...c,
  mm: excelColWidthToMm(c.width),
}));

const pm = sheet2.match(/pageMargins[^/]*\/>/)?.[0] ?? "";
const left = pm.match(/left="([^"]+)"/)?.[1];
const right = pm.match(/right="([^"]+)"/)?.[1];
const top = pm.match(/top="([^"]+)"/)?.[1];
const bottom = pm.match(/bottom="([^"]+)"/)?.[1];

// inches to mm
const inchToMm = (v) => (+v * 25.4).toFixed(2);

// Row 20-21 headers
const row20 = sheet2.match(/<row r="20"[^>]*>([\s\S]*?)<\/row>/)?.[1] ?? "";
const row21 = sheet2.match(/<row r="21"[^>]*>([\s\S]*?)<\/row>/)?.[1] ?? "";

function cellTexts(rowXml) {
  const cells = [...rowXml.matchAll(/<c r="([A-Z]+)(\d+)"[^>]*(?: t="s")?[^>]*>(?:<v>(\d+)<\/v>)?/g)];
  return cells.map((m) => {
    const col = m[1];
    const idx = m[3];
    const val = idx !== undefined ? shared[+idx] ?? idx : "";
    return { col, val };
  });
}

const h20 = cellTexts(row20);
const h21 = cellTexts(row21);

// Data row height sample
const row22 = sheet2.match(/<row r="22"[^>]*ht="([^"]+)"/)?.[1];
const row20ht = sheet2.match(/<row r="20"[^>]*ht="([^"]+)"/)?.[1];
const defaultRh = sheet2.match(/defaultRowHeight="([^"]+)"/)?.[1];

const totalColMm = colWidthsMm.reduce((s, c) => {
  const span = c.max - c.min + 1;
  return s + c.mm * span;
}, 0);

const ps = sheet2.match(/pageSetup[^/]*\/>/)?.[0] ?? "";
const fit = sheet2.match(/pageSetUpPr[^/]*\/>/)?.[0] ?? "";

// Row heights in points -> mm (1 pt = 0.352778 mm)
const ptToMm = (pt) => (+pt * 0.352778).toFixed(2);

const rowHeightsSample = [20, 21, 22, 23, 24, 25, 30, 31].map((r) => {
  const m = sheet2.match(new RegExp(`<row r="${r}"[^>]*ht="([^"]+)"`));
  return { row: r, htPt: m?.[1] ?? defaultRh, htMm: ptToMm(m?.[1] ?? defaultRh ?? "12.75") };
});

// Proportional column widths for A-T (tecnico table) scaled to usable page width
const MARGIN = 4; // mm each side per user req (<=5)
const PAGE_W = 297;
const TABLE_W = PAGE_W - MARGIN * 2;

const excelColsAT = [
  { col: "A", key: "refPeca", w: 69 },
  { col: "B", key: "material", w: 64 },
  { col: "C", key: "matRef", w: 14.140625 },
  { col: "D", key: "qtd", w: 13.7109375 },
  { col: "E", key: "comp", w: 14.7109375 },
  { col: "F", key: "larg", w: 14.7109375 },
  { col: "G", key: "esp", w: 14.7109375 },
  { col: "H", key: "cnc", w: 7.42578125 }, // Excel NEST -> CNC per user
  { col: "I", key: "drill", w: 7.28515625 },
  { col: "J", key: "o2", w: 4.5703125 },
  { col: "K", key: "o3", w: 4.5703125 },
  { col: "L", key: "o4", w: 4.5703125 },
  { col: "M", key: "o5", w: 4.5703125 },
  { col: "N", key: "f2", w: 4.5703125 },
  { col: "O", key: "f3", w: 4.5703125 },
  { col: "P", key: "f4", w: 4.5703125 },
  { col: "Q", key: "f5", w: 4.5703125 },
  { col: "R", key: "go", w: 4.5703125 },
  { col: "S", key: "obs", w: 21 },
  { col: "T", key: "etq", w: 20.7109375 },
];
const totalW = excelColsAT.reduce((s, c) => s + c.w, 0);
const scaledCols = excelColsAT.map((c) => ({
  ...c,
  mm: Math.round((c.w / totalW) * TABLE_W * 10) / 10,
}));

console.log(
  JSON.stringify(
    {
      marginsInches: { left, right, top, bottom },
      marginsMm: {
        left: inchToMm(left),
        right: inchToMm(right),
        top: inchToMm(top),
        bottom: inchToMm(bottom),
      },
      pdfMarginMm: MARGIN,
      tableWidthMm: TABLE_W,
      pageSetup: ps,
      fitToPage: fit,
      scaledColsAT: scaledCols,
      scaledTotalMm: scaledCols.reduce((s, c) => s + c.mm, 0),
      rowHeightsSample,
      headerRow20: h20.filter((x) => x.val),
      headerRow21: h21.filter((x) => x.val),
    },
    null,
    2
  )
);
