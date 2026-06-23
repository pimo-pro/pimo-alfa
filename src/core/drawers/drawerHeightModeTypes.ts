/**
 * Modos de distribuição vertical de gavetas.
 */

export type DrawerHeightMode =
  | "equal"
  | "top_small_mid_medium_bottom_large"
  | "custom"
  | "ergonomic"
  | "kitchen_zones"
  | "auto";

export const ERGONOMIC_DRAWER_HEIGHT_MODES: readonly DrawerHeightMode[] = [
  "ergonomic",
  "kitchen_zones",
  "auto",
] as const;

export function isErgonomicDrawerHeightMode(
  mode: DrawerHeightMode | string | undefined
): mode is "ergonomic" | "kitchen_zones" | "auto" {
  return mode === "ergonomic" || mode === "kitchen_zones" || mode === "auto";
}
