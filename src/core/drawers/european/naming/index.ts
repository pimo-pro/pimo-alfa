/**
 * naming/ — Nomes e códigos industriais do Modelo B.
 * Independente dos tokens do Modelo A (gav_frent / gav_cost).
 */

export type EuropeanIndustrialPieceKind =
  | "body"
  | "front"
  | "front_int"
  | "lat_dir"
  | "lat_esq"
  | "costa"
  | "fundo";

export type EuropeanIndustrialName = {
  nome: string;
  codigo: string;
};

/**
 * Corpo da gaveta:
 * 1— ? gaveta / gav
 * 2— ? gaveta 1 / gav_1
 * 3— ? gaveta 2 / gav_2
 */
export function europeanBodyIndustrialName(drawerIndex0: number): EuropeanIndustrialName {
  if (drawerIndex0 <= 0) return { nome: "gaveta", codigo: "gav" };
  return { nome: `gaveta ${drawerIndex0}`, codigo: `gav_${drawerIndex0}` };
}

/**
 * Frente externa:
 * 1 gaveta ? gaveta frente / gav_fren
 * N gavetas ? gaveta frente / gav_1_fren, gav_2_fren, —
 */
export function europeanFrontIndustrialName(
  drawerIndex0: number,
  drawerCount: number
): EuropeanIndustrialName {
  const nome = "gaveta frente";
  if (drawerCount <= 1) return { nome, codigo: "gav_fren" };
  return { nome, codigo: `gav_${drawerIndex0 + 1}_fren` };
}

export function europeanFrontIntIndustrialName(): EuropeanIndustrialName {
  return { nome: "gaveta frente int", codigo: "gav_fre_int" };
}

export function europeanLatDirIndustrialName(): EuropeanIndustrialName {
  return { nome: "gaveta lateral direita", codigo: "gav_lat_dir" };
}

export function europeanLatEsqIndustrialName(): EuropeanIndustrialName {
  return { nome: "gaveta lateral esquerda", codigo: "gav_lat_esq" };
}

export function europeanCostaIndustrialName(): EuropeanIndustrialName {
  return { nome: "gaveta costa", codigo: "gav_costa" };
}

export function europeanFundoIndustrialName(): EuropeanIndustrialName {
  return { nome: "gaveta fundo", codigo: "gav_fun" };
}

/** Label cutlist com prefixo da caixa: BOXNAME_codigo ou BOXNAME codigo. */
export function formatEuropeanIndustrialLabel(
  boxName: string | undefined,
  codigo: string,
  drawerIndex1Based: number
): string {
  const safe =
    String(boxName || "BOX")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .slice(0, 32) || "BOX";
  const num = String(Math.max(1, drawerIndex1Based)).padStart(2, "0");
  return `${safe}_${codigo}_${num}`;
}

export function resolveEuropeanPieceNaming(
  kind: EuropeanIndustrialPieceKind,
  drawerIndex0: number,
  drawerCount: number
): EuropeanIndustrialName {
  switch (kind) {
    case "body":
      return europeanBodyIndustrialName(drawerIndex0);
    case "front":
      return europeanFrontIndustrialName(drawerIndex0, drawerCount);
    case "front_int":
      return europeanFrontIntIndustrialName();
    case "lat_dir":
      return europeanLatDirIndustrialName();
    case "lat_esq":
      return europeanLatEsqIndustrialName();
    case "costa":
      return europeanCostaIndustrialName();
    case "fundo":
      return europeanFundoIndustrialName();
  }
}
