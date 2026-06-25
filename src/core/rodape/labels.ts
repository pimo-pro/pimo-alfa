import type { ProjectRodape } from "./rodapeTypes";

/** Sanitiza nome de caixa para etiqueta industrial. */
export function sanitizeRodapeBoxName(boxName: string): string {
  return (
    String(boxName || "BOX")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .slice(0, 32) || "BOX"
  );
}

/** Nome industrial: BOXNAME_RODA_PE_01 */
export function buildRodapeIndustrialLabel(boxName: string, index1Based: number): string {
  const safeName = sanitizeRodapeBoxName(boxName);
  const num = String(Math.max(1, index1Based)).padStart(2, "0");
  return `${safeName}_RODA_PE_${num}`;
}

export function buildRodapeIndustrialLabelsForRodapes(
  rodapes: readonly ProjectRodape[],
  boxNameById: ReadonlyMap<string, string> | Record<string, string>
): Map<string, string> {
  const getBoxName = (boxId: string): string => {
    if (boxNameById instanceof Map) return boxNameById.get(boxId) ?? boxId;
    return boxNameById[boxId] ?? boxId;
  };

  const counters = new Map<string, number>();
  const labels = new Map<string, string>();

  for (const rodape of rodapes) {
    if (rodape.visible === false) continue;
    const boxId = rodape.parentBoxId ?? "";
    const counterKey = boxId || rodape.id;
    const index = (counters.get(counterKey) ?? 0) + 1;
    counters.set(counterKey, index);
    const boxName = boxId ? getBoxName(boxId) : rodape.name.split("_")[0] ?? "BOX";
    labels.set(rodape.id, buildRodapeIndustrialLabel(boxName, index));
  }

  return labels;
}

/** Nome exibido na UI/cutlist: personalizado ou rótulo industrial automático. */
export function resolveRodapePieceDisplayName(
  rodape: ProjectRodape,
  autoIndustrialLabel: string
): string {
  const custom = rodape.nomePersonalizado?.trim();
  if (custom) return custom;
  return autoIndustrialLabel;
}

export function resolveRodapePieceNomeForRodape(
  rodape: ProjectRodape,
  boxNameById: ReadonlyMap<string, string> | Record<string, string>
): string {
  const autoLabel =
    buildRodapeIndustrialLabelsForRodapes([rodape], boxNameById).get(rodape.id) ?? rodape.name;
  return resolveRodapePieceDisplayName(rodape, autoLabel);
}
