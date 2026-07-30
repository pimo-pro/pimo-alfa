import type { DrawerLayerItem } from "../../models/BoxLayers";

/** Material canónico da frente (independente do corpo da gaveta / caixa).
 * Sem fallback silencioso: se não houver matéria explícita, devolve `fallbackId` (passar `""`).
 */
export function resolveDrawerFrontMaterialId(
  drawer: Pick<DrawerLayerItem, "material" | "materialId" | "metadata"> | undefined,
  fallbackId: string
): string {
  const candidate =
    drawer?.materialId?.trim() ||
    drawer?.metadata?.frontMaterial?.trim() ||
    drawer?.material?.trim() ||
    "";
  if (candidate.length > 0) return candidate;
  return typeof fallbackId === "string" ? fallbackId : "";
}
