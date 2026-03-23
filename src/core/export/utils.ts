/**
 * FASE 3 — Export Engine
 * Funções auxiliares (skeleton).
 */

import type { ExportFormat } from "./types";

export { sanitizeExportFilename } from "../../utils/sanitization";

/**
 * MIME type associado ao formato.
 * @placeholder Sem lógica real.
 */
export function getMimeTypeForFormat(_format: ExportFormat): string {
  return "application/octet-stream";
}

/**
 * Verifica se o ambiente suporta geração do formato.
 * @placeholder Sem lógica real.
 */
export function canExportFormat(_format: ExportFormat): boolean {
  return false;
}
