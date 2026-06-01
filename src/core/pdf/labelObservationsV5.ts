/**
 * Recolha de observações para etiqueta v5 (máx. 3 campos).
 * Futuro: tracking / workflow / tecnico.pdf — não implementado nesta fase.
 */

export const MAX_LABEL_OBSERVATIONS_V5 = 3;

const META_OBS_KEYS = ["observacao", "obs", "observacoes"] as const;

export type LabelObservationItemLike = {
  metadata?: Record<string, unknown>;
};

export type LabelObservationRulesLike = {
  etiqueta?: {
    observacoesPadrao?: string | string[];
  };
};

function pushUniqueTrimmed(result: string[], value: string): void {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (result.includes(trimmed)) return;
  result.push(trimmed);
}

function pushFromMetadataValue(result: string[], value: unknown): void {
  if (typeof value === "string") {
    pushUniqueTrimmed(result, value);
    return;
  }
  if (!Array.isArray(value)) return;
  for (const entry of value) {
    if (typeof entry === "string") pushUniqueTrimmed(result, entry);
  }
}

export function collectObservationsForItem(
  item: LabelObservationItemLike,
  rules?: LabelObservationRulesLike
): string[] {
  const result: string[] = [];

  const meta = item.metadata;
  if (meta) {
    for (const key of META_OBS_KEYS) {
      pushFromMetadataValue(result, meta[key]);
    }
  }

  const rulesObs = rules?.etiqueta?.observacoesPadrao;
  if (Array.isArray(rulesObs)) {
    for (const o of rulesObs) {
      if (typeof o === "string") pushUniqueTrimmed(result, o);
    }
  } else if (typeof rulesObs === "string") {
    pushUniqueTrimmed(result, rulesObs);
  }

  return result.slice(0, MAX_LABEL_OBSERVATIONS_V5);
}

export function observationsToV5Slots(observations: string[]): [string, string, string] {
  return [observations[0] ?? "", observations[1] ?? "", observations[2] ?? ""];
}
