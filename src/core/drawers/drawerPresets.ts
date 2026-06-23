import type { DrawerPreset } from "./drawerPresetTypes";

export function normalizeDrawerPresets(raw: DrawerPreset[] | undefined | null): DrawerPreset[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (p): p is DrawerPreset =>
        p != null &&
        typeof p === "object" &&
        typeof p.id === "string" &&
        typeof p.nome === "string" &&
        typeof p.drawerCount === "number" &&
        Array.isArray(p.drawers)
    )
    .map((p) => ({
      ...p,
      drawerCount: Math.max(0, Math.floor(p.drawerCount)),
      drawers: p.drawers.filter((d) => d != null && typeof d === "object"),
    }));
}

export function findDrawerPreset(
  presets: DrawerPreset[],
  id: string | null | undefined
): DrawerPreset | null {
  if (!id) return null;
  return presets.find((p) => p.id === id) ?? null;
}

export function slugDrawerPresetId(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}
