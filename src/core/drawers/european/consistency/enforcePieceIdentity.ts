/**
 * enforcePieceIdentity.ts — Identidade associada — geometria (pass-through estrutural).
 * A geometria não carrega nomes; este passo documenta/garante que o pipeline
 * aplica identidade nas saídas (cutlist/pdf/viewer/holes).
 */

import type { DrawerGeometry } from "../types";

export type GeometryIdentityTags = {
  frontCodigo: string;
  frontIntCodigo?: string;
  latEsqCodigo: string;
  latDirCodigo: string;
  costaCodigo: string;
  fundoCodigo: string;
  bodyCodigo: string;
};

/**
 * Geometria pura não tem campos de nome — devolve a mesma referência.
 * Tags canúnicas disponíveis via `geometryIdentityTags` para consumidores.
 */
export function enforcePieceIdentity(geometry: DrawerGeometry): DrawerGeometry {
  return geometry;
}

export function geometryIdentityTags(
  drawerIndex0: number,
  drawerCount: number
): GeometryIdentityTags {
  const body = drawerIndex0 <= 0 ? "gav" : `gav_${drawerIndex0}`;
  const front = drawerCount <= 1 ? "gav_fren" : `gav_${drawerIndex0 + 1}_fren`;
  return {
    bodyCodigo: body,
    frontCodigo: front,
    frontIntCodigo: "gav_fre_int",
    latEsqCodigo: "gav_lat_esq",
    latDirCodigo: "gav_lat_dir",
    costaCodigo: "gav_costa",
    fundoCodigo: "gav_fun",
  };
}
