import type { BoxModule, CutListItem, CutListItemComPreco } from "../types";
import { getMaterialByIdOrLabel } from "../materials/service";
import { getFallbackMaterial } from "../materials/materialLibraryV2";
import { calcularPrecoCutList } from "../pricing/pricing";
import type { RematePiece } from "./rematePieceTypes";

function toCutDimensions(remate: RematePiece): CutListItem["dimensoes"] {
  return {
    largura: Math.max(1, remate.width),
    altura: Math.max(1, remate.height),
    profundidade: Math.max(1, remate.depth),
  };
}

export function buildRemateCutlistItems(
  remates: readonly RematePiece[],
  boxes: readonly BoxModule[]
): CutListItemComPreco[] {
  void boxes;
  const items: CutListItem[] = remates.map((remate) => {
    const material = getMaterialByIdOrLabel(remate.materialPresetId);
    const materialLabel = material?.label ?? remate.materialPresetId;
    const boxId = remate.parentBoxId ?? "";
    return {
      id: remate.id,
      nome: remate.name,
      quantidade: 1,
      dimensoes: toCutDimensions(remate),
      espessura: Math.min(remate.width, remate.height, remate.depth),
      material: materialLabel,
      tipo: "remate",
      sourceType: "parametric",
      boxId,
      materialId: material?.id ?? remate.materialPresetId,
      visualMaterial: getFallbackMaterial(),
      grainDirection: remate.tipo === "DIR" || remate.tipo === "ESQ" ? "vertical" : "horizontal",
      drillHoles: [],
      metadata: {
        panelId: remate.id,
        remateId: remate.id,
        remateType: remate.tipo,
        rematePosition: remate.tipo,
      },
    };
  });

  return calcularPrecoCutList(items);
}
