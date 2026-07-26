/**
 * cncBuilder.ts — Construção de programas CNC a partir de geometry/holes/dxf.
 * Sem alterar geometry real.
 */

import type { EuropeanDrawerResult } from "../types";
import {
  mapEuropeanResultToCncPieces,
  type CncCutOperation,
  type CncDrillOperation,
  type CncPieceMeta,
  type CncPocketOperation,
  type MappedCncPiece,
} from "./cncMapping";
import {
  buildCncFileName,
  DEFAULT_CNC_EXPORT_DIR,
  type EuropeanCncFormat,
  type EuropeanCncPieceKey,
} from "./cncFileNaming";
import { serializeCncProgram, utf8ByteLength } from "./cncFormats";
import {
  buildCncFileReport,
  type CncExportedFileInfo,
  type CncExportReport,
} from "./cncReport";

export type CncPieceProgram = {
  meta: CncPieceMeta;
  cuts: CncCutOperation[];
  drills: CncDrillOperation[];
  pockets: CncPocketOperation[];
  warnings: string[];
};

export type CncExportOptions = {
  outputDir?: string;
  prefix?: string;
  format?: EuropeanCncFormat;
  pieces?: EuropeanCncPieceKey[];
  write?: boolean;
};

export type CncPreparedFile = {
  fileName: string;
  pieceCode: string;
  format: EuropeanCncFormat;
  content: string;
  cutCount: number;
  drillCount: number;
  pocketCount: number;
};

/**
 * Constrói programas CNC por peça (estrutura em memória).
 */
export function buildEuropeanCncPrograms(
  result: EuropeanDrawerResult,
  options?: { pieces?: EuropeanCncPieceKey[] }
): CncPieceProgram[] {
  return mapEuropeanResultToCncPieces(result, options).map((p: MappedCncPiece) => ({
    meta: p.meta,
    cuts: p.cuts,
    drills: p.drills,
    pockets: p.pockets,
    warnings: p.warnings,
  }));
}

/**
 * Prepara ficheiros CNC em memória (sem FS).
 */
export function prepareEuropeanCNCFiles(
  result: EuropeanDrawerResult,
  options?: Omit<CncExportOptions, "write">
): {
  files: CncPreparedFile[];
  warnings: string[];
  errors: string[];
  outputDir: string;
  format: EuropeanCncFormat;
  industrialIntegrityOk: boolean;
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const format: EuropeanCncFormat = options?.format ?? "cnc";
  const outputDir = options?.outputDir?.trim() || DEFAULT_CNC_EXPORT_DIR;

  const industrialIntegrityOk =
    Boolean(result.geometry) &&
    Array.isArray(result.holes) &&
    result.geometry.externalWidthMm > 0;

  if (!industrialIntegrityOk) {
    errors.push("Resultado industrial incompleto (geometry/holes).");
    return { files: [], warnings, errors, outputDir, format, industrialIntegrityOk: false };
  }

  const programs = buildEuropeanCncPrograms(result, { pieces: options?.pieces });
  if (programs.length === 0) {
    warnings.push("Nenhuma peça CNC mapeada.");
  }

  const files: CncPreparedFile[] = [];
  const usedNames = new Set<string>();

  for (const prog of programs) {
    for (const w of prog.warnings) warnings.push(w);

    let fileName = buildCncFileName(prog.meta.pieceCode, {
      prefix: options?.prefix,
      format,
    });
    if (!fileName) {
      warnings.push(`Código sem mapeamento CNC: ${prog.meta.pieceCode}`);
      continue;
    }
    if (usedNames.has(fileName)) {
      fileName = fileName.replace(
        new RegExp(`\\.${format}$`, "i"),
        `_${prog.meta.pieceCode}.${format}`
      );
    }
    usedNames.add(fileName);

    if (prog.cuts.length === 0) {
      warnings.push(`Peça ${prog.meta.pieceCode} sem operações CUT.`);
    }

    files.push({
      fileName,
      pieceCode: prog.meta.pieceCode,
      format,
      content: serializeCncProgram(prog, format),
      cutCount: prog.cuts.length,
      drillCount: prog.drills.length,
      pocketCount: prog.pockets.length,
    });
  }

  const covered = new Set(files.map((f) => f.pieceCode));
  for (const expected of ["gav_fren", "gav_lat_dir", "gav_lat_esq", "gav_costa", "gav_fun"] as const) {
    const key =
      expected === "gav_fren"
        ? "front"
        : expected === "gav_lat_dir"
          ? "lat_dir"
          : expected === "gav_lat_esq"
            ? "lat_esq"
            : expected === "gav_costa"
              ? "costa"
              : "fundo";
    if (!options?.pieces || options.pieces.includes(key)) {
      if (!covered.has(expected)) {
        warnings.push(`Peça esperada não exportada: ${expected}`);
      }
    }
  }

  return { files, warnings, errors, outputDir, format, industrialIntegrityOk };
}

/** Conteúdos prontos para download/escrita. */
export function buildEuropeanCNCFileContents(
  result: EuropeanDrawerResult,
  options?: Omit<CncExportOptions, "write">
): Array<{ fileName: string; pieceCode: string; format: EuropeanCncFormat; content: string }> {
  return prepareEuropeanCNCFiles(result, options).files.map((f) => ({
    fileName: f.fileName,
    pieceCode: f.pieceCode,
    format: f.format,
    content: f.content,
  }));
}

export function buildCncExportReportFromPrepared(
  prepared: ReturnType<typeof prepareEuropeanCNCFiles>,
  files: CncExportedFileInfo[]
): CncExportReport {
  return buildCncFileReport({
    outputDir: prepared.outputDir,
    format: prepared.format,
    files,
    warnings: prepared.warnings,
    errors: prepared.errors,
    industrialIntegrityOk: prepared.industrialIntegrityOk,
  });
}

export { utf8ByteLength };
