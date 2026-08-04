/**
 * Viewer: bloqueia fallback nao-UTF-8 e sinaliza texto com acentuacao partida.
 * Ver: src/core/rules/linguagem-portuguesa.md
 */
import {
  encodingAlertMessage,
  hasInvalidPortugueseEncoding,
  type EncodingScanResult,
  scanPortugueseEncoding,
} from "@/core/encoding/portugueseEncodingGuard";
import { decodeUtf8Bytes, readTextFileAsUtf8, type Utf8ReadResult } from "@/core/encoding/readTextUtf8";

export {
  decodeUtf8Bytes,
  encodingAlertMessage,
  hasInvalidPortugueseEncoding,
  readTextFileAsUtf8,
  scanPortugueseEncoding,
};
export type { EncodingScanResult, Utf8ReadResult };

/**
 * Valida texto ja decodificado (ex.: JSON de projecto no Viewer).
 * Lanca se encoding for invalido — impede uso de Latin-1/CP1252.
 */
export function assertViewerUtf8Text(text: string, sourceLabel = "Viewer"): void {
  const alert = encodingAlertMessage(text, sourceLabel);
  if (alert) {
    throw new Error(alert);
  }
}
