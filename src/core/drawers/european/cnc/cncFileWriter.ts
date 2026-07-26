/**
 * cncFileWriter.ts — Escrita de ficheiros CNC físicos (Node FS).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { EuropeanDrawerResult } from "../types";
import {
  buildCncExportReportFromPrepared,
  prepareEuropeanCNCFiles,
  utf8ByteLength,
  type CncExportOptions,
} from "./cncBuilder";
import type { CncExportedFileInfo, CncExportReport } from "./cncReport";

export type { CncExportOptions } from "./cncBuilder";
export {
  buildEuropeanCncPrograms,
  buildEuropeanCNCFileContents,
  prepareEuropeanCNCFiles,
} from "./cncBuilder";

function canUseNodeFs(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node);
}

/**
 * Exporta ficheiros CNC físicos a partir de geometry + holes + dxf.
 * Não altera o result.
 */
export function exportEuropeanCNCFiles(
  result: EuropeanDrawerResult,
  options?: CncExportOptions
): CncExportReport {
  const write = options?.write !== false;
  const prepared = prepareEuropeanCNCFiles(result, options);
  const files: CncExportedFileInfo[] = [];
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
      format: f.format,
      relativePath,
      absolutePath,
      byteLength,
      cutCount: f.cutCount,
      drillCount: f.drillCount,
      pocketCount: f.pocketCount,
      written,
    });
  }

  return buildCncExportReportFromPrepared(
    { ...prepared, warnings, errors },
    files
  );
}
