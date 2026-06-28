import { parseBarcode } from '@/industrial/core/barcode/actions';

/** Normaliza códigos lidos por QR, etiqueta, USB ou input manual. */
export function normalizeIndustrialCode(raw: string): string {
  let code = raw.trim();
  if (!code) return '';

  // Leitores USB frequentemente enviam prefixo/sufixo de controle.
  code = code.replace(/[\x00-\x1F\x7F]/g, '').trim();

  // Remover aspas ou brackets acidentais.
  if (
    (code.startsWith('"') && code.endsWith('"')) ||
    (code.startsWith("'") && code.endsWith("'"))
  ) {
    code = code.slice(1, -1).trim();
  }

  const barcode = parseBarcode(code);
  if (barcode) return barcode.raw;

  return code;
}

export function splitIndustrialCodeList(raw: string): string[] {
  return raw
    .split(/[\n\r,;|\t]+/)
    .map((part) => normalizeIndustrialCode(part))
    .filter(Boolean);
}
