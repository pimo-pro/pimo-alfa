/**
 * dxfFileWriter.ts — Escrita de ficheiros .dxf físicos (Node FS).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { EuropeanDrawerResult } from "../../types";
import {
  buildDxfExportReportFromPrepared,
  prepareEuropeanDXFFiles,
  utf8ByteLength,
  type DxfExportOptions,
} from "./dxfFileContents";
import type { DxfExportedFileInfo, DxfExportReport } from "./dxfFileReport";

export type { DxfExportOptions, DxfExportPieceSelection } from "./dxfFileContents";
export { buildEuropeanDXFFileContents, prepareEuropeanDXFFiles } from "./dxfFileContents";
export { serializeEntitiesToDxf } from "./dxfAscii";

function canUseNodeFs(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node);
}

/**
 * Exporta ficheiros .dxf físicos a partir de result.dxf.
 * Não altera o result.
 */
export function exportEuropeanDXFFiles(
  result: EuropeanDrawerResult,
  options?: DxfExportOptions
): DxfExportReport {
  const write = options?.write !== false;
  const prepared = prepareEuropeanDXFFiles(result, options);
  const files: DxfExportedFileInfo[] = [];
  const errors = [...prepared.errors];
  const warnings = [...prepared.warnings];

  for (const f of prepared.files) {
    const relativePath = join(prepared.outputDir, f.fileName).replace(/\\/g, "/");
    let absolutePath: string | undefined;
    let written = false;
    const byteLength = utf8ByteLength(f.content);

    if (write && canUseNodeFs()) {
      try {
        const absDir = resolve(prepared.outputDir);
        mkdirSync(absDir, { recursive: true });
        absolutePath = resolve(absDir, f.fileName);
        writeFileSync(absolutePath, f.content, "utf8");
        written = true;
      } catch (err) {
        errors.push(
          `Falha ao escrever ${f.fileName}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } else if (write && !canUseNodeFs()) {
      warnings.push(`Ambiente sem Node FS — ${f.fileName} gerado só em memória.`);
    }

    files.push({
      fileName: f.fileName,
      pieceCode: f.pieceCode,
      relativePath,
      absolutePath,
      byteLength,
      entityCount: f.entityCount,
      written,
    });
  }

  return buildDxfExportReportFromPrepared(
    { ...prepared, warnings, errors },
    files
  );
}
