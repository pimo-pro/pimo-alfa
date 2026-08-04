/**
 * Leitura de texto forcada a UTF-8 — sem fallback Latin-1 / Windows-1252.
 * Usar em ADMIN, Viewer e imports de ficheiros.
 * Ver: src/core/rules/linguagem-portuguesa.md
 */

import { encodingAlertMessage, hasInvalidPortugueseEncoding } from "./portugueseEncodingGuard";

export type Utf8ReadResult = {
  text: string;
  encodingOk: boolean;
  alert: string | null;
};

/** FileReader sempre com label UTF-8 (nunca encoding omitido / default ambiguo). */
export function readTextFileAsUtf8(file: Blob): Promise<Utf8ReadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      resolve({
        text,
        encodingOk: !hasInvalidPortugueseEncoding(text),
        alert: encodingAlertMessage(text, file instanceof File ? file.name : "ficheiro"),
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler ficheiro como UTF-8."));
    // Label explicito — impede fallback nao-UTF-8 no browser.
    reader.readAsText(file, "UTF-8");
  });
}

/** Decodifica ArrayBuffer exclusivamente como UTF-8 (fatal se bytes invalidos). */
export function decodeUtf8Bytes(buffer: ArrayBuffer): Utf8ReadResult {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text: string;
  try {
    text = decoder.decode(buffer);
  } catch {
    return {
      text: "",
      encodingOk: false,
      alert:
        "Ficheiro nao e UTF-8 valido. Encoding nao-UTF-8 bloqueado (ADMIN/Viewer). Ver regras de linguagem.",
    };
  }
  return {
    text,
    encodingOk: !hasInvalidPortugueseEncoding(text),
    alert: encodingAlertMessage(text),
  };
}

/** fetch + texto UTF-8; rejeita resposta com encoding partido no corpo. */
export async function fetchTextUtf8(url: string, init?: RequestInit): Promise<Utf8ReadResult> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao obter ${url}`);
  }
  const buf = await res.arrayBuffer();
  return decodeUtf8Bytes(buf);
}
