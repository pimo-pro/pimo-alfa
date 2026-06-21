import type { BoxModule, CutListItem, CutListItemComPreco } from "../types";
import { getMaterialByIdOrLabel } from "../materials/service";
import { getFallbackMaterial } from "../materials/materialLibraryV2";
import { calcularPrecoCutList } from "../pricing/pricing";
import { resolveIndustrialGrainCode } from "../materials/grainDirection";
import type { RematePiece } from "./rematePieceTypes";
import { inferProductTypeFromLegacy } from "./remateProductRules";
import { resolveRemateSheetCutDimensions } from "./remateSheetDimensions";

function toCutDimensions(remate: RematePiece): CutListItem["dimensoes"] {
  const sheet = resolveRemateSheetCutDimensions(remate);
  return {
    largura: sheet.comprimentoMm,
    altura: sheet.larguraMm,
    profundidade: sheet.espessuraMm,
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
      espessura: resolveRemateSheetCutDimensions(remate).espessuraMm,
      material: materialLabel,
      tipo: "remate",
      sourceType: "parametric",
      boxId,
      materialId: material?.id ?? remate.materialPresetId,
      visualMaterial: getFallbackMaterial(),
      grainDirection: resolveIndustrialGrainCode({
        tipo: "remate",
        remateProductType: remate.productType ?? inferProductTypeFromLegacy(remate),
        remateTipo: remate.tipo,
      }),
      drillHoles: [],
      metadata: {
        panelId: remate.id,
        remateId: remate.id,
        productType: remate.productType ?? inferProductTypeFromLegacy(remate),
        mountSlot: remate.mountSlot,
        partRole: remate.partRole,
        partIndex: remate.partIndex,
        parentGroupId: remate.parentGroupId,
        remateType: remate.tipo,
        rematePosition: remate.tipo,
        remateIndustrialLabel:
          remate.productType === "L" || remate.tipo === "L"
            ? remate.partIndex === 2
              ? "REMATE_L_B"
              : "REMATE_L_A"
            : undefined,
      },
    };
  });

  return calcularPrecoCutList(items);
}
