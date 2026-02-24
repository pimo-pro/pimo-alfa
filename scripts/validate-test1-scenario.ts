import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cutlistToPieces, runCutLayout } from "../src/core/cutlayout/cutLayoutEngine";
import { exportCncFiles } from "../src/core/cnc/cncExport";
import type { CutLayoutResult } from "../src/core/cutlayout/cutLayoutTypes";

type ParsedPiece = {
  partName: string;
  boxId: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = join(__dirname, "cnc-examples-output", "TEST 1.txt");
const OUT_DIR = join(__dirname, "cnc-examples-output");
const OUT_PROJECT_DIR = join(__dirname, "cnc-output", "TEST_1_FINAL");

function parseHeader(content: string): { dl: number; dh: number; ds: number } {
  const m = content.match(/::UNm\s+DL=(\d+)\s+DH=(\d+)\s+DS=(\d+)/);
  if (!m) throw new Error("Header ::UNm DL/DH/DS não encontrado em TEST 1.txt");
  return { dl: Number(m[1]), dh: Number(m[2]), ds: Number(m[3]) };
}

function parsePiecesFromTcn(content: string, thickness: number): ParsedPiece[] {
  const lines = content.split(/\r?\n/);
  const pieces: ParsedPiece[] = [];

  for (let i = 0; i < lines.length; i++) {
    const pieceMatch = lines[i].match(/^;PIECE\s+(.+?)\s+\((.*?)\)\s+#\d+/);
    if (!pieceMatch) continue;
    const partName = pieceMatch[1];
    const boxId = pieceMatch[2];

    const points: Array<{ x: number; y: number }> = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].startsWith(";PIECE")) break;
      const w2200 = lines[j].match(/^W#2200\s+X=([0-9]+(?:\.[0-9]+)?)\s+Y=([0-9]+(?:\.[0-9]+)?)/);
      if (w2200) {
        points.push({ x: Number(w2200[1]), y: Number(w2200[2]) });
        if (points.length >= 5) break;
      }
    }
    if (points.length < 4) continue;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const largura_mm = Math.max(...xs) - Math.min(...xs);
    const altura_mm = Math.max(...ys) - Math.min(...ys);
    pieces.push({
      partName,
      boxId,
      largura_mm: Math.round(largura_mm),
      altura_mm: Math.round(altura_mm),
      espessura_mm: thickness,
    });
  }
  return pieces;
}

function buildLayoutValidation(result: CutLayoutResult) {
  const sheets = result.sheets.map((s, idx) => {
    const sheetArea = s.sheet.largura_mm * s.sheet.altura_mm;
    const usedArea = s.placements.reduce((acc, p) => acc + p.largura_mm * p.altura_mm, 0);
    const utilizationPercent = sheetArea > 0 ? (usedArea / sheetArea) * 100 : 0;
    const outOfBounds = s.placements.filter(
      (p) =>
        p.x_mm < 0 ||
        p.y_mm < 0 ||
        p.x_mm + p.largura_mm > s.sheet.largura_mm + 0.001 ||
        p.y_mm + p.altura_mm > s.sheet.altura_mm + 0.001
    );
    return {
      sheetIndex: idx,
      largura_mm: s.sheet.largura_mm,
      altura_mm: s.sheet.altura_mm,
      utilizationPercent: Number(utilizationPercent.toFixed(2)),
      placementCount: s.placements.length,
      outOfBoundsCount: outOfBounds.length,
    };
  });

  const rotated = result.sheets.flatMap((s, sheetIndex) =>
    s.placements
      .filter((p) => p.rotacao === 90)
      .map((p) => ({
        id: `${p.partName} (${p.boxId})`,
        angle: p.rotacao,
        sheetIndex,
        x_mm: p.x_mm,
        y_mm: p.y_mm,
      }))
  );

  return { sheets, rotated };
}

