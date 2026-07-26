/**
 * namingMap.ts — SSOT imutável de nomes/códigos industriais (Modelo B).
 * Nunca gerar nomes/códigos fora deste mapa.
 */

/** Códigos industriais canúnicos de peças de madeira da gaveta. */
export const EUROPEAN_INDUSTRIAL_CODES = [
  "gav",
  "gav_fren",
  "gav_fre_int",
  "gav_lat_dir",
  "gav_lat_esq",
  "gav_costa",
  "gav_fun",
] as const;

export type EuropeanIndustrialBaseCode = (typeof EUROPEAN_INDUSTRIAL_CODES)[number];

/** Nomes industriais canúnicos (display). */
export const EUROPEAN_INDUSTRIAL_NAMES = {
  gav: "gaveta",
  gav_fren: "gaveta frente",
  gav_fre_int: "gaveta frente int",
  gav_lat_dir: "gaveta lateral direita",
  gav_lat_esq: "gaveta lateral esquerda",
  gav_costa: "gaveta costa",
  gav_fun: "gaveta fundo",
} as const satisfies Record<EuropeanIndustrialBaseCode, string>;

/**
 * Alias ? código base canúnico.
 * Inclui tipos internos cutlist, pieceRefs antigos e variações proibidas.
 */
export const EUROPEAN_CODE_ALIASES: Readonly<Record<string, EuropeanIndustrialBaseCode | "module" | "hardware">> =
  Object.freeze({
    // corpo
    gav: "gav",
    gaveta: "gav",
    gaveta_corpo: "gav",
    corpo: "gav",
    body: "gav",
    // frente ext
    gav_fren: "gav_fren",
    gav_frent: "gav_fren",
    gav_frente: "gav_fren",
    gaveta_frente: "gav_fren",
    gaveta_frente_ext: "gav_fren",
    front: "gav_fren",
    frente: "gav_fren",
    // frente int
    gav_fre_int: "gav_fre_int",
    gav_frent_int: "gav_fre_int",
    gaveta_frente_int: "gav_fre_int",
    front_int: "gav_fre_int",
    // laterais
    gav_lat_dir: "gav_lat_dir",
    gaveta_lat_dir: "gav_lat_dir",
    lat_dir: "gav_lat_dir",
    right_side: "gav_lat_dir",
    gav_lat_esq: "gav_lat_esq",
    gaveta_lat_esq: "gav_lat_esq",
    lat_esq: "gav_lat_esq",
    left_side: "gav_lat_esq",
    // costa
    gav_costa: "gav_costa",
    gav_cost: "gav_costa",
    gaveta_costa: "gav_costa",
    gaveta_traseira: "gav_costa",
    back: "gav_costa",
    costa: "gav_costa",
    // fundo
    gav_fun: "gav_fun",
    gaveta_fundo: "gav_fun",
    bottom: "gav_fun",
    fundo: "gav_fun",
    // módulo (não — peça de gaveta — preservar)
    module_lat_esq: "module",
    module_lat_dir: "module",
    // hardware
    corredica: "hardware",
    corredica_hettich: "hardware",
    soft_close: "hardware",
    push_open: "hardware",
    caixa_metalica: "hardware",
  });

export function isIndexedBodyCode(code: string): boolean {
  return /^gav_\d+$/.test(code);
}

export function isIndexedFrontCode(code: string): boolean {
  return /^gav_\d+_fren$/.test(code);
}

export function isCanonicalEuropeanCode(code: string): boolean {
  if ((EUROPEAN_INDUSTRIAL_CODES as readonly string[]).includes(code)) return true;
  return isIndexedBodyCode(code) || isIndexedFrontCode(code);
}

/** Resolve código base a partir de alias / código indexado. */
export function resolveBaseCode(raw: string | undefined | null): EuropeanIndustrialBaseCode | null {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  if (isIndexedBodyCode(key)) return "gav";
  if (isIndexedFrontCode(key)) return "gav_fren";
  const mapped = EUROPEAN_CODE_ALIASES[key];
  if (mapped === "module" || mapped === "hardware") return null;
  if (mapped) return mapped;
  if ((EUROPEAN_INDUSTRIAL_CODES as readonly string[]).includes(key)) {
    return key as EuropeanIndustrialBaseCode;
  }
  return null;
}

export function displayNameForBaseCode(base: EuropeanIndustrialBaseCode, drawerIndex0 = 0): string {
  if (base === "gav") {
    return drawerIndex0 <= 0 ? "gaveta" : `gaveta ${drawerIndex0}`;
  }
  return EUROPEAN_INDUSTRIAL_NAMES[base];
}

/**
 * Código industrial indexado conforme regras Modelo B.
 * body: gav / gav_1…
 * front: gav_fren (1 gaveta) ou gav_1_fren… (N)
 */
export function resolveIndexedCode(
  base: EuropeanIndustrialBaseCode,
  drawerIndex0: number,
  drawerCount: number
): string {
  if (base === "gav") {
    return drawerIndex0 <= 0 ? "gav" : `gav_${drawerIndex0}`;
  }
  if (base === "gav_fren") {
    if (drawerCount <= 1) return "gav_fren";
    return `gav_${drawerIndex0 + 1}_fren`;
  }
  return base;
}
