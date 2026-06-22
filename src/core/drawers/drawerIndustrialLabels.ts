import type { DrawerPieceTipo } from "../../services/drawerCutlistAdapter";

/** Tokens industriais canónicos por tipo de peça de gaveta. */
export const DRAWER_PIECE_INDUSTRIAL_TOKEN: Record<DrawerPieceTipo, string> = {
  gaveta_lat_esq: "gav_lat_esq",
  gaveta_lat_dir: "gav_lat_dir",
  gaveta_traseira: "gav_cost",
  gaveta_fundo: "gav_fun",
  gaveta_frente: "gav_frent",
};

/**
 * Nome industrial: {BOXNAME}_gav_lat_esq_01, {BOXNAME}_gav_frent_02, …
 * (padrão alinhado a BOXNAME_DIV_01 / BOXNAME_SEP_01).
 */
export function buildDrawerIndustrialLabel(
  boxName: string,
  pieceTipo: DrawerPieceTipo,
  drawerIndex1Based: number
): string {
  const safeName =
    String(boxName || "BOX")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .slice(0, 32) || "BOX";
  const token = DRAWER_PIECE_INDUSTRIAL_TOKEN[pieceTipo];
  const num = String(Math.max(1, drawerIndex1Based)).padStart(2, "0");
  return `${safeName}_${token}_${num}`;
}
