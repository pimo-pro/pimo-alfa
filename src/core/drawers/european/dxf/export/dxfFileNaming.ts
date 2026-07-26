/**
 * dxfFileNaming.ts — Nomes de ficheiros DXF alinhados aos códigos industriais.
 * Não altera códigos — apenas deriva nomes de ficheiro.
 */

export type EuropeanDxfPieceKey =
  | "front"
  | "front_int"
  | "lat_dir"
  | "lat_esq"
  | "costa"
  | "fundo";

/** Código industrial ? chave de peça / ficheiro. */
export const INDUSTRIAL_CODE_TO_PIECE_KEY: Record<string, EuropeanDxfPieceKey> = {
  gav_fren: "front",
  gav_fre_int: "front_int",
  gav_lat_dir: "lat_dir",
  gav_lat_esq: "lat_esq",
  gav_costa: "costa",
  gav_fun: "fundo",
};

/** Nome de ficheiro canónico por chave. */
export const DXF_FILE_NAMES: Record<EuropeanDxfPieceKey, string> = {
  front: "GAVETA_FRONT.dxf",
  front_int: "GAVETA_FRONT_INT.dxf",
  lat_dir: "GAVETA_LAT_DIR.dxf",
  lat_esq: "GAVETA_LAT_ESQ.dxf",
  costa: "GAVETA_COSTA.dxf",
  fundo: "GAVETA_FUNDO.dxf",
};

export function resolvePieceKeyFromCodigo(codigo: string): EuropeanDxfPieceKey | null {
  const c = codigo.trim().toLowerCase();
  if (INDUSTRIAL_CODE_TO_PIECE_KEY[c]) return INDUSTRIAL_CODE_TO_PIECE_KEY[c];
  if (/^gav_\d+_fren$/.test(c)) return "front";
  if (c.includes("fre_int") || c.includes("frent_int")) return "front_int";
  if (c.includes("lat_dir")) return "lat_dir";
  if (c.includes("lat_esq")) return "lat_esq";
  if (c.includes("costa")) return "costa";
  if (c.includes("fun") || c === "bottom") return "fundo";
  if (c.includes("fren") || c === "front") return "front";
  return null;
}

/**
 * Constrói nome de ficheiro com prefixo opcional.
 * Ex.: prefix "CX01_" ? CX01_GAVETA_FRONT.dxf
 */
export function buildDxfFileName(
  pieceCode: string,
  options?: { prefix?: string }
): string | null {
  const key = resolvePieceKeyFromCodigo(pieceCode);
  if (!key) return null;
  const base = DXF_FILE_NAMES[key];
  const prefix = (options?.prefix ?? "").trim();
  if (!prefix) return base;
  const clean = prefix.replace(/[^\w.-]+/g, "_").replace(/_+$/g, "");
  return `${clean}${clean.endsWith("_") ? "" : "_"}${base}`;
}

export const DEFAULT_DXF_EXPORT_DIR = "exports/dxf/european";
