import {
  buildBoxPrefixForCutLayoutPro,
  buildCutLayoutProPartName,
} from "../cutlayout/cutLayoutProPieceNaming";

/** Token para display — espaços→`_`, remove chars inválidos, colapsa `_`. */
export function sanitizeIndustrialSegment(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Nome industrial completo: `{projeto}_{caixa}_{peca}` ou `{projeto}_{label}`.
 * Usado na faixa inferior v5 e no prefixo do displayCode v5.
 */
export function buildV5BottomStripIndustrialName(
  projectName: string,
  boxName: string,
  nomeIndustrial: string
): string {
  const projeto = sanitizeIndustrialSegment(projectName) || "PROJETO";
  const industrial = sanitizeIndustrialSegment(nomeIndustrial) || "peca";

  const projectPrefix = `${projeto.toUpperCase()}_`;
  if (industrial.toUpperCase().startsWith(projectPrefix)) {
    return industrial;
  }

  const caixa = sanitizeIndustrialSegment(boxName);
  const boxPrefix = sanitizeIndustrialSegment(
    buildBoxPrefixForCutLayoutPro(boxName, projectName)
  );

  let peca = industrial;
  const hadBoxPrefixStrip =
    boxPrefix.length > 0 &&
    peca.toUpperCase().startsWith(`${boxPrefix.toUpperCase()}_`);
  if (hadBoxPrefixStrip) {
    peca = peca.slice(boxPrefix.length + 1);
  }

  if (hadBoxPrefixStrip && caixa && peca) {
    return `${projeto}_${caixa}_${peca}`;
  }

  if (industrial.includes("_") && !hadBoxPrefixStrip) {
    return `${projeto}_${industrial}`;
  }

  if (caixa && peca) {
    return `${projeto}_${caixa}_${peca}`;
  }
  return `${projeto}_${peca || caixa || "peca"}`;
}

type NomeIndustrialItemLike = {
  nome?: string;
  tipo?: string;
  metadata?: Record<string, unknown>;
};

/** Nome industrial da peça — metadata.industrialLabel ou Layout de Corte PRO. */
export function resolveNomeIndustrialForEtiqueta(
  item: NomeIndustrialItemLike,
  projectName: string,
  boxNome?: string
): string {
  const fromMeta = item.metadata?.industrialLabel;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }
  return buildCutLayoutProPartName(item, boxNome, projectName);
}
