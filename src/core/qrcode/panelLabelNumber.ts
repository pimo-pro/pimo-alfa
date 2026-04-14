/**
 * Número de etiqueta / QR — prioridade: metadados do painel, depois pieceNumber já atribuído.
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

type ItemLike = {
  pieceNumber?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Devolve o número a usar no payload QR / coluna N.º QR, ou null se não houver fonte válida.
 */
export function resolveAuthoritativeLabelNumber(item: ItemLike): number | null {
  const fromMeta = readLabelNumberFromMetadata(item.metadata);
  if (fromMeta != null) return fromMeta;
  const pn = Number(item.pieceNumber ?? 0);
  if (Number.isFinite(pn) && pn > 0) return Math.floor(pn);
  return null;
}

export function formatNqrCell(shortCode: string | undefined, qrPayload: string): string {
  const sc = (shortCode ?? "").trim();
  if (sc && qrPayload && sc !== qrPayload) return `${sc}\n${qrPayload}`;
  return qrPayload || sc || "—";
}
