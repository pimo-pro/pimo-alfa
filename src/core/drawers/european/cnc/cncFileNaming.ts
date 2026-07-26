/**
 * cncFileNaming.ts — Nomes de ficheiros CNC alinhados aos códigos industriais.
 * Não altera códigos — apenas deriva nomes de ficheiro.
 */

export type EuropeanCncPieceKey =
  | "front"
  | "front_int"
  | "lat_dir"
  | "lat_esq"
  | "costa"
  | "fundo";

export type EuropeanCncFormat = "cnc" | "xml" | "mpr" | "cix" | "bpp";

/** Código industrial ? chave de peça / ficheiro. */
export const INDUSTRIAL_CODE_TO_CNC_PIECE_KEY: Record<string, EuropeanCncPieceKey> = {
  gav_fren: "front",
  gav_fre_int: "front_int",
  gav_lat_dir: "lat_dir",
  gav_lat_esq: "lat_esq",
  gav_costa: "costa",
  gav_fun: "fundo",
};

/** Nome base canúnico (sem extensão) por chave. */
export const CNC_FILE_BASE_NAMES: Record<EuropeanCncPieceKey, string> = {
  front: "gav_fren",
  front_int: "gav_fre_int",
  lat_dir: "gav_lat_dir",
  lat_esq: "gav_lat_esq",
  costa: "gav_costa",
  fundo: "gav_fundo",
};

export const CNC_FORMAT_EXTENSIONS: Record<EuropeanCncFormat, string> = {
  cnc: ".cnc",
  xml: ".xml",
  mpr: ".mpr",
  cix: ".cix",
  bpp: ".bpp",
};

export function resolveCncPieceKeyFromCodigo(codigo: string): EuropeanCncPieceKey | null {
  const c = codigo.trim().toLowerCase();
  if (INDUSTRIAL_CODE_TO_CNC_PIECE_KEY[c]) return INDUSTRIAL_CODE_TO_CNC_PIECE_KEY[c];
  if (/^gav_\d+_fren$/.test(c)) return "front";
  if (c.includes("fre_int") || c.includes("frent_int")) return "front_int";
  if (c.includes("lat_dir")) return "lat_dir";
  if (c.includes("lat_esq")) return "lat_esq";
  if (c.includes("costa")) return "costa";
  if (c.includes("fun") || c === "bottom" || c === "fundo") return "fundo";
  if (c.includes("fren") || c === "front") return "front";
  return null;
}

/**
 * Constrói nome de ficheiro CNC com prefixo e formato opcionais.
 * Ex.: prefix "CX01_" + format mpr ? CX01_gav_fren.mpr
 */
export function buildCncFileName(
  pieceCode: string,
  options?: { prefix?: string; format?: EuropeanCncFormat }
): string | null {
  const key = resolveCncPieceKeyFromCodigo(pieceCode);
  if (!key) return null;
  const format = options?.format ?? "cnc";
  const base = `${CNC_FILE_BASE_NAMES[key]}${CNC_FORMAT_EXTENSIONS[format]}`;
  const prefix = (options?.prefix ?? "").trim();
  if (!prefix) return base;
  const clean = prefix.replace(/[^\w.-]+/g, "_").replace(/_+$/g, "");
  return `${clean}${clean.endsWith("_") ? "" : "_"}${base}`;
}

export const DEFAULT_CNC_EXPORT_DIR = "exports/cnc/european";