function analyzeTcnCompatibility(tcn: string, dl: number, dh: number) {
  const hasW81 = /W#81\{/.test(tcn);
  const hasW2200 = /W#2200\s+X=/.test(tcn);
  const hasW2201 = /W#2201\s+X=/.test(tcn);
  const w2200Count = (tcn.match(/W#2200\s+X=/g) ?? []).length;
  const w2201Count = (tcn.match(/W#2201\s+X=/g) ?? []).length;

  const coords = Array.from(tcn.matchAll(/(?:X=|#1=)([0-9]+(?:\.[0-9]+)?).*(?:Y=|#2=)([0-9]+(?:\.[0-9]+)?)/g));
  let maxX = 0;
  let maxY = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  for (const m of coords) {
    const x = Number(m[1]);
    const y = Number(m[2]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
    }
  }
  const boundsOk = minX >= -0.001 && minY >= -0.001 && maxX <= dl + 0.001 && maxY <= dh + 0.001;

  return {
    hasW81,
    hasW2200,
    hasW2201,
    w2200Count,
    w2201Count,
    sameContourCount: w2200Count === w2201Count,
    boundsOk,
    minX: Number.isFinite(minX) ? minX : 0,
    minY: Number.isFinite(minY) ? minY : 0,
    maxX,
    maxY,
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(OUT_PROJECT_DIR, { recursive: true });
  const raw = await readFile(INPUT_FILE, "utf8");
  const { dl, dh, ds } = parseHeader(raw);
  const parsedPieces = parsePiecesFromTcn(raw, ds);
  if (parsedPieces.length === 0) {
    throw new Error("Nenhuma peça foi identificada em TEST 1.txt");
  }

  const items = parsedPieces.map((p) => ({
    dimensoes: { largura: p.largura_mm, altura: p.altura_mm, profundidade: p.espessura_mm },
    espessura: p.espessura_mm,
    quantidade: 1,
    boxId: p.boxId,
    nome: p.partName,
  }));

  const pieces = cutlistToPieces(items);
  const baseSheet = { largura_mm: dl, altura_mm: dh, espessura_mm: ds };

  const result = runCutLayout(pieces, baseSheet, {
    groupByThicknessOnly: true,
    rotationPreferenceMode: "aggressive",
    rotationWeight: 0.8,
    rotationPenalty: 0.45,
    collectDiagnostics: true,
  });

  const resultNoRotation = runCutLayout(pieces, baseSheet, {
    groupByThicknessOnly: true,
    rotationPreferenceMode: "disabled",
    collectDiagnostics: true,
  });

  const cnc = exportCncFiles({ projectName: "TEST_1_FINAL" }, result, []);
  if (cnc.files.length === 0) throw new Error("Nenhum arquivo CNC foi gerado.");

  for (const file of cnc.files) {
    const panelTcnPath = join(OUT_PROJECT_DIR, `${file.filenameBase}.tcn`);
    await writeFile(panelTcnPath, file.tcn, "utf8");
  }

  const cncFile = cnc.files[0];

  const finalTcnPath = join(OUT_DIR, "TEST 1 FINAL.tcn");
  const finalTxtPath = join(OUT_DIR, "TEST 1 FINAL.txt");
  await writeFile(finalTcnPath, cncFile.tcn, "utf8");
  await writeFile(finalTxtPath, cncFile.tcn, "utf8");

  const layoutValidation = buildLayoutValidation(result);
  const noRotValidation = buildLayoutValidation(resultNoRotation);
  const compatibility = analyzeTcnCompatibility(cncFile.tcn, dl, dh);

  const placedCount = result.sheets.reduce((acc, s) => acc + s.placements.length, 0);
  const rejectedCount = Math.max(0, pieces.length - placedCount);
  const rotationInfluence =
    layoutValidation.rotated.length > 0 ||
    result.sheets.length < resultNoRotation.sheets.length ||
    layoutValidation.sheets.some((s, i) => s.utilizationPercent > (noRotValidation.sheets[i]?.utilizationPercent ?? 0));

  const report = {
    scenario: "TEST 1",
    input: {
      sourceFile: INPUT_FILE,
      pieceCount: pieces.length,
      sheet: { dl, dh, ds },
      pieces: parsedPieces.map((p) => ({
        id: `${p.partName} (${p.boxId})`,
        largura_mm: p.largura_mm,
        altura_mm: p.altura_mm,
      })),
    },
    output: {
      totalSheets: result.sheets.length,
      occupancyBySheetPercent: layoutValidation.sheets.map((s) => ({
        sheetIndex: s.sheetIndex,
        utilizationPercent: s.utilizationPercent,
        placementCount: s.placementCount,
      })),
      rotatedPieces: layoutValidation.rotated,
      rejectedByLimit: result.diagnostics?.rejectedByLimit ?? [],
      rejectedByCountFallback: rejectedCount,
      gapFillPlacements: result.diagnostics?.gapFillPlacements ?? [],
    },
    checks: {
      noneOutsideSheet: layoutValidation.sheets.every((s) => s.outOfBoundsCount === 0),
      rotationInfluencesNesting: rotationInfluence,
      skylineReorderGapFillActive: {
        skyline: result.diagnostics?.flow.skylineEnabled ?? true,
        reorder: result.diagnostics?.flow.reorderEnabled ?? true,
        gapFill: result.diagnostics?.flow.gapFillEnabled ?? true,
        gapFillAttempts: result.diagnostics?.flow.gapFillAttempts ?? 0,
        rescueAttempts: result.diagnostics?.flow.rescueAttempts ?? 0,
        rotationMode: result.diagnostics?.flow.rotationPreferenceMode ?? "aggressive",
      },
      tcnCompatibility: compatibility,
      noRotationBaseline: {
        totalSheets: resultNoRotation.sheets.length,
        occupancyBySheetPercent: noRotValidation.sheets.map((s) => ({
          sheetIndex: s.sheetIndex,
          utilizationPercent: s.utilizationPercent,
        })),
      },
    },
    generatedFiles: {
      tcn: finalTcnPath,
      txt: finalTxtPath,
      perPanelDir: OUT_PROJECT_DIR,
    },
  };

  const reportJsonPath = join(OUT_DIR, "TEST 1 VALIDATION REPORT.json");
  const reportTxtPath = join(OUT_DIR, "TEST 1 VALIDATION REPORT.txt");
  await writeFile(reportJsonPath, JSON.stringify(report, null, 2), "utf8");

  const reportTxt = [
    "VALIDACAO AUTOMATICA - TEST 1",
    `Total de chapas: ${report.output.totalSheets}`,
    `Ocupacao por chapa: ${report.output.occupancyBySheetPercent.map((s) => `S${s.sheetIndex}=${s.utilizationPercent}%`).join(" | ")}`,
    `Rotacionadas: ${report.output.rotatedPieces.length}`,
    `Rejeitadas por limite: ${report.output.rejectedByLimit.length}`,
    `Gap-fill placements: ${report.output.gapFillPlacements.length}`,
    `Limites OK: ${report.checks.noneOutsideSheet}`,
    `Rotacao influencia: ${report.checks.rotationInfluencesNesting}`,
    `Skyline/Reorder/Gap-fill ativos: ${report.checks.skylineReorderGapFillActive.skyline}/${report.checks.skylineReorderGapFillActive.reorder}/${report.checks.skylineReorderGapFillActive.gapFill}`,
    `TCN compatibilidade estrutural: W81=${report.checks.tcnCompatibility.hasW81} W2200=${report.checks.tcnCompatibility.hasW2200} W2201=${report.checks.tcnCompatibility.hasW2201} Bounds=${report.checks.tcnCompatibility.boundsOk}`,
    `Arquivo CNC final: ${finalTcnPath}`,
  ].join("\n");
  await writeFile(reportTxtPath, reportTxt, "utf8");

  console.log("Relatório gerado:", reportJsonPath);
  console.log("Resumo:", reportTxtPath);
  console.log("CNC final:", finalTcnPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

