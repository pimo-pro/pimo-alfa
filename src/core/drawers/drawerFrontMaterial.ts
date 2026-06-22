import type { DrawerLayerItem } from "../../models/BoxLayers";

/** Material canónico da frente (independente do corpo da gaveta / caixa). */
export function resolveDrawerFrontMaterialId(
  drawer: Pick<DrawerLayerItem, "material" | "materialId" | "metadata"> | undefined,
  fallbackId: string
): string {
  const candidate =
    drawer?.material?.trim() ||
    drawer?.materialId?.trim() ||
    drawer?.metadata?.frontMaterial?.trim() ||
    fallbackId;
  return candidate.length > 0 ? candidate : fallbackId;
}
