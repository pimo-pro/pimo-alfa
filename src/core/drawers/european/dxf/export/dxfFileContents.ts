/**
 * dxfFileContents.ts — Gera conteúdos .dxf em memória (sem FS).
 */

import type { EuropeanDrawerResult } from "../../types";
import type { EuropeanDXFExport } from "../dxfExport";
import { EUROPEAN_DXF_LAYER_DEFS } from "../dxfLayers";
import {
  buildDxfFileName,
  DEFAULT_DXF_EXPORT_DIR,
  resolvePieceKeyFromCodigo,
  type EuropeanDxfPieceKey,
} from "./dxfFileNaming";
import { serializeEntitiesToDxf, utf8ByteLength } from "./dxfAscii";
import {
  buildDxfFileReport,
  type DxfExportedFileInfo,
  type DxfExportReport,
} from "./dxfFileReport";

export type DxfExportPieceSelection = EuropeanDxfPieceKey[];

export type DxfExportOptions = {
  outputDir?: string;
  prefix?: string;
  pieces?: DxfExportPieceSelection;
  write?: boolean;
};

function matchesPieceSelection(
  pieceCode: string,
  selection: DxfExportPieceSelection | undefined
): boolean {
  if (!selection || selection.length === 0) return true;
  const key = resolvePieceKeyFromCodigo(pieceCode);
  return key != null && selection.includes(key);
}

export type DxfPreparedFile = {
  fileName: string;
  pieceCode: string;
  content: string;
  entityCount: number;
};

/**
 * Prepara ficheiros DXF em memória a partir de result.dxf.
 */
export function prepareEuropeanDXFFiles(
  result: EuropeanDrawerResult,
  options?: Omit<DxfExportOptions, "write">
): { files: DxfPreparedFile[]; warnings: string[]; errors: string[]; outputDir: string } {
  const warnings: string[] = [];
  const errors: string[] = [];
  const outputDir = options?.outputDir?.trim() || DEFAULT_DXF_EXPORT_DIR;
  const files: DxfPreparedFile[] = [];

  const dxf: EuropeanDXFExport | undefined = result.dxf;
  if (!dxf?.document) {
    return {
      files: [],
      warnings,
      errors: ["result.dxf ausente — execute generateEuropeanDrawer com Modelo B activo."],
      outputDir,
    };
  }

  const { document } = dxf;
  const layers = document.layers.length ? document.layers : EUROPEAN_DXF_LAYER_DEFS;
  const contours = document.contours.filter((c) =>
    matchesPieceSelection(c.pieceCode, options?.pieces)
  );

  if (contours.length === 0) {
    warnings.push("Nenhum contorno selecionado para exportação.");
  }

  const usedNames = new Set<string>();

  for (const contour of contours) {
    let fileName = buildDxfFileName(contour.pieceCode, { prefix: options?.prefix });
    if (!fileName) {
      warnings.push(`Código sem mapeamento de ficheiro: ${contour.pieceCode}`);
      continue;
    }
    if (usedNames.has(fileName)) {
      fileName = fileName.replace(/\.dxf$/i, `_${contour.pieceCode}.dxf`);
    }
    usedNames.add(fileName);

    const entities = document.entities.filter((e) => e.pieceCode === contour.pieceCode);
    if (entities.length === 0) {
      warnings.push(`Peça ${contour.pieceCode} sem entidades DXF suficientes.`);
      continue;
    }
    if (entities.length < 4) {
      warnings.push(`Peça ${contour.pieceCode} com poucas entidades DXF (${entities.length}).`);
    }

    files.push({
      fileName,
      pieceCode: contour.pieceCode,
      content: serializeEntitiesToDxf(entities, layers, contour.origin),
      entityCount: entities.length,
    });
  }

  const coveredKeys = new Set(
    files.map((f) => resolvePieceKeyFromCodigo(f.pieceCode)).filter(Boolean)
  );
  for (const expected of ["front", "lat_dir", "lat_esq", "costa", "fundo"] as const) {
    if (!options?.pieces || options.pieces.includes(expected)) {
      if (!coveredKeys.has(expected)) {
        warnings.push(`Peça esperada não exportada: ${expected}`);
      }
    }
  }

  return { files, warnings, errors, outputDir };
}

export function buildEuropeanDXFFileContents(
  result: EuropeanDrawerResult,
  options?: Omit<DxfExportOptions, "write">
): Array<{ fileName: string; pieceCode: string; content: string }> {
  return prepareEuropeanDXFFiles(result, options).files.map((f) => ({
    fileName: f.fileName,
    pieceCode: f.pieceCode,
    content: f.content,
  }));
}

export function buildDxfExportReportFromPrepared(
  prepared: ReturnType<typeof prepareEuropeanDXFFiles>,
  writtenFiles: DxfExportedFileInfo[]
): DxfExportReport {
  return buildDxfFileReport({
    outputDir: prepared.outputDir,
    files: writtenFiles,
    warnings: prepared.warnings,
    errors: prepared.errors,
  });
}

export { utf8ByteLength };
