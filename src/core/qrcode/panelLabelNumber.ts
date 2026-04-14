/**
 * Número de etiqueta / QR — prioridade: metadados (inteiro), pieceNumber, sufixo numérico do shortCode.
 * Não gera números sequenciais artificiais (isso fica para o chamador, ex.: attachQrCodesToCutlist).
 */

const META_KEYS_PRIORITY = ["labelNumber", "LabelNumber", "qrNumber", "QRNumber"] as const;

function readPositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim().replace(/\s+/g, ""));
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}

/** True se existir pelo menos uma chave canónica de etiqueta com valor numérico válido. */
export function hasExplicitMetadataLabelNumber(metadata?: Record<string, unknown>): boolean {
  if (!metadata) return false;
  for (const k of META_KEYS_PRIORITY) {
    if (readPositiveInt(metadata[k]) != null) return true;
  }
  return false;
}

export function readLabelNumberFromMetadata(metadata?: Record<string, unknown>): number | null {
  if (!metadata) return null;
  for (const k of META_KEYS_PRIORITY) {
    const n = readPositiveInt(metadata[k]);
    if (n != null) return n;
  }
  return null;
}

/** Extrai o sufixo numérico final do código curto (ex.: "np261cacim01" → 1). */
export function extractPieceNumberFromShortCode(shortCode: string): number | null {
  const s = String(shortCode ?? "").trim();
  if (!s || s === "ERR") return null;
  const m = s.match(/(\d{2,3})$/);
  if (!m?.[1]) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

type ItemLike = {
  pieceNumber?: number;
  metadata?: Record<string, unknown>;
  shortCode?: string;
};

/**
 * Devolve o número a usar no payload QR / coluna N.º QR, ou null se não houver fonte válida.
 */
export function resolveAuthoritativeLabelNumber(item: ItemLike): number | null {
  const fromMeta = readLabelNumberFromMetadata(item.metadata);
  if (fromMeta != null) return fromMeta;
  const pn = Number(item.pieceNumber ?? 0);
  if (Number.isFinite(pn) && pn > 0) return Math.floor(pn);
  const fromShortCode = extractPieceNumberFromShortCode(String(item.shortCode ?? ""));
  if (fromShortCode != null) return fromShortCode;
  return null;
}

export function formatNqrCell(shortCode: string | undefined, qrPayload: string): string {
  const sc = (shortCode ?? "").trim();
  if (sc && qrPayload && sc !== qrPayload) return `${sc}\n${qrPayload}`;
  return qrPayload || sc || "—";
}
