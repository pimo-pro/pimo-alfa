/**
 * Utilitários de sanitização de nomes e paths para export e ficheiros ZIP.
 */

/**
 * Para nomes de ficheiro de export genérico.
 * Permite letras Unicode, números, espaços, _ e -.
 * Usar em: exports PDF, exports gerais.
 */
export function sanitizeExportFilename(name: string): string {
  return name.replace(/[^\p{L}\p{N}\s_-]/gu, "").trim() || "export";
}

/**
 * Para tokens industriais CNC (nomes de ficheiro .cnc, .drill).
 * Só ASCII alfanumérico + _/-. Remove diacríticos via NFD.
 * Usar em: exports CNC, drill, ZIP entries com nome de máquina.
 */
export function sanitizeIndustrialToken(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "item";
}

/**
 * Para paths dentro de ficheiros ZIP.
 * Trata segmentos separados por /, remove chars proibidos no Windows FS.
 * Usar em: qualquer path dentro de ZIP.
 */
export function sanitizeZipPath(path: string): string {
  if (typeof path !== "string" || path.trim() === "") return "ficheiro";
  const sanitizeSegment = (segment: string): string =>
    Array.from(segment)
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code < 32 || "<>:\"|?*".includes(char)) return "_";
        return char;
      })
      .join("");

  return path
    .replace(/\\/g, "/")
    .split("/")
    .map((seg) =>
      sanitizeSegment(seg)
        .replace(/\s+/g, "_")
        .replace(/^\.+/, "")
        .trim()
    )
    .filter((s) => s.length > 0)
    .join("/") || "ficheiro";
}
