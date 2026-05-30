import type { BoxModule, CutListItem, CutListItemComPreco } from "../types";
import { getMaterialByIdOrLabel } from "../materials/service";
import { getFallbackMaterial } from "../materials/materialLibraryV2";
import { calcularPrecoCutList } from "../pricing/pricing";
import type { ProjectRemate } from "./remateTypes";

function toCutDimensions(remate: ProjectRemate): CutListItem["dimensoes"] {
  return {
    largura: Math.max(1, remate.dimensions.widthMm),
    altura: Math.max(1, remate.dimensions.heightMm),
    profundidade: Math.max(1, remate.dimensions.depthMm),
  };
}

export function buildRemateCutlistItems(
  remates: readonly ProjectRemate[],
  boxes: readonly BoxModule[]
): CutListItemComPreco[] {
  const boxIds = new Set(boxes.map((box) => box.id));
  const items: CutListItem[] = remates
    .filter((remate) => boxIds.has(remate.parentBoxId))
    .map((remate) => {
      const material = getMaterialByIdOrLabel(remate.materialId);
      const materialLabel = material?.label ?? remate.materialId;
      return {
        id: remate.id,
        nome: remate.name,
        quantidade: 1,
        dimensoes: toCutDimensions(remate),
        espessura: remate.thicknessMm,
        material: materialLabel,
        tipo: "remate",
        sourceType: "parametric",
        boxId: remate.parentBoxId,
        materialId: material?.id ?? remate.materialId,
        visualMaterial: getFallbackMaterial(),
        grainDirection: remate.position === "dir" || remate.position === "esq" ? "vertical" : "horizontal",
        drillHoles: [],
        metadata: {
          panelId: remate.id,
          remateId: remate.id,
          remateType: remate.type,
          rematePosition: remate.position,
        },
      };
    });

  return calcularPrecoCutList(items);
}
